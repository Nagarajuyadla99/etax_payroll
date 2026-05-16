from __future__ import annotations

from services.bank_file_plugins.base import BankFileBuildResult, BankFilePlugin, BankFileRow


class HdfcSalaryPlugin(BankFilePlugin):
    bank_code = "HDFC"

    def build(self, rows: list[BankFileRow], *, config: dict) -> BankFileBuildResult:
        header = config.get("header_line") or (
            "Transaction Type,Beneficiary Code,Beneficiary Account Number,IFSC,Transaction Amount,Beneficiary Name"
        )
        lines = []
        for r in rows:
            code = (r.extra or {}).get("beneficiary_code", str(r.employee_id)[:20])
            lines.append(
                f"I,{code},{r.account_number},{r.ifsc},{r.amount},{r.account_holder_name}"
            )
        return BankFileBuildResult(
            header=header,
            lines=lines,
            validation_report={"plugin": "HDFC", "row_count": len(lines)},
        )
