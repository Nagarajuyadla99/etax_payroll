#!/usr/bin/env python3
"""
Banking disaster-recovery CLI (additive ops tooling).

Usage:
  python scripts/banking_recovery.py recover-batch <batch_id>
  python scripts/banking_recovery.py verify-batch <batch_id>
  python scripts/banking_recovery.py detect-stuck [--minutes 60]
  python scripts/banking_recovery.py replay-webhook <event_id>  # logs guidance
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def main() -> int:
    parser = argparse.ArgumentParser(description="Banking recovery utilities")
    sub = parser.add_subparsers(dest="command", required=True)

    p_recover = sub.add_parser("recover-batch", help="Poll provider and sync stuck batch")
    p_recover.add_argument("batch_id")

    p_verify = sub.add_parser("verify-batch", help="Verify item/provider payout consistency")
    p_verify.add_argument("batch_id")

    p_stuck = sub.add_parser("detect-stuck", help="List payout_in_progress batches older than N minutes")
    p_stuck.add_argument("--minutes", type=int, default=60)

    p_webhook = sub.add_parser("replay-webhook", help="Show webhook event status (manual replay via provider dashboard)")
    p_webhook.add_argument("event_id")

    args = parser.parse_args()

    if args.command == "recover-batch":
        from tasks.banking_ops_tasks import recover_stuck_batch

        print(recover_stuck_batch(args.batch_id))
        return 0

    if args.command == "verify-batch":
        from tasks.banking_ops_tasks import verify_payout_consistency

        print(verify_payout_consistency(args.batch_id))
        return 0

    if args.command == "detect-stuck":
        from tasks.banking_ops_tasks import detect_stuck_payouts

        print(detect_stuck_payouts(args.minutes))
        return 0

    if args.command == "replay-webhook":
        async def _show():
            from uuid import UUID
            from sqlalchemy import select
            from database import AsyncSessionLocal
            from models.provider_models import WebhookEvent

            async with AsyncSessionLocal() as db:
                res = await db.execute(
                    select(WebhookEvent).where(WebhookEvent.event_id == args.event_id)
                )
                row = res.scalar_one_or_none()
                if not row:
                    return {"error": "event_not_found", "event_id": args.event_id}
                return {
                    "event_id": row.event_id,
                    "process_status": row.process_status,
                    "signature_valid": row.signature_valid,
                    "note": "Re-send payload from provider dashboard; idempotent by event_id",
                }

        print(asyncio.run(_show()))
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
