from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from crud.org_crud import create_organisation, get_organisation
from database import get_async_db
from schemas.org_schemas import OrganisationCreate, OrganisationOut
from schemas.me_schemas import OrganisationMeSummary
from utils.dependencies import AuthSubject, get_current_auth, resolve_organisation_id

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


# Static path MUST be registered before /{org_id} or "me" is parsed as a UUID (422).
@router.get(
    "/me",
    response_model=OrganisationMeSummary,
)
async def get_my_org(
    db: AsyncSession = Depends(get_async_db),
    auth: AuthSubject = Depends(get_current_auth),
):
    principal = auth.principal
    org_id = resolve_organisation_id(principal, auth.payload)
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organisation context missing for this account",
        )

    org = await get_organisation(db, org_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organisation not found",
        )

    return OrganisationMeSummary(
        id=org.organisation_id,
        name=org.name,
        is_setup_complete=bool(org.is_setup_complete),
    )


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
