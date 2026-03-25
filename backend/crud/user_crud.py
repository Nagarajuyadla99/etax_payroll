# payroll_system/crud/user_crud.py

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from passlib.context import CryptContext
from uuid import UUID

from models.user_models import User, Role, UserRole
from schemas.user_schemas import (
    UserCreate, UserUpdate, RoleCreate, UserRoleCreate
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ============================================================
# USER CRUD
# ============================================================

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    q = await db.execute(
        select(User)
        .options(selectinload(User.roles))   
        .filter(User.email == email)
    )
    return q.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    q = await db.execute(
        select(User)
        .options(selectinload(User.roles))  
        .filter(User.username == username)
    )
    return q.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> Optional[User]:
    q = await db.execute(
        select(User)
        .options(selectinload(User.roles))   
        .filter(User.user_id == user_id)
    )
    return q.scalar_one_or_none()


async def list_users(db: AsyncSession) -> List[User]:
    q = await db.execute(
        select(User).options(selectinload(User.roles))  
    )
    return q.scalars().all()


# ============================================================
# CREATE USER
# ============================================================

async def create_user(
    db: AsyncSession,
    payload: UserCreate,
    is_system_admin: bool = False
) -> User:

    existing = await db.execute(
        select(User).filter(
            User.organisation_id == payload.organisation_id,
            User.email == payload.email,
        )
    )

    if existing.scalar_one_or_none():
        raise ValueError("Email already registered for this organisation")

    hashed_password = pwd_context.hash(payload.password)

    data = payload.model_dump(exclude={"password"})
    is_admin_flag = data.pop("is_system_admin", is_system_admin)

    user = User(
        **data,
        password_hash=hashed_password,
        is_system_admin=is_admin_flag
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user


async def authenticate_user(
    db: AsyncSession,
    identifier: str,
    password: str
) -> Optional[User]:

    q = await db.execute(
        select(User)
        .options(selectinload(User.roles))   # ✅ IMPORTANT
        .filter((User.email == identifier) | (User.username == identifier))
    )

    user = q.scalar_one_or_none()

    if not user:
        return None

    if not pwd_context.verify(password, user.password_hash):
        return None

    return user


# ============================================================
# ROLE MANAGEMENT
# ============================================================

async def create_role(db: AsyncSession, payload: RoleCreate) -> Role:
    role = Role(**payload.model_dump())
    try:
        db.add(role)
        await db.commit()
        await db.refresh(role)
        return role
    except IntegrityError as e:
        await db.rollback()
        raise ValueError("Role creation failed") from e


async def assign_role_to_user(
    db: AsyncSession,
    payload: UserRoleCreate,
    assigned_by: Optional[UUID] = None
) -> UserRole:

    # Validate user
    q1 = await db.execute(select(User).filter(User.user_id == payload.user_id))
    user = q1.scalar_one_or_none()
    if not user:
        raise ValueError("User not found")

    # Validate role
    q2 = await db.execute(select(Role).filter(Role.role_id == payload.role_id))
    role = q2.scalar_one_or_none()
    if not role:
        raise ValueError("Role not found")

    # Prevent duplicate mapping
    q3 = await db.execute(
        select(UserRole).filter(
            UserRole.user_id == payload.user_id,
            UserRole.role_id == payload.role_id,
        )
    )
    if q3.scalar_one_or_none():
        raise ValueError("Role already assigned to user")

    user_role = UserRole(
        user_id=payload.user_id,
        role_id=payload.role_id,
        assigned_by=assigned_by
    )

    try:
        db.add(user_role)
        await db.commit()
        await db.refresh(user_role)
        return user_role
    except IntegrityError as e:
        await db.rollback()
        raise ValueError("Failed to assign role") from e


async def get_user_roles(db: AsyncSession, user_id: UUID) -> List[Role]:
    q = await db.execute(
        select(Role)
        .join(UserRole, Role.role_id == UserRole.role_id)
        .filter(UserRole.user_id == user_id)
    )
    return q.scalars().all()