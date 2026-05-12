# payroll_system/utils/auth.py
import logging
import os
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from jose import ExpiredSignatureError, JWTError, jwt
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

# =========================
# CONFIG
# =========================
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# =========================
# PASSWORD UTILITIES
# =========================
def hash_password(password: str) -> str:
    if not password:
        raise ValueError("Password cannot be empty")

    # bcrypt limit protection
    truncated = password[:72]
    return pwd_context.hash(truncated)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password:
        return False

    truncated = plain_password[:72]
    return pwd_context.verify(truncated, hashed_password)


# =========================
# JWT UTILITIES
# =========================
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    if "sub" not in data:
        raise ValueError("Token payload must include 'sub'")

    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow()
    })

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload

    except ExpiredSignatureError:
        logger.info("jwt_decode_failed reason=expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        _auth_debug = os.getenv("AUTH_DEBUG", "").lower() in ("1", "true", "yes")
        if _auth_debug:
            logger.warning("jwt_decode_failed error=%s detail=%s", type(e).__name__, str(e))
        else:
            logger.info("jwt_decode_failed error=%s", type(e).__name__)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )