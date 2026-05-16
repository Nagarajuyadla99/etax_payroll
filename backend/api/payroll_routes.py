# payroll_management/api/payroll_routes.py

import os

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from database import get_async_db

from schemas.payroll_schemas import (
    PayrollRunCreate,
    PayrollRunOut,
    PayPeriodCreate,
    PayPeriodOut,
    PayrollBatchProcessRequest,
)

from crud.payroll_crud import (
    create_payroll,
    get_payroll_by_id,
    process_payroll_run,
    create_pay_period,
    get_pay_period,
    get_payroll_summary,
    compute_payroll_process_input_hash,
    verify_payroll_run_replay,
    build_payroll_execution_trace,
    mark_payroll_run_queued,
    reset_payroll_run_for_reprocess,
)
from services.payroll_report_service import generate_salary_statement,generate_tds_summary,generate_payroll_register
from services.payroll_attendance_summary_service import build_pay_period_attendance_summary
from services.payroll_attendance_validation import PayrollAttendanceValidationError
from services.payroll_process_policy import PayrollProcessBlockedError
from utils.rbac import require_roles
from utils.idempotency import idempotency_replay_or_none, idempotency_store
from utils.tenant_guard import require_same_org
from services.payroll_lifecycle_service import (
    approve_payroll_lifecycle,
    deny_if_locked_with_audit,
    list_lifecycle_audit_for_run,
    lock_payroll_lifecycle,
    verify_payroll_lifecycle,
)


router = APIRouter(
    prefix="/payrolls",
    tags=["Payroll"],
)


def _org_id(current_user):
    raw = getattr(current_user, "organisation_id", None) or getattr(current_user, "org_id", None)
    if raw is None:
        return None
    return raw if isinstance(raw, UUID) else UUID(str(raw))


def _require_org_id(current_user) -> UUID:
    org_id = _org_id(current_user)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation context missing")
    return org_id


def _user_id(current_user):
    return getattr(current_user, "user_id", None) or getattr(current_user, "id", None)


def _http_payroll_error(exc: Exception) -> HTTPException:
    """Map payroll policy / validation failures to structured 400 responses."""
    if isinstance(exc, (PayrollAttendanceValidationError, PayrollProcessBlockedError)):
        return HTTPException(status_code=400, detail=exc.detail)
    if isinstance(exc, ValueError):
        return HTTPException(
            status_code=400,
            detail={"code": "PAYROLL_VALIDATION_ERROR", "message": str(exc)},
        )
    return HTTPException(status_code=400, detail=str(exc))


# ============================================================
# CREATE PAY PERIOD
# ============================================================

@router.post(
    "/pay-periods",
    response_model=PayPeriodOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create pay period",
)
async def create_pay_period_route(
    data: PayPeriodCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(require_roles(["admin", "hr"])),
):

    org_id = _require_org_id(current_user)

    try:
        period = await create_pay_period(db, data, organisation_id=org_id)
        return period

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


# ============================================================
# CREATE PAYROLL RUN
# ============================================================

@router.post(
    "/",
    response_model=PayrollRunOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new payroll run",
)
async def create_new_payroll(
    data: PayrollRunCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(require_roles(["admin", "hr"])),
):

    org_id = _require_org_id(current_user)

    try:
        payroll = await create_payroll(db, data, organisation_id=org_id)
        return payroll

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


# ============================================================
# GET PAY PERIOD
# ============================================================

@router.get(
    "/pay-periods/{pay_period_id}",
    response_model=PayPeriodOut,
    summary="Get pay period"
)
async def get_pay_period_route(
    pay_period_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(require_roles(["admin", "hr"])),
):

    org_id = _require_org_id(current_user)
    period = await get_pay_period(db, pay_period_id)

    require_same_org(
        org_id=org_id,
        resource_org_id=getattr(period, "organisation_id", None) if period else None,
        not_found_msg="Pay period not found",
    )

    return period


@router.get(
    "/pay-periods/{pay_period_id}/attendance-summary",
    status_code=status.HTTP_200_OK,
    summary="Attendance + LOP leave summary for a pay period (read-only)",
)
async def pay_period_attendance_summary_route(
    pay_period_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    try:
        return await build_pay_period_attendance_summary(db, pay_period_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ============================================================
# PAYROLL OBSERVABILITY (Phase 3b)
# ============================================================


@router.get(
    "/{payroll_run_id}/execution-trace",
    status_code=status.HTTP_200_OK,
    summary="Trace viewer: DAG plan (introspection) + persisted component lines",
)
async def payroll_execution_trace(
    payroll_run_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    org_id = _org_id(current_user)
    payroll = await get_payroll_by_id(db, payroll_run_id)
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    if org_id and str(payroll.organisation_id) != str(org_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        return await build_payroll_execution_trace(db, payroll_run_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/{payroll_run_id}/replay-verify",
    status_code=status.HTTP_200_OK,
    summary="Replay engine from stored input snapshot and compare to persisted entries",
)
async def payroll_replay_verify(
    payroll_run_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    org_id = _org_id(current_user)
    payroll = await get_payroll_by_id(db, payroll_run_id)
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    if org_id and str(payroll.organisation_id) != str(org_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        return await verify_payroll_run_replay(db, payroll_run_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================
# GET PAYROLL RUN
# ============================================================

@router.get(
    "/{payroll_run_id}",
    response_model=PayrollRunOut,
    summary="Get payroll run"
)
async def get_payroll(
    payroll_run_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(require_roles(["admin", "hr"])),
):

    payroll = await get_payroll_by_id(db, payroll_run_id)

    if not payroll:
        raise HTTPException(
            status_code=404,
            detail="Payroll record not found"
        )

    org_id = _org_id(current_user)
    if org_id and str(payroll.organisation_id) != str(org_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    return payroll


# ============================================================
# PHASE 4 — LIFECYCLE (verify → approve → lock)
# ============================================================


@router.post(
    "/{payroll_run_id}/lifecycle/verify",
    response_model=PayrollRunOut,
    summary="Phase 4: verify payroll (draft → verified)",
)
async def payroll_lifecycle_verify(
    payroll_run_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    org_id = _org_id(current_user)
    uid = _user_id(current_user)
    if not uid:
        raise HTTPException(status_code=401, detail="User id missing")
    payroll = await get_payroll_by_id(db, payroll_run_id)
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    if org_id and str(payroll.organisation_id) != str(org_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    return await verify_payroll_lifecycle(db, payroll_run_id, org_id, UUID(str(uid)))


@router.post(
    "/{payroll_run_id}/lifecycle/approve",
    response_model=PayrollRunOut,
    summary="Phase 4: approve payroll (verified → approved)",
)
async def payroll_lifecycle_approve(
    payroll_run_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    org_id = _org_id(current_user)
    uid = _user_id(current_user)
    if not uid:
        raise HTTPException(status_code=401, detail="User id missing")
    payroll = await get_payroll_by_id(db, payroll_run_id)
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    if org_id and str(payroll.organisation_id) != str(org_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    return await approve_payroll_lifecycle(db, payroll_run_id, org_id, UUID(str(uid)))


@router.post(
    "/{payroll_run_id}/lifecycle/lock",
    response_model=PayrollRunOut,
    summary="Phase 4: lock payroll permanently (approved → locked); admin only",
)
async def payroll_lifecycle_lock(
    payroll_run_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin"])),
):
    org_id = _org_id(current_user)
    uid = _user_id(current_user)
    if not uid:
        raise HTTPException(status_code=401, detail="User id missing")
    payroll = await get_payroll_by_id(db, payroll_run_id)
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    if org_id and str(payroll.organisation_id) != str(org_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    return await lock_payroll_lifecycle(db, payroll_run_id, org_id, UUID(str(uid)))


@router.get(
    "/{payroll_run_id}/lifecycle/audit",
    status_code=status.HTTP_200_OK,
    summary="Phase 4: audit log entries for this payroll run",
)
async def payroll_lifecycle_audit_list(
    payroll_run_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    org_id = _org_id(current_user)
    payroll = await get_payroll_by_id(db, payroll_run_id)
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    if org_id and str(payroll.organisation_id) != str(org_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    items = await list_lifecycle_audit_for_run(
        db, payroll_run_id, payroll.organisation_id
    )
    return {"payroll_run_id": str(payroll_run_id), "items": items}


# ============================================================
# BATCH PROCESS PAYROLL
# ============================================================

@router.post(
    "/batch/process",
    status_code=status.HTTP_200_OK,
    summary="Process multiple payroll runs sequentially (same engine as single process)",
)
async def batch_process_payrolls(
    body: PayrollBatchProcessRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
    parallelism: int | None = Query(None, ge=1, le=64),
    shadow_legacy: bool = Query(False),
):
    org_id = _org_id(current_user)
    uid = _user_id(current_user)
    processed_by = UUID(str(uid)) if uid else None
    sorted_ids = sorted(body.payroll_run_ids, key=lambda x: str(x))
    first_payroll = await get_payroll_by_id(db, sorted_ids[0])
    if not first_payroll:
        raise HTTPException(
            status_code=404,
            detail=f"Payroll run not found: {sorted_ids[0]}",
        )
    if org_id and str(first_payroll.organisation_id) != str(org_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    key = request.headers.get("Idempotency-Key")
    path = str(request.url.path)
    fingerprints: list[str] = []
    for rid in sorted_ids:
        fingerprints.append(await compute_payroll_process_input_hash(db, rid))
    payload_dict = {
        "payroll_run_ids": [str(x) for x in sorted_ids],
        "input_fingerprints": fingerprints,
    }
    idempo_org = org_id or first_payroll.organisation_id
    replay = await idempotency_replay_or_none(
        db=db,
        organisation_id=idempo_org,
        key=key,
        method="POST",
        path=path,
        payload_dict=payload_dict,
    )
    if replay:
        if response is not None:
            response.status_code = int(replay["status_code"])
            response.headers["x-idempotent-replay"] = "true"
        return replay["data"]

    uid_uuid = processed_by
    for pr_id in sorted_ids:
        pr = await get_payroll_by_id(db, pr_id)
        if not pr:
            raise HTTPException(
                status_code=404,
                detail=f"Payroll run not found: {pr_id}",
            )
        await deny_if_locked_with_audit(
            db,
            pr,
            idempo_org,
            uid_uuid,
            "BATCH_PROCESS_PAYROLL",
        )

    use_celery = os.getenv("PAYROLL_USE_CELERY", "false").lower() == "true"
    if use_celery:
        from payroll.tasks import payroll_orchestrate_run_task

        task_ids: list[str] = []
        for pr_id in sorted_ids:
            try:
                await mark_payroll_run_queued(db, pr_id)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
            task_ids.append(
                payroll_orchestrate_run_task.delay(
                    str(pr_id),
                    str(uid),
                    shadow_legacy,
                ).id
            )
        data = {
            "queued": True,
            "celery_task_ids": task_ids,
            "payroll_run_ids": [str(x) for x in sorted_ids],
        }
        await idempotency_store(
            db=db,
            organisation_id=idempo_org,
            key=key,
            method="POST",
            path=path,
            payload_dict=payload_dict,
            status_code=202,
            response_json=data,
        )
        return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content=data)

    results: list[dict] = []
    for payroll_run_id in body.payroll_run_ids:
        payroll = await get_payroll_by_id(db, payroll_run_id)
        if not payroll:
            raise HTTPException(
                status_code=404,
                detail=f"Payroll run not found: {payroll_run_id}",
            )
        if str(payroll.organisation_id) != str(first_payroll.organisation_id):
            raise HTTPException(
                status_code=400,
                detail="All payroll_run_ids must belong to the same organisation",
            )
        if org_id and str(payroll.organisation_id) != str(org_id):
            raise HTTPException(status_code=403, detail="Forbidden")
        try:
            await process_payroll_run(
                db,
                payroll_run_id,
                processed_by,
                max_parallel=parallelism,
                shadow_legacy=shadow_legacy,
            )
        except (PayrollAttendanceValidationError, PayrollProcessBlockedError, ValueError) as e:
            raise _http_payroll_error(e) from e
        results.append({"payroll_run_id": str(payroll_run_id), "status": "processed"})

    data = {"results": results}
    await idempotency_store(
        db=db,
        organisation_id=idempo_org,
        key=key,
        method="POST",
        path=path,
        payload_dict=payload_dict,
        status_code=200,
        response_json=data,
    )
    return data


# ============================================================
# REPROCESS / RESET
# ============================================================

@router.post(
    "/{payroll_run_id}/reset-for-reprocess",
    status_code=status.HTTP_200_OK,
    summary="Clear payroll lines and stale snapshot so run can be processed with current attendance settings",
)
async def reset_payroll_for_reprocess(
    payroll_run_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    org_id = _org_id(current_user)
    payroll = await get_payroll_by_id(db, payroll_run_id)
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    if org_id and str(payroll.organisation_id) != str(org_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    uid = _user_id(current_user)
    await deny_if_locked_with_audit(
        db,
        payroll,
        org_id or payroll.organisation_id,
        UUID(str(uid)) if uid else None,
        "RESET_FOR_REPROCESS",
    )

    try:
        updated = await reset_payroll_run_for_reprocess(db, payroll_run_id)
    except PayrollProcessBlockedError as e:
        raise _http_payroll_error(e) from e
    except ValueError as e:
        raise _http_payroll_error(e) from e

    return {
        "message": "Payroll run reset for reprocess. Process again to rebuild attendance snapshot and entries.",
        "payroll_run_id": str(payroll_run_id),
        "status": updated.status,
        "execution_status": updated.execution_status,
        "execution_meta": updated.execution_meta,
    }


# ============================================================
# PROCESS PAYROLL
# ============================================================

@router.post(
    "/{payroll_run_id}/process",
    status_code=status.HTTP_200_OK,
    summary="Process payroll (Phase 2 engine via orchestration)"
)
async def process_payroll(
    payroll_run_id: UUID,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(require_roles(["admin", "hr"])),
    parallelism: int | None = Query(None, ge=1, le=64, description="Max concurrent employees"),
    shadow_legacy: bool = Query(
        False,
        description="Optional legacy calculator comparison (observability only)",
    ),
):
    org_id = _org_id(current_user)
    payroll = await get_payroll_by_id(db, payroll_run_id)
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    if org_id and str(payroll.organisation_id) != str(org_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    uid = _user_id(current_user)
    processed_by = UUID(str(uid)) if uid else None
    await deny_if_locked_with_audit(
        db,
        payroll,
        org_id or payroll.organisation_id,
        UUID(str(uid)) if uid else None,
        "PROCESS_PAYROLL",
    )

    idempo_org = org_id or payroll.organisation_id
    key = request.headers.get("Idempotency-Key")
    path = str(request.url.path)
    input_fp = await compute_payroll_process_input_hash(db, payroll_run_id)
    payload_dict = {"payroll_run_id": str(payroll_run_id), "input_fingerprint": input_fp}
    replay = await idempotency_replay_or_none(
        db=db,
        organisation_id=idempo_org,
        key=key,
        method="POST",
        path=path,
        payload_dict=payload_dict,
    )
    if replay:
        if response is not None:
            response.status_code = int(replay["status_code"])
            response.headers["x-idempotent-replay"] = "true"
        return replay["data"]

    use_celery = os.getenv("PAYROLL_USE_CELERY", "false").lower() == "true"
    if use_celery:
        try:
            await mark_payroll_run_queued(db, payroll_run_id)
            from payroll.tasks import payroll_orchestrate_run_task

            async_result = payroll_orchestrate_run_task.delay(
                str(payroll_run_id),
                str(uid),
                shadow_legacy,
            )
        except (PayrollProcessBlockedError, PayrollAttendanceValidationError, ValueError) as e:
            raise _http_payroll_error(e) from e

        data = {
            "message": "Payroll queued for distributed processing",
            "payroll_run_id": str(payroll_run_id),
            "queued": True,
            "celery_task_id": async_result.id,
            "processed_by": str(uid),
        }
        await idempotency_store(
            db=db,
            organisation_id=idempo_org,
            key=key,
            method="POST",
            path=path,
            payload_dict=payload_dict,
            status_code=202,
            response_json=data,
        )
        return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content=data)

    try:
        await process_payroll_run(
            db,
            payroll_run_id,
            processed_by,
            max_parallel=parallelism,
            shadow_legacy=shadow_legacy,
        )
    except (PayrollAttendanceValidationError, PayrollProcessBlockedError, ValueError) as e:
        raise _http_payroll_error(e) from e
    except ProgrammingError:
        raise HTTPException(
            status_code=500,
            detail=(
                "Payroll database schema is missing required tables or columns. "
                "Restart the backend after deploying the latest server."
            ),
        )
    except IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Could not finalize payroll run. Confirm your signed-in user exists in payroll.",
        )

    data = {
        "message": "Payroll processed successfully",
        "payroll_run_id": str(payroll_run_id),
        "processed_by": str(uid),
    }
    await idempotency_store(
        db=db,
        organisation_id=idempo_org,
        key=key,
        method="POST",
        path=path,
        payload_dict=payload_dict,
        status_code=200,
        response_json=data,
    )
    return data

# ============================================================
# PAYROLL SUMMARY
# ============================================================

@router.get(
    "/{payroll_run_id}/summary",
    status_code=status.HTTP_200_OK,
    summary="Payroll summary"
)
async def payroll_summary(
    payroll_run_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(require_roles(["admin", "hr"])),
):

    payroll = await get_payroll_by_id(db, payroll_run_id)

    if not payroll:
        raise HTTPException(
            status_code=404,
            detail="Payroll run not found"
        )

    summary = await get_payroll_summary(db, payroll_run_id)

    return summary

@router.get(
    "/{payroll_run_id}/salary-statement",
    summary="Salary statement"
)
async def salary_statement(
    payroll_run_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(require_roles(["admin", "hr"])),
):

    data = await generate_salary_statement(db, payroll_run_id)

    return {
        "payroll_run_id": str(payroll_run_id),
        "salary_statement": data
    }

@router.get(
    "/{payroll_run_id}/tds-summary",
    summary="Basic TDS summary"
)
async def tds_summary(
    payroll_run_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(require_roles(["admin", "hr"])),
):

    data = await generate_tds_summary(db, payroll_run_id)

    return {
        "payroll_run_id": str(payroll_run_id),
        "tds_summary": data
    }

# ============================================================
# PAYROLL REGISTER
# ============================================================

@router.get(
    "/{payroll_run_id}/register",
    summary="Payroll register"
)
async def payroll_register(
    payroll_run_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user = Depends(require_roles(["admin", "hr"])),
):

    payroll = await get_payroll_by_id(db, payroll_run_id)

    if not payroll:
        raise HTTPException(
            status_code=404,
            detail="Payroll run not found"
        )

    data = await generate_payroll_register(db, payroll_run_id)

    return {
        "payroll_run_id": str(payroll_run_id),
        "register": data
    }