from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Set

from fastapi import Depends, HTTPException, status

from utils.dependencies import get_current_user


ROLE_ADMIN = "admin"
ROLE_HR = "hr"
ROLE_EMPLOYEE = "employee"


# Actions are intentionally string-based to keep this extensible and low-friction.
ACTION_DASHBOARD_VIEW = "dashboard:view"
ACTION_EMPLOYEE_READ = "employees:read"
ACTION_EMPLOYEE_CREATE = "employees:create"
ACTION_EMPLOYEE_EDIT = "employees:edit"
ACTION_EMPLOYEE_DELETE = "employees:delete"
ACTION_PAYROLL_RUN = "payroll:run"
ACTION_PAYSLIP_DOWNLOAD_ALL = "payslip:download:all"
ACTION_PAYSLIP_DOWNLOAD_OWN = "payslip:download:own"


ROLE_PERMISSIONS: dict[str, Set[str]] = {
    ROLE_ADMIN: {
        "*",
    },
    ROLE_HR: {
        ACTION_DASHBOARD_VIEW,
        ACTION_EMPLOYEE_READ,
        ACTION_EMPLOYEE_CREATE,
        ACTION_EMPLOYEE_EDIT,
        ACTION_PAYROLL_RUN,
        ACTION_PAYSLIP_DOWNLOAD_ALL,
    },
    ROLE_EMPLOYEE: {
        ACTION_DASHBOARD_VIEW,
        ACTION_PAYSLIP_DOWNLOAD_OWN,
    },
}


def get_principal_role(principal) -> str:
    """
    Normalize role across User vs Employee principals.
    - Employee model doesn't have a role column; employees are treated as ROLE_EMPLOYEE.
    - User model is expected to have .role (fallbacks preserved for older rows).
    """
    # Employee tokens return an Employee instance from get_current_user
    if getattr(principal, "employee_id", None) is not None and getattr(principal, "user_id", None) is None:
        return ROLE_EMPLOYEE

    role = getattr(principal, "role", None)
    if role:
        return str(role).lower()

    # Back-compat: if the system used is_system_admin before role existed.
    if getattr(principal, "is_system_admin", False):
        return ROLE_ADMIN

    return ROLE_ADMIN


def has_permission(principal, action: str) -> bool:
    role = get_principal_role(principal)
    perms = ROLE_PERMISSIONS.get(role, set())
    return ("*" in perms) or (action in perms)


def require_roles(allowed_roles: Iterable[str]):
    allowed = {str(r).lower() for r in allowed_roles}

    async def _dep(current_user=Depends(get_current_user)):
        role = get_principal_role(current_user)
        if role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return _dep


def require_self(target_user_id_param: str = "user_id"):
    """
    Enforces that the UUID path/query parameter matches the authenticated employee/user id.
    Designed primarily for employee self-service endpoints.
    """

    async def _dep(current_user=Depends(get_current_user), **kwargs):
        target = kwargs.get(target_user_id_param)
        if target is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Server misconfiguration: missing '{target_user_id_param}'",
            )

        # Employee principal self-check
        current_employee_id = getattr(current_user, "employee_id", None)
        if current_employee_id is not None:
            if str(current_employee_id) != str(target):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Employees may only access their own resources",
                )
            return current_user

        # User principal self-check
        current_user_id = getattr(current_user, "user_id", None)
        if current_user_id is not None and str(current_user_id) == str(target):
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only access your own resources",
        )

    return _dep

