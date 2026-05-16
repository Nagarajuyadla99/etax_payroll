from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_db
from services.dashboard_service import get_dashboard_overview
from utils.rbac import require_roles

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/overview")
async def dashboard_overview(
    db: AsyncSession = Depends(get_async_db),
    current_user=Depends(require_roles(["admin", "hr", "finance"])),
):
    return await get_dashboard_overview(
        db=db,
        organisation_id=current_user.organisation_id,
    )
