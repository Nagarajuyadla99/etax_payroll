from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from database import get_async_db
from models.employee_model import Employee
from utils.auth import verify_password, create_access_token

router = APIRouter(
    prefix="/employee-auth",
    tags=["Employee Auth"]
)


# =========================
# REQUEST SCHEMA
# =========================
class EmployeeLoginRequest(BaseModel):
    email: EmailStr
    password: str


# =========================
# LOGIN API
# =========================
@router.post("/login")
async def employee_login(
    payload: EmployeeLoginRequest,
    db: AsyncSession = Depends(get_async_db)
):
    # ------------------------
    # FETCH EMPLOYEE
    # ------------------------
    result = await db.execute(
        select(Employee).where(Employee.email == payload.email)
    )
    employee = result.scalar_one_or_none()

    # ------------------------
    # VALIDATE
    # ------------------------
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not employee.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password not set"
        )

    # ------------------------
    # VERIFY PASSWORD
    # ------------------------
    if not verify_password(payload.password, employee.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # ------------------------
    # GENERATE TOKEN
    # ------------------------
    token = create_access_token({
        "sub": str(employee.employee_id),
        "type": "employee"
    })

    # ------------------------
    # RESPONSE
    # ------------------------
    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "employee": {
            "employee_id": str(employee.employee_id),
            "email": employee.email,
            "name": employee.first_name
        }
    }