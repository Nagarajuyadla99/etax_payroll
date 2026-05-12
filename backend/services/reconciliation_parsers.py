from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from decimal import Decimal


UTR_RE = re.compile(r"\b([A-Z0-9]{10,22})\b")


@dataclass(frozen=True)
class ParsedTransaction:
    txn_date: str
    txn_type: str  # DR/CR
    amount: Decimal
    description: str
    reference: str | None = None
    utr: str | None = None
    raw: dict | None = None


def parse_csv_statement(text: str) -> list[ParsedTransaction]:
    rows = list(csv.DictReader(text.splitlines()))
    out: list[ParsedTransaction] = []
    for r in rows:
        date = (r.get("date") or r.get("txn_date") or r.get("value_date") or "").strip()
        desc = (r.get("description") or r.get("narration") or r.get("particulars") or "").strip()
        ref = (r.get("reference") or r.get("utr") or r.get("ref") or r.get("chq_no") or "").strip() or None
        amt_s = (r.get("amount") or r.get("txn_amount") or r.get("debit") or r.get("credit") or "0").strip()
        txn_type = "DR"
        if r.get("credit") and not r.get("debit"):
            txn_type = "CR"
        if r.get("type"):
            txn_type = str(r.get("type")).upper()

        try:
            amt = Decimal(amt_s.replace(",", ""))
        except Exception:
            amt = Decimal("0")

        utr = None
        m = UTR_RE.search(ref or "") or UTR_RE.search(desc)
        if m:
            utr = m.group(1)

        out.append(
            ParsedTransaction(
                txn_date=date or "unknown",
                txn_type=txn_type if txn_type in {"DR", "CR"} else "DR",
                amount=amt,
                description=desc,
                reference=ref,
                utr=utr,
                raw=r,
            )
        )
    return out


def parse_mt940(text: str) -> list[ParsedTransaction]:
    """
    Stub MT940 parser (Phase 2B baseline). Returns empty for now unless lines contain :61: records.
    """
    out: list[ParsedTransaction] = []
    for line in text.splitlines():
        if line.startswith(":61:"):
            # Minimal extraction: date + debit/credit + amount
            # Real MT940 parsing will be expanded later.
            out.append(
                ParsedTransaction(
                    txn_date=line[4:10],
                    txn_type="DR" if "D" in line[10:12] else "CR",
                    amount=Decimal("0"),
                    description=line,
                    raw={"mt940": line},
                )
            )
    return out

