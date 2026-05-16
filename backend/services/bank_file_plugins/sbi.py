from __future__ import annotations

from services.bank_file_plugins.base import BankFileBuildResult, BankFilePlugin, BankFileRow


class SbiSalaryPlugin(BankFilePlugin):
    """SBI bulk payment CSV (pipe-delimited variant)."""

    bank_code = "SBI"

    def build(self, rows: list[BankFileRow], *, config: dict) -> BankFileBuildResult:
        header = config.get("header_line") or (
            "Beneficiary Name|Account Number|IFSC|Amount|Payment Reference"
        )
        lines = []
        for r in rows:
            ref = (r.extra or {}).get("payment_ref", str(r.employee_id))
            lines.append(
                f"{r.account_holder_name}|{r.account_number}|{r.ifsc}|{r.amount}|{ref}"
            )
        return BankFileBuildResult(
            header=header,
            lines=lines,
            validation_report={"plugin": "SBI", "delimiter": "|", "row_count": len(lines)},
        )
