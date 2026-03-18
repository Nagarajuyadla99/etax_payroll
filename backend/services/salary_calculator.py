from decimal import Decimal
import numexpr as ne

def calculate_salary(template_components, component_map, ctc):

    values = {}

    values["CTC"] = Decimal(ctc)

    earnings = {}
    deductions = {}

    for comp in template_components:

        component = component_map[comp.component_id]

        value = Decimal("0")

        if component.calc_type == "fixed":

            value = comp.amount or Decimal("0")

        elif component.calc_type == "percentage":

            base = values.get(component.percentage_of, Decimal("0"))

            value = (base * (comp.percentage or Decimal("0"))) / 100

        elif component.calc_type == "formula":

            result = ne.evaluate(component.formula, local_dict=values)

            value = Decimal(str(result))

        values[component.name] = value

        if component.component_type == "earning":
            earnings[component.name] = value
        else:
            deductions[component.name] = value

    gross = sum(earnings.values())
    total_deductions = sum(deductions.values())
    net = gross - total_deductions

    return {
        "earnings": earnings,
        "deductions": deductions,
        "gross_salary": gross,
        "total_deductions": total_deductions,
        "net_salary": net
    }