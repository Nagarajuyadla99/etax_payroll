from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from sqlalchemy import select   
from models.org_models import Organisation
from database import get_async_db
from crud.org_crud import create_organisation, get_organisation
from schemas.org_schemas import OrganisationCreate, OrganisationOut
from models.user_models import User
from utils.dependencies import get_current_user
router = APIRouter()    


@router.post(
    "/",
    response_model=OrganisationOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_org(
    data: OrganisationCreate,
    db: AsyncSession = Depends(get_async_db),
):
    org = await create_organisation(db, data)
    return org


@router.get(
    "/{org_id}",
    response_model=OrganisationOut,
)
async def read_org(
    org_id: UUID,
    db: AsyncSession = Depends(get_async_db),
):
    org = await get_organisation(db, org_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organisation not found",
        )
    return org
@router.get("/me")
async def get_my_org(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Organisation).where(
            Organisation.organisation_id == current_user.organisation_id
        )
    )
    org = result.scalar_one_or_none()

    if not org:
        raise HTTPException(404, "Organisation not found")

    return {
        "id": str(org.organisation_id),
        "name": org.name,
        "is_setup_complete": org.is_setup_complete
    }