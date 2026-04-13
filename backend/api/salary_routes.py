from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder   # BUG FIX: was missing; needed for Decimal → float in raw dicts
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from database import get_async_db
from utils.dependencies import get_admin_user
from utils.rbac import require_roles

from services.salary_calculator import calculate_salary

from crud.salary_crud import (
    create_salary_template,
    get_salary_template,
    list_salary_templates,
    create_salary_component,
    list_salary_components,
    update_salary_component,
    add_component_to_template,
    create_pay_structure,
    assign_salary_template,
    get_employee_salary_structure,
    list_employee_salary_structures,
    get_template_components,
    get_salary_component,
    update_template_component,
)

from schemas.salary_schemas import (
    SalaryTemplateCreate,
    SalaryTemplateOut,
    SalaryComponentCreate,
    SalaryComponentOut,
    SalaryComponentUpdate,
    SalaryTemplateComponentCreate,
    SalaryTemplateComponentUpdate,
    SalaryTemplateComponentOut,
    EmployeeSalaryStructureCreate,
    EmployeeSalaryStructureOut,
    PayStructureCreate,
    PayStructureOut,
)

router = APIRouter()


# ============================================================
# SALARY TEMPLATES
# ============================================================

@router.post("/templates/", response_model=SalaryTemplateOut, tags=["Salary"])
async def create_salary_template_route(
    template: SalaryTemplateCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user),
):
    # BUG FIX (all mutating routes): CRUD raises ValueError for business-rule
    # violations (duplicate name, invalid template, etc.).  Without a try/except
    # those bubble up as unhandled 500s instead of meaningful 400/409 responses.
    try:
        return await create_salary_template(db, template, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/templates/", response_model=list[SalaryTemplateOut], tags=["Salary"])
async def list_templates(
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user),
):
    return await list_salary_templates(db, current_user)


@router.get("/templates/{template_id}", response_model=SalaryTemplateOut, tags=["Salary"])
async def get_salary_template_route(
    template_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user),
):
    template = await get_salary_template(db, template_id, current_user)
    if not template:
        raise HTTPException(404, "Salary template not found")
    return template


# ============================================================
# SALARY COMPONENTS
# ============================================================

@router.post("/components/", response_model=SalaryComponentOut, tags=["Salary"])
async def create_salary_component_route(
    component: SalaryComponentCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin"])),
):
    try:
        return await create_salary_component(db, component, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/components/", response_model=list[SalaryComponentOut], tags=["Salary"])
async def list_salary_components_route(
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    return await list_salary_components(db, current_user)


@router.put("/components/{component_id}", response_model=SalaryComponentOut, tags=["Salary"])
async def update_salary_component_route(
    component_id: UUID,
    payload: SalaryComponentUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr"])),
):
    try:
        comp = await update_salary_component(db, component_id, payload, current_user)
        if not comp:
            raise HTTPException(status_code=404, detail="Salary component not found")
        return comp
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================
# TEMPLATE COMPONENTS
# ============================================================

@router.post("/templates/components", response_model=SalaryTemplateComponentOut, tags=["Salary"])
async def add_component_to_template_route(
    payload: SalaryTemplateComponentCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user),
):
    try:
        return await add_component_to_template(db, payload, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/templates/{template_id}/components", response_model=list[SalaryTemplateComponentOut], tags=["Salary"])
async def get_template_components_route(
    template_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user),
):
    components = await get_template_components(db, template_id, current_user)
    if not components:
        return []
    return components


@router.put("/templates/components/{stc_id}", response_model=SalaryTemplateComponentOut, tags=["Salary"])
async def update_template_component_route(
    stc_id: UUID,
    payload: SalaryTemplateComponentUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user),
):
    comp = await update_template_component(db, stc_id, payload, current_user)
    if not comp:
        raise HTTPException(status_code=404, detail="Template component not found")
    return comp


# ============================================================
# PAY STRUCTURES
# ============================================================

@router.post("/pay-structures", response_model=PayStructureOut, tags=["Salary"])
async def create_pay_structure_route(
    payload: PayStructureCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user),
):
    try:
        return await create_pay_structure(db, payload, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================
# TEMPLATE SALARY CALCULATOR
# ============================================================

@router.get("/templates/{template_id}/calculate", tags=["Salary"])
async def calculate_template_salary(
    template_id: UUID,
    ctc: float,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user),
):
    template = await get_salary_template(db, template_id, current_user)
    if not template:
        raise HTTPException(403, "Unauthorized access")

    components = await get_template_components(db, template_id, current_user)
    if not components:
        raise HTTPException(404, "No components found")

    component_map = {}
    for comp_link in components:
        comp = await get_salary_component(db, comp_link.component_id, current_user)
        if not comp:
            raise HTTPException(
                status_code=404,
                detail=f"Component {comp_link.component_id} not found",
            )
        component_map[comp_link.component_id] = comp

    result = calculate_salary(components, component_map, ctc)

    # BUG FIX: calculate_salary previously returned Decimal values inside the
    # dict.  FastAPI only auto-converts Decimal when a response_model is set;
    # raw dict returns bypass that pipeline and raise
    # "Object of type Decimal is not JSON serializable".
    # jsonable_encoder converts any remaining Decimal/UUID/date to JSON-safe types.
    return jsonable_encoder({
        "template_id": str(template_id),
        "ctc": ctc,
        "salary_breakdown": result,
    })


# ============================================================
# EMPLOYEE SALARY STRUCTURE
# ============================================================

@router.post(
    "/employee-salary-structures/",
    response_model=EmployeeSalaryStructureOut,
    tags=["Salary"],
)
async def assign_salary_template_route(
    payload: EmployeeSalaryStructureCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user),
):
    try:
        return await assign_salary_template(db, payload, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/employee-salary-structures/",
    response_model=list[EmployeeSalaryStructureOut],
    tags=["Salary"],
)
async def list_employee_salary_structures_route(
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user),
):
    return await list_employee_salary_structures(db, current_user)


@router.get(
    "/employee-salary-structures/{employee_id}",
    response_model=EmployeeSalaryStructureOut,
    tags=["Salary"],
)
async def get_employee_salary_structure_route(
    employee_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user),
):
    data = await get_employee_salary_structure(db, employee_id, current_user)
    if not data:
        raise HTTPException(404, "Salary structure not found")
    return data


# ============================================================
# EMPLOYEE SALARY CALCULATOR
# ============================================================

@router.get("/employee-salary/{employee_id}/calculate", tags=["Salary"])
async def calculate_employee_salary(
    employee_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user),
):
    emp_salary = await get_employee_salary_structure(db, employee_id, current_user)
    if not emp_salary:
        raise HTTPException(
            status_code=404,
            detail="Salary structure not found or unauthorized",
        )

    template = await get_salary_template(db, emp_salary.template_id, current_user)
    if not template:
        raise HTTPException(
            status_code=403,
            detail="Template does not belong to your organisation",
        )

    components = await get_template_components(db, emp_salary.template_id, current_user)
    if not components:
        raise HTTPException(
            status_code=404,
            detail="No components found for template",
        )

    component_map = {}
    for comp_link in components:
        comp = await get_salary_component(db, comp_link.component_id, current_user)
        if not comp:
            raise HTTPException(
                status_code=404,
                detail=f"Component {comp_link.component_id} not found",
            )
        component_map[comp_link.component_id] = comp

    result = calculate_salary(components, component_map, emp_salary.ctc)

    # BUG FIX: same Decimal serialisation fix as calculate_template_salary.
    # Also wraps emp_salary.ctc (Numeric/Decimal from DB) with float().
    return jsonable_encoder({
        "employee_id": str(employee_id),
        "template_id": str(emp_salary.template_id),
        "ctc": float(emp_salary.ctc),
        "salary_breakdown": result,
    })
