# payroll_system/api/auth_routes.py

from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta
import os
import httpx
import secrets
from sqlalchemy.future import select
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy import select as sa_select
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from models.user_models import User
from utils.auth import create_access_token, verify_password, hash_password
from utils.email_service import send_reset_email
from schemas.user_schemas import UserCreate, UserRead,ForgotPasswordRequest,ResetPasswordRequest
from crud.user_crud import (
    create_user,
    get_user_by_email,
    get_user_by_username,
)
from database import get_async_db
from utils.auth import create_access_token, verify_password
from models.org_models import Organisation
from models.employee_model import Employee

router = APIRouter()

# ---------------------------
# ENV CONFIG
# ---------------------------

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60)
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


# ==========================================================
# LOGIN (JWT)
# ==========================================================

@router.post("/login", tags=["Authentication"])
async def login(
    username: str = Form(...),
    password: str = Form(...),
    db: AsyncSession = Depends(get_async_db)
):

    user = await get_user_by_username(db, username)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # verify password
    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # check user status
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    token = create_access_token(
    data={
        "sub": user.username,
        "organisation_id": str(user.organisation_id),
        "role": (getattr(user, "role", None) or ("admin" if getattr(user, "is_system_admin", False) else "admin")),
    },
    expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
)

    return {
        "access_token": token,
        "token_type": "bearer"
    }


# ==========================================================
# UNIFIED LOGIN (JSON) — additive, backward compatible
# ==========================================================
class UnifiedLoginRequest(BaseModel):
    identifier: str
    password: str


@router.post("/login-unified", tags=["Authentication"])
async def login_unified(
    payload: UnifiedLoginRequest,
    db: AsyncSession = Depends(get_async_db),
):
    identifier = payload.identifier.strip()
    password = payload.password

    if not identifier or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identifier and password are required",
        )

    # If identifier looks like email -> employee login flow (same as /employee-auth/login)
    if "@" in identifier:
        result = await db.execute(
            sa_select(Employee).where(Employee.email == identifier)
        )
        employee = result.scalar_one_or_none()

        if not employee or not employee.password_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not verify_password(password, employee.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        token = create_access_token({
            "sub": str(employee.employee_id),
            "type": "employee",
            "role": "employee",
        })

        return {
            "message": "Login successful",
            "access_token": token,
            "token_type": "bearer",
            "employee": {
                "employee_id": str(employee.employee_id),
                "email": employee.email,
                "name": employee.first_name,
            },
        }

    # Else -> admin login flow (same as /auth/login)
    user = await get_user_by_username(db, identifier)
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    token = create_access_token(
        data={
            "sub": user.username,
            "organisation_id": str(user.organisation_id),
            "role": (getattr(user, "role", None) or ("admin" if getattr(user, "is_system_admin", False) else "admin")),
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return {
        "access_token": token,
        "token_type": "bearer",
    }


# ==========================================================
# REGISTER USER
# ==========================================================

@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    tags=["Authentication"]
)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_async_db)
):

    # check email
    existing_email = await get_user_by_email(db, user_in.email)
    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # check username
    existing_user = await get_user_by_username(db, user_in.username)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username already taken"
        )

    # -------------------------
    # CREATE ORGANISATION
    # -------------------------

    organisation = Organisation(
        name=user_in.organisation_name
    )

    db.add(organisation)

    # generate organisation_id
    await db.flush()

    # -------------------------
    # CREATE USER (ADMIN)
    # -------------------------

    user = User(
        username=user_in.username,
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        full_name=user_in.full_name,
        organisation_id=organisation.organisation_id,
        role="admin",
        is_system_admin=True,
    )

    db.add(user)

    await db.commit()
    await db.refresh(user)

    return user


# ==========================================================
# GOOGLE LOGIN REDIRECT
# ==========================================================

@router.get("/google/login", tags=["Authentication"])
async def google_login():

    url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        "&response_type=code"
        "&scope=openid%20email%20profile"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        "&access_type=offline"
        "&prompt=consent"
    )

    return RedirectResponse(url=url)


# ==========================================================
# GOOGLE CALLBACK
# ==========================================================

@router.get("/google/callback", tags=["Authentication"])
async def google_callback(
    code: str,
    db: AsyncSession = Depends(get_async_db)
):

    token_url = "https://oauth2.googleapis.com/token"

    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(token_url, data=data)
        resp.raise_for_status()
        tokens = resp.json()

    id_token_str = tokens.get("id_token")

    if not id_token_str:
        raise HTTPException(
            status_code=400,
            detail="Google did not return id_token"
        )

    try:
        payload = google_id_token.verify_oauth2_token(
            id_token_str,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid Google ID Token"
        )

    email = payload.get("email")

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Google account has no email"
        )

    user = await get_user_by_email(db, email)

    # create user if not exists
    if not user:

        temp_password = os.urandom(12).hex()

        user_in = UserCreate(
            username=email,
            email=email,
            password=temp_password
        )

        user = await create_user(db, user_in)

    # generate JWT token
    token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    redirect_url = f"{FRONTEND_URL}/auth/google/callback?token={token}"

    return RedirectResponse(url=redirect_url)




@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_async_db)
):
    email = payload.email

    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        return {"message": "If the email exists, a reset link was sent"}

    token = secrets.token_urlsafe(32)

    user.reset_token = token
    user.reset_token_expiry = datetime.utcnow() + timedelta(minutes=30)

    await db.commit()

    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"

    await send_reset_email(email, reset_link)

    return {"message": "Reset link sent to your email"}

@router.post("/reset-password", tags=["Authentication"])
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_async_db)
):

    token = payload.token
    new_password = payload.new_password

    result = await db.execute(
        select(User).filter(User.reset_token == token)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")

    if not user.reset_token_expiry or user.reset_token_expiry < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token expired")

    user.password_hash = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expiry = None

    await db.commit()

    return {"message": "Password reset successful"}