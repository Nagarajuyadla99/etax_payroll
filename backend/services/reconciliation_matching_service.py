from __future__ import annotations

from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.disbursement_models import SalaryBatchItem
from models.provider_models import ProviderPayout
from models.reconciliation_v2_models import BankTransaction, ReconciliationException, ReconciliationMatch


async def match_transactions_for_import(
    db: AsyncSession,
    *,
    organisation_id,
    import_id,
    amount_tolerance: Decimal = Decimal("0.00"),
) -> dict[str, int]:
    """
    Deterministic matching:
    - Prefer exact UTR matches against ProviderPayout.utr
    - Else reference contains provider payout ref
    - Else create exception (unmatched)
    Caller owns transaction boundary.
    """
    res = await db.execute(
        select(BankTransaction).where(
            BankTransaction.organisation_id == organisation_id,
            BankTransaction.import_id == import_id,
        )
    )
    txns = list(res.scalars().all())

    matched = 0
    exceptions = 0

    for t in txns:
        # already matched?
        existing_match = await db.execute(select(ReconciliationMatch).where(ReconciliationMatch.transaction_id == t.transaction_id))
        if existing_match.scalar_one_or_none():
            continue

        pp = None
        match_type = None

        # 1) UTR exact match (also detect UTR collisions)
        if t.utr:
            pr = await db.execute(
                select(ProviderPayout).where(
                    ProviderPayout.organisation_id == organisation_id,
                    ProviderPayout.utr == t.utr,
                )
            )
            pps = list(pr.scalars().all())
            if len(pps) > 1:
                db.add(
                    ReconciliationException(
                        organisation_id=organisation_id,
                        import_id=import_id,
                        transaction_id=t.transaction_id,
                        kind="utr_collision",
                        severity="high",
                        status="open",
                        summary="Multiple payouts share same UTR",
                        details={"utr": t.utr, "provider_payout_ids": [str(x.provider_payout_id) for x in pps]},
                    )
                )
                exceptions += 1
                continue
            pp = pps[0] if pps else None
            if pp:
                match_type = "utr_exact"

        # 2) Provider payout ref exact
        if not pp and t.reference:
            pr = await db.execute(
                select(ProviderPayout).where(
                    ProviderPayout.organisation_id == organisation_id,
                    ProviderPayout.provider_payout_ref == t.reference,
                )
            )
            pp = pr.scalars().first()
            if pp:
                match_type = "ref_exact"

        # 3) Amount-only heuristic (Phase 2B baseline). Creates needs_review, not hard match.
        if not pp:
            # Join provider payouts to salary batch items to compare amounts.
            # NOTE: txn_date parsing is bank-specific; Phase 2B uses amount-only as needs_review.
            q = (
                select(ProviderPayout, SalaryBatchItem)
                .join(SalaryBatchItem, SalaryBatchItem.item_id == ProviderPayout.salary_batch_item_id)
                .where(
                    ProviderPayout.organisation_id == organisation_id,
                    func.abs(SalaryBatchItem.amount - t.amount) <= amount_tolerance,
                )
            )
            pr = await db.execute(q)
            rows = list(pr.all())
            if len(rows) == 1:
                pp = rows[0][0]
                match_type = "amount_only"
            elif len(rows) > 1:
                db.add(
                    ReconciliationException(
                        organisation_id=organisation_id,
                        import_id=import_id,
                        transaction_id=t.transaction_id,
                        kind="ambiguous_amount",
                        severity="medium",
                        status="open",
                        summary="Multiple payouts match by amount only",
                        details={
                            "amount": str(t.amount),
                            "candidates": [str(r[0].provider_payout_id) for r in rows[:50]],
                        },
                    )
                )
                exceptions += 1
                continue

        if pp:
            is_soft = match_type == "amount_only"
            db.add(
                ReconciliationMatch(
                    organisation_id=organisation_id,
                    transaction_id=t.transaction_id,
                    provider_payout_id=pp.provider_payout_id,
                    salary_batch_item_id=pp.salary_batch_item_id,
                    match_type=match_type or "unknown",
                    confidence=Decimal("60.00") if is_soft else Decimal("100.00"),
                    status="needs_review" if is_soft else "matched",
                    meta={"utr": t.utr, "reference": t.reference},
                )
            )
            matched += 1
            continue

        db.add(
            ReconciliationException(
                organisation_id=organisation_id,
                import_id=import_id,
                transaction_id=t.transaction_id,
                kind="unmatched",
                severity="medium",
                status="open",
                summary="Unmatched bank transaction",
                details={"utr": t.utr, "reference": t.reference, "amount": str(t.amount), "date": t.txn_date},
            )
        )
        exceptions += 1

    return {"matched": matched, "exceptions": exceptions}

