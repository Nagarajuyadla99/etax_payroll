from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from database import get_async_db
from utils.dependencies import get_admin_user

from services.salary_calculator import calculate_salary

from crud.salary_crud import (
    create_salary_template,
    get_salary_template,
    list_salary_templates,
    create_salary_component,
    list_salary_components,
    add_component_to_template,
    create_pay_structure,
    assign_salary_template,
    get_employee_salary_structure,
    list_employee_salary_structures,
    get_template_components,
    get_salary_component,
    update_template_component
)

from schemas.salary_schemas import (
    SalaryTemplateCreate,
    SalaryTemplateOut,
    SalaryComponentCreate,
    SalaryComponentOut,
    SalaryTemplateComponentCreate,
    SalaryTemplateComponentUpdate,
    SalaryTemplateComponentOut,
    EmployeeSalaryStructureCreate,
    EmployeeSalaryStructureOut,
    PayStructureCreate,
    PayStructureOut
)

router = APIRouter()

# ============================================================
# SALARY TEMPLATES
# ============================================================

@router.post("/templates/", response_model=SalaryTemplateOut, tags=["Salary"])
async def create_salary_template_route(
    template: SalaryTemplateCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user)
):
    return await create_salary_template(db, template)


@router.get("/templates/", response_model=list[SalaryTemplateOut], tags=["Salary"])
async def list_templates(
    db: AsyncSession = Depends(get_async_db)
):
    return await list_salary_templates(db)


@router.get("/templates/{template_id}", response_model=SalaryTemplateOut, tags=["Salary"])
async def get_salary_template_route(
    template_id: UUID,
    db: AsyncSession = Depends(get_async_db)
):
    template = await get_salary_template(db, template_id)

    if not template:
        raise HTTPException(status_code=404, detail="Salary template not found")

    return template


# ============================================================
# SALARY COMPONENTS
# ============================================================

@router.post("/components/", response_model=SalaryComponentOut, tags=["Salary"])
async def create_salary_component_route(
    component: SalaryComponentCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user)
):
    return await create_salary_component(db, component)


@router.get("/components/", response_model=list[SalaryComponentOut], tags=["Salary"])
async def list_salary_components_route(
    db: AsyncSession = Depends(get_async_db)
):
    return await list_salary_components(db)


# ============================================================
# TEMPLATE COMPONENTS
# ============================================================

@router.post("/templates/components", response_model=SalaryTemplateComponentOut, tags=["Salary"])
async def add_component_to_template_route(
    payload: SalaryTemplateComponentCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user)
):
    return await add_component_to_template(db, payload)


@router.put("/templates/components/{stc_id}", response_model=SalaryTemplateComponentOut, tags=["Salary"])
async def update_template_component_route(
    stc_id: UUID,
    payload: SalaryTemplateComponentUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user)
):
    comp = await update_template_component(db, stc_id, payload)

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
    current_user=Depends(get_admin_user)
):
    return await create_pay_structure(db, payload)


# ============================================================
# TEMPLATE SALARY CALCULATOR
# ============================================================

@router.get("/templates/{template_id}/calculate", tags=["Salary"])
async def calculate_template_salary(
    template_id: UUID,
    db: AsyncSession = Depends(get_async_db)
):

    components = await get_template_components(db, template_id)

    if not components:
        raise HTTPException(
            status_code=404,
            detail="No components found for this salary template"
        )

    component_map = {}

    for comp_link in components:

        comp = await get_salary_component(db, comp_link.component_id)

        if not comp:
            raise HTTPException(
                status_code=404,
                detail=f"Salary component {comp_link.component_id} not found"
            )

        component_map[comp_link.component_id] = comp

    preview_ctc = 500000

    result = calculate_salary(
        components,
        component_map,
        preview_ctc
    )

    return {
        "template_id": str(template_id),
        "ctc": preview_ctc,
        "salary_breakdown": result
    }


# ============================================================
# EMPLOYEE SALARY STRUCTURE
# ============================================================

@router.post(
    "/employee-salary-structures/",
    response_model=EmployeeSalaryStructureOut,
    tags=["Salary"]
)
async def assign_salary_template_route(
    payload: EmployeeSalaryStructureCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user)
):
    return await assign_salary_template(db, payload)


@router.get(
    "/employee-salary-structures/",
    response_model=list[EmployeeSalaryStructureOut],
    tags=["Salary"]
)
async def list_employee_salary_structures_route(
    db: AsyncSession = Depends(get_async_db)
):
    return await list_employee_salary_structures(db)


@router.get(
    "/employee-salary-structures/{employee_id}",
    response_model=EmployeeSalaryStructureOut,
    tags=["Salary"]
)
async def get_employee_salary_structure_route(
    employee_id: UUID,
    db: AsyncSession = Depends(get_async_db)
):

    data = await get_employee_salary_structure(db, employee_id)

    if not data:
        raise HTTPException(status_code=404, detail="Salary structure not found")

    return data


# ============================================================
# EMPLOYEE SALARY CALCULATOR
# ============================================================

@router.get("/employee-salary/{employee_id}/calculate", tags=["Salary"])
async def calculate_employee_salary(
    employee_id: UUID,
    db: AsyncSession = Depends(get_async_db)
):

    emp_salary = await get_employee_salary_structure(db, employee_id)

    if not emp_salary:
        raise HTTPException(
            status_code=404,
            detail="Salary structure not found"
        )

    components = await get_template_components(db, emp_salary.template_id)

    component_map = {}

    for comp_link in components:

        comp = await get_salary_component(db, comp_link.component_id)

        if not comp:
            raise HTTPException(
                status_code=404,
                detail=f"Component {comp_link.component_id} not found"
            )

        component_map[comp_link.component_id] = comp

    result = calculate_salary(
        components,
        component_map,
        emp_salary.ctc
    )

    return {
        "employee_id": str(employee_id),
        "template_id": str(emp_salary.template_id),
        "ctc": emp_salary.ctc,
        "salary_breakdown": result
    }