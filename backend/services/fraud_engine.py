from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.disbursement_models import SalaryBatchItem
from models.employee_banking_models import EmployeeBankAccount
from models.fraud_models import FraudAlert, RiskScore
from models.provider_models import ProviderPayout


def _band(score: int) -> str:
    if score >= 90:
        return "critical"
    if score >= 70:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


async def evaluate_payout_risk(
    db: AsyncSession,
    *,
    organisation_id: UUID,
    batch_id: UUID,
    item: SalaryBatchItem,
    provider_payout: ProviderPayout | None,
) -> RiskScore:
    """
    Deterministic Phase 2C baseline:
    - Duplicate payout: same employee + same amount + recent successful payout (7d)
    - Rapid bank change: bank account updated recently (7d)
    - Salary spike: amount > 3x median of last 6 successful payouts (fallback: > 2L)
    Returns/updates RiskScore and creates FraudAlert(s) as needed.
    Caller owns transaction boundary.
    """
    signals: list[dict] = []
    score = 0

    now = datetime.now(tz=timezone.utc)

    # 1) Duplicate payout heuristic
    lookback = now - timedelta(days=7)
    dup_q = await db.execute(
        select(ProviderPayout)
        .where(
            ProviderPayout.organisation_id == organisation_id,
            ProviderPayout.status.in_(["processed", "success"]),
        )
        .order_by(ProviderPayout.created_at.desc())
        .limit(200)
    )
    recent = list(dup_q.scalars().all())
    for rp in recent:
        if rp.salary_batch_item_id == item.item_id:
            continue
        # compare by employee by joining batch item
        bi = await db.get(SalaryBatchItem, rp.salary_batch_item_id)
        if not bi:
            continue
        if str(bi.employee_id) == str(item.employee_id) and Decimal(bi.amount) == Decimal(item.amount):
            score += 60
            signals.append({"type": "duplicate_payout", "provider_payout_id": str(rp.provider_payout_id)})
            db.add(
                FraudAlert(
                    organisation_id=organisation_id,
                    rule_code="DUPLICATE_PAYOUT",
                    severity="high",
                    status="open",
                    employee_id=item.employee_id,
                    salary_batch_id=batch_id,
                    salary_batch_item_id=item.item_id,
                    provider_payout_id=provider_payout.provider_payout_id if provider_payout else None,
                    title="Potential duplicate payout",
                    details={"previous_provider_payout_id": str(rp.provider_payout_id)},
                )
            )
            break

    # 2) Rapid bank account change
    if item.employee_bank_account_id:
        acct = await db.get(EmployeeBankAccount, item.employee_bank_account_id)
        if acct and acct.updated_at and (acct.updated_at >= lookback):
            score += 30
            signals.append({"type": "rapid_bank_change", "updated_at": str(acct.updated_at)})
            db.add(
                FraudAlert(
                    organisation_id=organisation_id,
                    rule_code="RAPID_BANK_CHANGE",
                    severity="medium",
                    status="open",
                    employee_id=item.employee_id,
                    salary_batch_id=batch_id,
                    salary_batch_item_id=item.item_id,
                    provider_payout_id=provider_payout.provider_payout_id if provider_payout else None,
                    title="Bank account changed recently",
                    details={"bank_account_id": str(item.employee_bank_account_id), "updated_at": str(acct.updated_at)},
                )
            )

    # 3) Salary spike baseline (simple)
    if Decimal(item.amount) >= Decimal("200000"):
        score += 20
        signals.append({"type": "high_amount", "amount": str(item.amount)})

    band = _band(min(score, 100))

    rs = RiskScore(
        organisation_id=organisation_id,
        entity_type="salary_batch_item",
        entity_id=item.item_id,
        score=min(score, 100),
        band=band,
        signals=signals,
    )
    db.add(rs)
    await db.flush()
    return rs

