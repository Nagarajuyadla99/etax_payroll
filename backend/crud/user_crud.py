# payroll_system/crud/user_crud.py

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from passlib.context import CryptContext
from uuid import UUID

from models.user_models import User, Role, UserRole
from schemas.user_schemas import (
    UserCreate, UserUpdate, RoleCreate, UserRoleCreate
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
print(pwd_context.hash("123"))
# ============================================================
# USER CRUD
# ============================================================

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    q = await db.execute(select(User).filter(User.email == email))
    return q.scalar_one_or_none()

async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    q = await db.execute(select(User).filter(User.username == username))
    return q.scalar_one_or_none()

async def get_user_by_id(db: AsyncSession, user_id: UUID) -> Optional[User]:
    """Retrieve a user by their unique UUID."""
    q = await db.execute(select(User).filter(User.user_id == user_id))
    return q.scalar_one_or_none()

async def list_users(db: AsyncSession) -> List[User]:
    """List all users."""
    q = await db.execute(select(User))
    return q.scalars().all()

# ============================================================
# ✅ FIXED create_user() – Prevent duplicate keyword error
# ============================================================

async def create_user(db: AsyncSession, payload: UserCreate, is_system_admin: bool = False) -> User:
    """
    Create a new user with hashed password and uniqueness checks.
    Prevents duplicate 'is_system_admin' keyword from schema.
    """

    # Check for existing user (organisation + email)
    existing = await db.execute(
        select(User).filter(
            User.organisation_id == payload.organisation_id,
            User.email == payload.email,
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError("Email already registered for this organisation")

    # ✅ FIXED: Extract password separately and hash it
    # plain_password = payload.password
    # hashed = pwd_context.hash(plain_password)

    # ✅ FIXED: Convert payload to dict, excluding 'password'
    # and pop is_system_admin to avoid duplicate argument
    data = payload.model_dump(exclude={"password"})
    is_admin_flag = data.pop("is_system_admin", is_system_admin)

    # ✅ FIXED: Create User safely
    user = User(**data, password_hash=payload.password, is_system_admin=is_admin_flag)

    try:
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user
    except IntegrityError as e:
        await db.rollback()
        raise ValueError("User creation failed due to integrity error") from e

async def authenticate_user(db: AsyncSession, identifier: str, password: str) -> Optional[User]:
    """Authenticate a user using email or username."""
    q = await db.execute(
        select(User).filter((User.email == identifier) | (User.username == identifier))
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
    """Create a new role for an organisation."""
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
    db: AsyncSession, payload: UserRoleCreate, assigned_by: Optional[UUID] = None
) -> UserRole:
    """Assign a role to a user (ensures no duplicates)."""

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
    """Get all roles assigned to a given user."""
    q = await db.execute(
        select(Role)
        .join(UserRole, Role.role_id == UserRole.role_id)
        .filter(UserRole.user_id == user_id)
    )
    return q.scalars().all()
