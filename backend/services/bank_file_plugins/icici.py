from __future__ import annotations

from services.bank_file_plugins.base import BankFileBuildResult, BankFilePlugin, BankFileRow


class IciciSalaryPlugin(BankFilePlugin):
    bank_code = "ICICI"

    def build(self, rows: list[BankFileRow], *, config: dict) -> BankFileBuildResult:
        header = config.get("header_line") or (
            "PYMT_PROD_TYPE_CODE,PYMT_MODE,ACCOUNT_NO,IFSC,AMOUNT,BENEFICIARY_NAME,NARRATION"
        )
        mode = config.get("payment_mode", "NEFT")
        lines = []
        for r in rows:
            narration = (r.extra or {}).get("narration", "Salary")
            lines.append(
                f"SAL,{mode},{r.account_number},{r.ifsc},{r.amount},{r.account_holder_name},{narration}"
            )
        return BankFileBuildResult(
            header=header,
            lines=lines,
            validation_report={"plugin": "ICICI", "row_count": len(lines)},
        )
