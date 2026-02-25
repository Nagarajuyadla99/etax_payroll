# payroll_system/api/auth_routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta
import os, httpx
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from schemas.user_schemas import UserCreate, UserRead
from crud.user_crud import create_user, get_user_by_email, get_user_by_username
from database import get_async_db
from utils.auth import create_access_token, verify_password, hash_password

router = APIRouter()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))


# ---------------------------
# JWT Login (accepts form data)
# ---------------------------
@router.post("/login", tags=["Authentication"])
async def login(
    username: str = Form(...),
    password: str = Form(...),
    db: AsyncSession = Depends(get_async_db)
):
    # Log login attempt with username
    print(f"🔍 Login attempt for username: {username}")

    # Fetch user by username from database
    user = await get_user_by_username(db, username)
    if not user:
        print("❌ No user found with that username.")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Verify provided password against stored hash
    password_verified = verify_password(password, user.password_hash)
    print(f"🔒 Password verification result: {password_verified}")

    if not password_verified:
        print("❌ Password verification failed.")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Log success, create JWT token
    print(f"✅ User {username} authenticated, generating token.")
    token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    print(f"🔑 Token generated for user: {user.username}")

    # Return token response
    return {"access_token": token, "token_type": "bearer"}

# ---------------------------
# Register user
# ---------------------------
@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_async_db)):
    existing = await get_user_by_email(db, user_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    existing_user = await get_user_by_username(db, user_in.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Hash password before saving
    user_in.password = hash_password(user_in.password)

    new_user = await create_user(db, user_in)
    return new_user


# ---------------------------
# Google OAuth2 login
# ---------------------------
@router.get("/google/login")
async def google_login():
    url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&access_type=offline&prompt=consent"
    )
    return RedirectResponse(url=url)


@router.get("/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_async_db)):
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
        raise HTTPException(status_code=400, detail="No id_token returned by Google")

    try:
        payload = google_id_token.verify_oauth2_token(
            id_token_str,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Google ID Token")

    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    user = await get_user_by_email(db, email)
    if not user:
        temp_password = os.urandom(12).hex()
        user_in = UserCreate(username=email, email=email, password=temp_password)
        user = await create_user(db, user_in)

    token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    redirect_url = f"http://localhost:5173/auth/google/callback?token={token}"
    return RedirectResponse(url=redirect_url)
