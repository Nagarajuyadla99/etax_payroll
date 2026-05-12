from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status


def require_same_org(*, org_id: UUID | None, resource_org_id: UUID | None, not_found_msg: str = "Not found") -> None:
    """
    Consistent multi-tenant guard:
    - If org_id missing -> 400 (caller didn't resolve auth tenant)
    - If resource missing org or mismatch -> 404 (avoid leaking existence across tenants)
    """
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    if not resource_org_id or str(resource_org_id) != str(org_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found_msg)

