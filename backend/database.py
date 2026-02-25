# payroll_system/database.py

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker
)
from sqlalchemy.orm import declarative_base
from typing import AsyncGenerator


# ------------------------------------------------------------
# PostgreSQL Connection URL
# ------------------------------------------------------------
DATABASE_URL = "postgresql+asyncpg://postgres:96188@localhost:5432/payroll_db"


# ------------------------------------------------------------
# Create Async Engine
# ------------------------------------------------------------
engine = create_async_engine(
    DATABASE_URL,
    echo=True,               # set False in production
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