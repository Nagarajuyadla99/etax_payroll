from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from database import AsyncSessionLocal
from models.provider_models import ProviderPayout, WebhookEvent
from providers.registry import get_provider
from models.fraud_models import FraudAlert, RiskScore
from services.event_bus import publish_event


router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/razorpayx", status_code=status.HTTP_200_OK)
async def razorpayx_webhook(request: Request):
    body = await request.body()
    headers = {k.lower(): v for k, v in request.headers.items()}

    provider = get_provider()
    if provider.provider_code != "razorpayx":
        raise HTTPException(status_code=400, detail="Provider not enabled")

    signature_ok = provider.verify_webhook(body=body, headers=headers)
    payload = json.loads(body.decode("utf-8", errors="replace") or "{}")

    # Best-effort event id extraction (Razorpay includes event + payload.id)
    event_id = str(payload.get("event") or payload.get("id") or payload.get("payload", {}).get("payout", {}).get("entity", {}).get("id") or "")
    event_type = str(payload.get("event") or "")
    if not event_id:
        raise HTTPException(status_code=400, detail="Missing event id")

    async with AsyncSessionLocal() as db:
        async with db.begin():
            # replay prevention + idempotent processing
            res = await db.execute(
                select(WebhookEvent).where(
                    WebhookEvent.provider_code == "razorpayx",
                    WebhookEvent.event_id == event_id,
                )
            )
            existing = res.scalar_one_or_none()
            if existing and existing.process_status == "processed":
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

            # Process payout update if present
            payout_entity = payload.get("payload", {}).get("payout", {}).get("entity", {}) if isinstance(payload, dict) else {}
            provider_payout_ref = str(payout_entity.get("id") or "")
            status_s = str(payout_entity.get("status") or "")
            utr = payout_entity.get("utr")

            if provider_payout_ref:
                pr = await db.execute(
                    select(ProviderPayout).where(
                        ProviderPayout.provider_code == "razorpayx",
                        ProviderPayout.provider_payout_ref == provider_payout_ref,
                    )
                )
                pp = pr.scalar_one_or_none()
                if pp:
                    pp.status = status_s or pp.status
                    if utr:
                        pp.utr = str(utr)
                    pp.raw = payload
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
                                details={"provider_status": status_s, "provider_payout_ref": provider_payout_ref},
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

    return {"ok": True}

