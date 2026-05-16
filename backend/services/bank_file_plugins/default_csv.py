from __future__ import annotations

from services.bank_file_plugins.base import BankFileBuildResult, BankFilePlugin, BankFileRow


class DefaultCsvPlugin(BankFilePlugin):
    bank_code = "DEFAULT"

    def build(self, rows: list[BankFileRow], *, config: dict) -> BankFileBuildResult:
        header = config.get("header_line") or "employee_id,account_number,ifsc,amount,account_holder_name"
        lines = [
            f"{r.employee_id},{r.account_number},{r.ifsc},{r.amount},{r.account_holder_name}"
            for r in rows
        ]
        return BankFileBuildResult(
            header=header,
            lines=lines,
            validation_report={"plugin": "DEFAULT", "row_count": len(lines)},
        )
