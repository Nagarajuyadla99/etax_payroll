# payroll_system/database.py

import os

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker
)
from sqlalchemy.orm import declarative_base
from typing import AsyncGenerator

# Prefer backend/.env over a stale machine-level DATABASE_URL (common on Windows dev).
load_dotenv(override=True)

# ------------------------------------------------------------
# PostgreSQL connection (systemd can set DATABASE_URL via EnvironmentFile)
# ------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required")


# ------------------------------------------------------------
# Create Async Engine
# ------------------------------------------------------------
engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("SQL_ECHO", "false").lower() == "true",
    future=True,
    pool_pre_ping=True,     # prevents stale connection errors
    pool_size=10,           # connection pool size
    max_overflow=20         # extra connections allowed
)


# ------------------------------------------------------------
# Session Maker
# ------------------------------------------------------------
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)


# ------------------------------------------------------------
# Base Model
# ------------------------------------------------------------
Base = declarative_base()


# ------------------------------------------------------------
# FastAPI Dependency
# ------------------------------------------------------------
async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session