from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from database import get_async_db
from crud.org_crud import create_organisation, get_organisation
from schemas.org_schemas import OrganisationCreate, OrganisationOut

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