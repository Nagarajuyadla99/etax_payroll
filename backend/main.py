import json
import logging
import os
import time
from uuid import uuid4

from dotenv import load_dotenv

load_dotenv(override=True)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from api.attendance_route import router as attendance_router
from api.employee_route import router as employee_router
from api.user_routes import router as user_router
from api.auth_routes import router as auth_router
from api.employee_auth_routes import router as employee_auth_router

from api.salary_routes import router as salary_router
from api.salary_v2_routes import router as salary_v2_router
from api.payroll_routes import router as payroll_router
from api.payslip_routes import router as payslip_router, payslip_view_router
from api.org_routes import router as org_router
from api.on_boarding_routes import router as onboarding
from api.banking_routes import router as banking_router
from api.employee_banking_routes import router as employee_banking_router
from api.disbursement_routes import router as disbursement_router
from api.reconciliation_routes import router as reconciliation_router
from api.ops_routes import router as ops_router
from api.webhooks_routes import router as webhooks_router
from api.provider_beneficiary_routes import router as provider_beneficiary_router
from api.provider_config_routes import router as provider_config_router
from api.fraud_routes import router as fraud_router
from api.workflow_routes import router as workflow_router
from api.org_reporting_routes import router as org_reporting_router
from api.events_routes import router as events_router
from api.dashboard_routes import router as dashboard_router
import uvicorn





from database import engine, Base

# IMPORTANT: import models BEFORE create_all
import models
from middleware.request_context_middleware import RequestContextMiddleware
from middleware.security_middleware import SecurityMiddleware
from middleware.metrics_middleware import MetricsMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from sqlalchemy import text

from models.salary_models import (
    OrgStatutoryConfig,
    SalaryComponentGroup,
    SalaryComponentGroupItem,
    SalaryDerivedVariable,
    SalaryTemplateGroup,
)
from models.idempotency_models import ApiIdempotencyKey
from models.salary_version_models import (
    SalaryComponentGroupItemVersion,
    SalaryComponentGroupVersion,
    SalaryComponentVersion,
    SalaryDerivedVariableVersion,
    SalaryPreviewSnapshot,
    SalaryTemplateComponentVersion,
    SalaryTemplateGroupVersion,
    SalaryTemplateVersion,
)

app = FastAPI()
API_PREFIX = "/api"
AUTO_CREATE_TABLES = os.getenv("AUTO_CREATE_TABLES", "false").lower() == "true"
# Production default: false — schema must be applied with Alembic before boot.
# Set "true" only for legacy databases that predate migration ``f8e7d6c5b4a3`` / partial
# applies, or for emergency self-heal (includes a **destructive** idempotency repair).
ENABLE_STARTUP_SCHEMA_PATCH = os.getenv("ENABLE_STARTUP_SCHEMA_PATCH", "false").lower() == "true"

_SALARY_V2_TABLES = (
    SalaryComponentGroup.__table__,
    SalaryComponentGroupItem.__table__,
    SalaryDerivedVariable.__table__,
    OrgStatutoryConfig.__table__,
    SalaryTemplateGroup.__table__,
    SalaryComponentVersion.__table__,
    SalaryDerivedVariableVersion.__table__,
    SalaryTemplateVersion.__table__,
    SalaryTemplateComponentVersion.__table__,
    SalaryTemplateGroupVersion.__table__,
    SalaryComponentGroupVersion.__table__,
    SalaryComponentGroupItemVersion.__table__,
    SalaryPreviewSnapshot.__table__,
    ApiIdempotencyKey.__table__,
)


def _ensure_salary_v2_tables(sync_conn) -> None:
    """
    **Compatibility:** ``CREATE TABLE IF NOT EXISTS`` for Salary V2 + idempotency ORM tables.

    Redundant when revision ``2e3bd6785936`` (or later) has been applied; safe no-op then.
    """
    Base.metadata.create_all(sync_conn, tables=list(_SALARY_V2_TABLES), checkfirst=True)


def _repair_api_idempotency_schema(sync_conn) -> None:
    """
    **Legacy / unsafe:** drops ``api_idempotency_keys`` if an ancient wrong shape is detected,
    then recreates from the ORM model.

    Do **not** rely on this in production: run Alembic instead. Kept only behind
    ``ENABLE_STARTUP_SCHEMA_PATCH=true`` for one-off recovery.
    """
    sync_conn.execute(
        text(
            "DO $$ BEGIN "
            "IF EXISTS ("
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = 'api_idempotency_keys' "
            "AND column_name = 'idempotency_key'"
            ") AND NOT EXISTS ("
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = 'api_idempotency_keys' "
            "AND column_name = 'organisation_id'"
            ") THEN "
            "DROP TABLE api_idempotency_keys; "
            "END IF; "
            "END $$;"
        )
    )
    Base.metadata.create_all(sync_conn, tables=[ApiIdempotencyKey.__table__], checkfirst=True)

logger = logging.getLogger("payroll")
if not logger.handlers:
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())

# Explicit dev defaults; append CORS_ORIGINS="http://host:port,..." from .env for more hosts.
origins = [
    "http://localhost:9999",
    "http://127.0.0.1:9999",
    "http://localhost:3000",
    "http://127.0.0.1:3000",

    "https://brixigo.com",
    "https://www.brixigo.com",
]
for _o in os.getenv("CORS_ORIGINS", "").split(","):
    _o = _o.strip()
    if _o and _o not in origins:
        origins.append(_o)

# Any localhost / loopback port (covers CRA port changes, IPv6 ::1, etc.)
_local_origin_re = r"https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$"

app.add_middleware(RequestContextMiddleware)
app.add_middleware(SecurityMiddleware)
app.add_middleware(MetricsMiddleware)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid4())
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:  # noqa: BLE001
        logger.exception(
            "Unhandled error request_id=%s method=%s path=%s",
            request_id,
            request.method,
            request.url.path,
        )
        response = JSONResponse(
            status_code=500,
            content={
                "detail": "Internal Server Error",
                "request_id": request_id,
            },
        )

    response.headers["x-request-id"] = request_id
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    try:
        logger.info(
            json.dumps(
                {
                    "event": "http_request",
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": getattr(response, "status_code", None),
                    "elapsed_ms": elapsed_ms,
                },
                separators=(",", ":"),
            )
        )
    except Exception:
        logger.info(
            "request_id=%s %s %s -> %s (%sms)",
            request_id,
            request.method,
            request.url.path,
            getattr(response, "status_code", "?"),
            elapsed_ms,
        )
    return response


# CORS must be registered after other middleware so it stays outermost: when
# request_logging catches errors, the JSONResponse still passes through CORSMiddleware.
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=_local_origin_re,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# include router
app.include_router(attendance_router, prefix=API_PREFIX)
app.include_router(employee_router, prefix=API_PREFIX)
app.include_router(user_router, prefix=API_PREFIX )

app.include_router(employee_auth_router, prefix="/api")
app.include_router(auth_router, prefix=API_PREFIX + "/auth", tags=["Authentication"])
app.include_router(salary_router, prefix=API_PREFIX + "/salary", tags=["Salary"])
app.include_router(salary_v2_router, prefix=API_PREFIX + "/salary", tags=["Salary V2"])

app.include_router(payroll_router, prefix=API_PREFIX)
app.include_router(payslip_router, prefix=API_PREFIX)
app.include_router(payslip_view_router, prefix=API_PREFIX)

app.include_router(org_router, prefix=API_PREFIX + "/organisation")
app.include_router(onboarding, prefix="/api")
app.include_router(banking_router, prefix=API_PREFIX)
app.include_router(employee_banking_router, prefix=API_PREFIX)
app.include_router(disbursement_router, prefix=API_PREFIX)
app.include_router(reconciliation_router, prefix=API_PREFIX)
app.include_router(ops_router, prefix=API_PREFIX)
app.include_router(webhooks_router, prefix=API_PREFIX)
app.include_router(provider_beneficiary_router, prefix=API_PREFIX)
app.include_router(provider_config_router, prefix=API_PREFIX)
app.include_router(fraud_router, prefix=API_PREFIX)
app.include_router(workflow_router, prefix=API_PREFIX)
app.include_router(org_reporting_router, prefix=API_PREFIX)
app.include_router(events_router, prefix=API_PREFIX)
app.include_router(dashboard_router, prefix=API_PREFIX)


# Used by deploy pipeline / load balancers (health check on localhost:9000)
@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/liveness")
def liveness():
    return {"status": "ok"}


@app.get("/metrics")
def metrics():
    from fastapi import Response

    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


# create tables on startup
@app.on_event("startup")
async def startup():
    if AUTO_CREATE_TABLES:
        logger.warning(
            "AUTO_CREATE_TABLES=true: using Base.metadata.create_all() (not recommended). "
            "Prefer Alembic in production."
        )
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    if not ENABLE_STARTUP_SCHEMA_PATCH:
        logger.info(
            "Startup schema patch skipped (ENABLE_STARTUP_SCHEMA_PATCH=false). "
            "Ensure `alembic upgrade head` has been applied (includes f8e7d6c5b4a3 for legacy parity)."
        )
        return

    logger.warning(
        "ENABLE_STARTUP_SCHEMA_PATCH=true: applying runtime DDL — deprecated. "
        "Migrate to Alembic-only and set this env to false."
    )
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "ALTER TABLE organisations "
                "ADD COLUMN IF NOT EXISTS hr_settings jsonb NOT NULL DEFAULT '{}'::jsonb"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE attendances "
                "ADD COLUMN IF NOT EXISTS day_fraction numeric(5,4) NOT NULL DEFAULT 1.0"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE attendances "
                "ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE attendances "
                "ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()"
            )
        )
        await conn.execute(
            text("ALTER TABLE leaves ADD COLUMN IF NOT EXISTS cancelled_at timestamptz")
        )
        await conn.execute(text("ALTER TABLE leaves ADD COLUMN IF NOT EXISTS cancelled_by uuid"))
        await conn.execute(
            text(
                "DO $$ BEGIN "
                "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leaves_cancelled_by_users') THEN "
                "ALTER TABLE leaves ADD CONSTRAINT fk_leaves_cancelled_by_users "
                "FOREIGN KEY (cancelled_by) REFERENCES users(user_id) ON DELETE SET NULL; "
                "END IF; "
                "END $$;"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE employee_salary_structures "
                "ADD COLUMN IF NOT EXISTS overrides jsonb NOT NULL DEFAULT '{}'::jsonb"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE pay_periods "
                "ADD COLUMN IF NOT EXISTS attendance_leave_locked boolean NOT NULL DEFAULT false"
            )
        )
        await conn.execute(
            text("ALTER TABLE pay_periods ADD COLUMN IF NOT EXISTS locked_at timestamptz")
        )
        await conn.execute(
            text(
                "ALTER TABLE pay_periods ADD COLUMN IF NOT EXISTS locked_by_payroll_run_id uuid"
            )
        )
        await conn.execute(
            text(
                "DO $$ BEGIN "
                "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pay_periods_locked_by_run') THEN "
                "ALTER TABLE pay_periods ADD CONSTRAINT fk_pay_periods_locked_by_run "
                "FOREIGN KEY (locked_by_payroll_run_id) REFERENCES payroll_runs(payroll_run_id) ON DELETE SET NULL; "
                "END IF; "
                "END $$;"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE payroll_runs "
                "ADD COLUMN IF NOT EXISTS execution_trace_id uuid"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE payroll_runs "
                "ADD COLUMN IF NOT EXISTS execution_meta jsonb"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE payroll_runs "
                "ADD COLUMN IF NOT EXISTS execution_status varchar(32) NOT NULL DEFAULT 'draft'"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE payroll_runs "
                "ADD COLUMN IF NOT EXISTS lifecycle_status varchar(32)"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE payroll_runs "
                "ADD COLUMN IF NOT EXISTS lifecycle_verified_at timestamptz"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE payroll_runs "
                "ADD COLUMN IF NOT EXISTS lifecycle_verified_by uuid"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE payroll_runs "
                "ADD COLUMN IF NOT EXISTS lifecycle_approved_at timestamptz"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE payroll_runs "
                "ADD COLUMN IF NOT EXISTS lifecycle_approved_by uuid"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE payroll_runs "
                "ADD COLUMN IF NOT EXISTS payroll_locked_at timestamptz"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE payroll_runs "
                "ADD COLUMN IF NOT EXISTS lifecycle_locked_by uuid"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE payroll_runs "
                "ADD COLUMN IF NOT EXISTS final_snapshot jsonb"
            )
        )
        await conn.execute(
            text(
                "DO $$ BEGIN "
                "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payroll_runs_lifecycle_verified_by') THEN "
                "ALTER TABLE payroll_runs ADD CONSTRAINT fk_payroll_runs_lifecycle_verified_by "
                "FOREIGN KEY (lifecycle_verified_by) REFERENCES users(user_id) ON DELETE SET NULL; "
                "END IF; "
                "END $$;"
            )
        )
        await conn.execute(
            text(
                "DO $$ BEGIN "
                "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payroll_runs_lifecycle_approved_by') THEN "
                "ALTER TABLE payroll_runs ADD CONSTRAINT fk_payroll_runs_lifecycle_approved_by "
                "FOREIGN KEY (lifecycle_approved_by) REFERENCES users(user_id) ON DELETE SET NULL; "
                "END IF; "
                "END $$;"
            )
        )
        await conn.execute(
            text(
                "DO $$ BEGIN "
                "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payroll_runs_lifecycle_locked_by') THEN "
                "ALTER TABLE payroll_runs ADD CONSTRAINT fk_payroll_runs_lifecycle_locked_by "
                "FOREIGN KEY (lifecycle_locked_by) REFERENCES users(user_id) ON DELETE SET NULL; "
                "END IF; "
                "END $$;"
            )
        )
        await conn.execute(
            text(
                "CREATE TABLE IF NOT EXISTS payroll_lifecycle_audit ("
                "audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"
                "organisation_id uuid NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,"
                "user_id uuid REFERENCES users(user_id) ON DELETE SET NULL,"
                "action varchar(64) NOT NULL,"
                "entity_type varchar(64) NOT NULL,"
                "entity_id uuid NOT NULL,"
                "detail jsonb,"
                "created_at timestamptz NOT NULL DEFAULT now()"
                ")"
            )
        )
        await conn.run_sync(_repair_api_idempotency_schema)
        await conn.run_sync(_ensure_salary_v2_tables)


@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=9000, reload=True)