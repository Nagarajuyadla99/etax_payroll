from decimal import Decimal
import numexpr as ne


def calculate_salary(template_components, component_map, ctc):

    values = {}

    # 🔧 Use lowercase for consistency in formulas
    values["ctc"] = float(ctc)

    earnings = {}
    deductions = {}

    for comp in template_components:

        component = component_map[comp.component_id]

        value = Decimal("0")

        # ========================
        # FIXED
        # ========================
        if component.calc_type == "fixed":

            value = comp.amount or Decimal("0")

        # ========================
        # PERCENTAGE
        # ========================
        elif component.calc_type == "percentage":

            base_key = (component.percentage_of or "").lower()
            base = Decimal(str(values.get(base_key, 0)))

            percent = comp.percentage or Decimal("0")

            value = (base * percent) / Decimal("100")

        # ========================
        # FORMULA (SAFE)
        # ========================
        elif component.calc_type == "formula":

            formula = component.formula

            if not formula or not isinstance(formula, str):
                value = Decimal("0")
            else:
                try:
                    # convert all values to float for numexpr
                    safe_values = {k: float(v) for k, v in values.items()}

                    result = ne.evaluate(formula, local_dict=safe_values)

                    value = Decimal(str(result))

                except Exception as e:
                    print(f"Formula error in {component.name}: {e}")
                    value = Decimal("0")

        # ========================
        # STORE VALUE
        # ========================
        key = component.name.lower()
        values[key] = float(value)

        # ========================
        # CLASSIFY
        # ========================
        if component.component_type == "earning":
            earnings[component.name] = value
        else:
            deductions[component.name] = value

    # ========================
    # TOTALS
    # ========================
    gross = sum(earnings.values(), Decimal("0"))
    total_deductions = sum(deductions.values(), Decimal("0"))
    net = gross - total_deductions

    return {
        "earnings": earnings,
        "deductions": deductions,
        "gross_salary": gross,
        "total_deductions": total_deductions,
        "net_salary": net
    }