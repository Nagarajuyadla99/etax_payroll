from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from database import AsyncSessionLocal
from models.provider_models import ProviderPayout, WebhookEvent
from providers.registry import get_provider, resolve_provider
from services.provider_config_service import load_active_provider_credentials, build_provider
from models.fraud_models import FraudAlert, RiskScore
from services.event_bus import publish_event
from services.payout_sync_service import sync_provider_payout_to_batch
from services.banking_metrics import inc_payout_sync, inc_webhook
from utils.webhook_security import webhook_client_allowed


router = APIRouter(prefix="/webhooks", tags=["Webhooks"])
logger = logging.getLogger("payroll.webhooks")


@router.post("/razorpayx", status_code=status.HTTP_200_OK)
async def razorpayx_webhook(request: Request):
    client_ip = request.client.host if request.client else None
    if not webhook_client_allowed(client_ip):
        inc_webhook("razorpayx", ok=False)
        raise HTTPException(status_code=403, detail="Webhook source not allowed")

    body = await request.body()
    headers = {k.lower(): v for k, v in request.headers.items()}
    correlation_id = headers.get("x-request-id") or headers.get("x-razorpay-event-id")

    payload = json.loads(body.decode("utf-8", errors="replace") or "{}")
    payout_entity = (
        payload.get("payload", {}).get("payout", {}).get("entity", {})
        if isinstance(payload, dict)
        else {}
    )
    provider_payout_ref = str(payout_entity.get("id") or "")

    signature_ok = False
    org_id_for_webhook = None

    async with AsyncSessionLocal() as db_probe:
        if provider_payout_ref:
            pr = await db_probe.execute(
                select(ProviderPayout).where(
                    ProviderPayout.provider_code == "razorpayx",
                    ProviderPayout.provider_payout_ref == provider_payout_ref,
                )
            )
            pp_probe = pr.scalar_one_or_none()
            if pp_probe:
                org_id_for_webhook = pp_probe.organisation_id
                creds = await load_active_provider_credentials(
                    db_probe, organisation_id=pp_probe.organisation_id, provider_code="razorpayx"
                )
                signature_ok = build_provider(creds).verify_webhook(body=body, headers=headers)

    if not signature_ok:
        fallback = get_provider()
        if fallback.provider_code == "razorpayx":
            signature_ok = fallback.verify_webhook(body=body, headers=headers)

    event_id = str(
        payload.get("event")
        or payload.get("id")
        or payload.get("payload", {}).get("payout", {}).get("entity", {}).get("id")
        or ""
    )
    event_type = str(payload.get("event") or "")
    if not event_id:
        raise HTTPException(status_code=400, detail="Missing event id")

    async with AsyncSessionLocal() as db:
        async with db.begin():
            res = await db.execute(
                select(WebhookEvent).where(
                    WebhookEvent.provider_code == "razorpayx",
                    WebhookEvent.event_id == event_id,
                )
            )
            existing = res.scalar_one_or_none()
            if existing and existing.process_status == "processed":
                inc_webhook("razorpayx", ok=True, replay=True)
                logger.info(
                    "webhook replay provider=razorpayx event_id=%s correlation_id=%s",
                    event_id,
                    correlation_id,
                )
                return {"ok": True, "replayed": True}

            if not existing:
                existing = WebhookEvent(
                    provider_code="razorpayx",
                    event_id=event_id,
                    event_type=event_type,
                    signature_valid=bool(signature_ok),
                    payload=payload,
                    process_status="received",
                )
                db.add(existing)
                await db.flush()

            if not signature_ok:
                existing.process_status = "failed"
                existing.failure_reason = "invalid_signature"
                existing.processed_at = datetime.now(tz=timezone.utc)
                return {"ok": False, "error": "invalid_signature"}

            status_s = str(payout_entity.get("status") or "")
            utr = payout_entity.get("utr")
            failure_reason = payout_entity.get("failure_reason") or payout_entity.get("status_reason")

            if provider_payout_ref:
                pr = await db.execute(
                    select(ProviderPayout).where(
                        ProviderPayout.provider_code == "razorpayx",
                        ProviderPayout.provider_payout_ref == provider_payout_ref,
                    )
                )
                pp = pr.scalar_one_or_none()
                if pp:
                    await sync_provider_payout_to_batch(
                        db,
                        provider_payout=pp,
                        provider_status=status_s,
                        utr=str(utr) if utr else None,
                        failure_reason=str(failure_reason) if failure_reason else None,
                        raw=payload,
                    )
                    inc_payout_sync("webhook_ok")
                    logger.info(
                        "webhook payout sync provider=razorpayx payout_ref=%s status=%s utr=%s correlation_id=%s",
                        provider_payout_ref,
                        status_s,
                        utr,
                        correlation_id,
                    )
                    await publish_event(
                        db,
                        organisation_id=pp.organisation_id,
                        event_type="webhook.received",
                        dedupe_key=f"webhook.razorpayx:{event_id}",
                        payload={
                            "provider": "razorpayx",
                            "event_id": event_id,
                            "event_type": event_type,
                            "provider_payout_ref": provider_payout_ref,
                            "status": status_s,
                        },
                    )
                    if status_s in {"failed", "reversed"}:
                        db.add(
                            FraudAlert(
                                organisation_id=pp.organisation_id,
                                rule_code="PAYOUT_STATUS_ANOMALY",
                                severity="medium",
                                status="open",
                                salary_batch_id=pp.salary_batch_id,
                                salary_batch_item_id=pp.salary_batch_item_id,
                                provider_payout_id=pp.provider_payout_id,
                                title="Provider reported payout failure/reversal",
                                details={
                                    "provider_status": status_s,
                                    "provider_payout_ref": provider_payout_ref,
                                },
                            )
                        )
                        db.add(
                            RiskScore(
                                organisation_id=pp.organisation_id,
                                entity_type="provider_payout",
                                entity_id=pp.provider_payout_id,
                                score=50,
                                band="medium",
                                signals=[{"type": "provider_status", "status": status_s}],
                            )
                        )
                        await publish_event(
                            db,
                            organisation_id=pp.organisation_id,
                            event_type="fraud.detected",
                            dedupe_key=f"fraud.detected:webhook:{pp.provider_payout_id}:{status_s}",
                            payload={
                                "kind": "PAYOUT_STATUS_ANOMALY",
                                "provider_payout_id": str(pp.provider_payout_id),
                                "status": status_s,
                            },
                        )

            existing.process_status = "processed"
            existing.processed_at = datetime.now(tz=timezone.utc)

    inc_webhook("razorpayx", ok=True)
    return {"ok": True}
