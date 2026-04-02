from decimal import Decimal
import numexpr as ne


def calculate_salary(template_components, component_map, ctc):

    values = {}
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

            # BUG FIX: was reading component.percentage_of (master SalaryComponent)
            # which is often None. Must prefer comp.percentage_of
            # (SalaryTemplateComponent override) first, then fall back to master.
            raw_base = comp.percentage_of or component.percentage_of or ""
            base_key = raw_base.lower()
            base = Decimal(str(values.get(base_key, 0)))
            percent = comp.percentage or Decimal("0")
            value = (base * percent) / Decimal("100")

        # ========================
        # FORMULA (SAFE)
        # ========================
        elif component.calc_type == "formula":

            # BUG FIX: was reading component.formula (master SalaryComponent).
            # Must prefer comp.formula (SalaryTemplateComponent override) first.
            formula = comp.formula or component.formula

            if not formula or not isinstance(formula, str):
                value = Decimal("0")
            else:
                try:
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
        # BUG FIX: store as float, not Decimal, so the return dict is
        # JSON-serialisable without needing jsonable_encoder everywhere.
        # ========================
        if component.component_type == "earning":
            earnings[component.name] = round(float(value), 2)
        else:
            deductions[component.name] = round(float(value), 2)

    # ========================
    # TOTALS
    # ========================
    gross = round(sum(earnings.values(), 0.0), 2)
    total_deductions = round(sum(deductions.values(), 0.0), 2)
    net = round(gross - total_deductions, 2)

    return {
        "earnings": earnings,
        "deductions": deductions,
        "gross_salary": gross,
        "total_deductions": total_deductions,
        "net_salary": net,
    }
