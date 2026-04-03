import csv
import io
from uuid import UUID
from datetime import datetime

from openpyxl import load_workbook
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from schemas.employee_schemas import EmployeeCreate
from models.employee_model import Employee


# =========================
# HELPER FUNCTION
# =========================
def parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except Exception:
        return None


# =========================
# BULK CREATE FUNCTION
# =========================
async def bulk_create_employees(
    db: AsyncSession,
    file_content,
    file_type,
    organisation_id
):

    rows = []

    # =========================
    # CSV PARSER
    # =========================
    if file_type == "csv":
        reader = csv.DictReader(io.StringIO(file_content.decode("utf-8")))
        rows = list(reader)

    # =========================
    # EXCEL PARSER
    # =========================
    elif file_type == "xlsx":
        workbook = load_workbook(io.BytesIO(file_content))
        sheet = workbook.active

        headers = [cell.value for cell in sheet[1]]

        for row in sheet.iter_rows(min_row=2, values_only=True):
            rows.append(dict(zip(headers, row)))

    created = 0
    errors = []

    # =========================
    # MAIN LOOP
    # =========================
    for idx, row in enumerate(rows, start=1):
        try:
            # =========================
            # SAFE TYPE CONVERSIONS
            # =========================
            def safe_uuid(val):
                try:
                    return UUID(val) if val else None
                except Exception:
                    return None

            def safe_float(val):
                try:
                    return float(val) if val else None
                except Exception:
                    return None

            def safe_bool(val):
                return str(val).lower() == "true"

            row["department_id"] = safe_uuid(row.get("department_id"))
            row["designation_id"] = safe_uuid(row.get("designation_id"))
            row["location_id"] = safe_uuid(row.get("location_id"))
            row["manager_id"] = safe_uuid(row.get("manager_id"))
            row["pay_structure_id"] = safe_uuid(row.get("pay_structure_id"))

            row["date_of_birth"] = parse_date(row.get("date_of_birth"))
            row["date_of_joining"] = parse_date(row.get("date_of_joining"))
            row["date_of_leaving"] = parse_date(row.get("date_of_leaving"))

            row["annual_ctc"] = safe_float(row.get("annual_ctc"))
            row["is_active"] = safe_bool(row.get("is_active"))

            # =========================
            # DUPLICATE CHECK
            # =========================
            result = await db.execute(
                select(Employee).where(
                    Employee.organisation_id == organisation_id,
                    Employee.employee_code == row.get("employee_code")
                )
            )

            if result.scalar_one_or_none():
                errors.append({
                    "row": idx,
                    "error": f"Duplicate employee_code: {row.get('employee_code')}"
                })
                continue

            # =========================
            # VALIDATION USING SCHEMA
            # =========================
            employee_data = EmployeeCreate(**row)

            data = employee_data.dict(by_alias=True)
            data["organisation_id"] = organisation_id

            employee = Employee(**data)

            db.add(employee)
            created += 1

        except Exception as e:
            errors.append({
                "row": idx,
                "error": str(e)
            })
            continue

    # =========================
    # FINAL COMMIT
    # =========================
    await db.commit()

    return {
        "total_rows": len(rows),
        "inserted": created,
        "failed": len(errors),
        "errors": errors
    }