# payroll_system/api/salary_routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_async_db
from schemas.salary_schemas import (
    SalaryTemplateCreate, SalaryTemplateOut,
    SalaryComponentCreate, SalaryComponentOut
)
from crud.salary_crud import (
    create_salary_template, get_salary_template,
    create_salary_component, list_salary_components
)
from utils.dependencies import get_admin_user

router = APIRouter()

@router.post("/templates/", response_model=SalaryTemplateOut, tags=["Salary"])
async def create_salary_template_route(
    template: SalaryTemplateCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user)
):
    return await create_salary_template(db, template)

@router.get("/templates/{template_id}", response_model=SalaryTemplateOut, tags=["Salary"])
async def get_salary_template_route(template_id: str, db: AsyncSession = Depends(get_async_db)):
    template = await get_salary_template(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Salary template not found")
    return template

@router.post("/components/", response_model=SalaryComponentOut, tags=["Salary"])
async def create_salary_component_route(
    component: SalaryComponentCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(get_admin_user)
):
    return await create_salary_component(db, component)

@router.get("/components/", response_model=list[SalaryComponentOut], tags=["Salary"])
async def list_salary_components_route(db: AsyncSession = Depends(get_async_db)):
    return await list_salary_components(db)