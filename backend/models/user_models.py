# payroll_system/models/user_models.py
import uuid
from sqlalchemy import (
    Column, String, Text, Boolean, TIMESTAMP,
    ForeignKey, UniqueConstraint, text
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from database import Base  # Absolute import for clarity


# ----------------------------------------------------------------------
# ROLE MODEL
# ----------------------------------------------------------------------
class Role(Base):
    __tablename__ = "roles"

    role_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=True,
    )
    name = Column(String(100), nullable=False)
    description = Column(Text)
    builtin = Column(Boolean, nullable=False, server_default=text("false"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(  # Added updated_at for consistency
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("organisation_id", "name", name="ux_roles_org_name"),
    )

    # Relationships
    organisation = relationship("Organisation", back_populates="roles")
    user_roles = relationship(
        "UserRole",
        back_populates="role",
        cascade="all, delete-orphan",
        foreign_keys="[UserRole.role_id]",
    )

    def __repr__(self):
        return f"<Role(name={self.name}, organisation_id={self.organisation_id})>"


# ----------------------------------------------------------------------
# USER MODEL
# ----------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    user_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="SET NULL"),
        nullable=False,
    )
    username = Column(String(150), nullable=False)
    email = Column(String(255), nullable=False)
    password_hash = Column(Text, nullable=False)
    full_name = Column(Text)
    phone = Column(String(30))
    status = Column(String(20), nullable=False, server_default=text("'active'"))
    last_login = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    is_system_admin = Column(Boolean, nullable=False, server_default=text("false"))
    reset_token = Column(String, nullable=True)
    reset_token_expiry = Column(TIMESTAMP(timezone=True), nullable=True)
    __table_args__ = (
        UniqueConstraint("organisation_id", "username", name="ux_users_org_username"),
        UniqueConstraint("organisation_id", "email", name="ux_users_org_email"),
    )

    # Relationships
    organisation = relationship("Organisation", back_populates="users")

    # Explicit foreign_keys removes ambiguity between user_id & assigned_by
    roles = relationship(
        "UserRole",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="[UserRole.user_id]",
    )

    assigned_roles = relationship(
        "UserRole",
        foreign_keys="[UserRole.assigned_by]",
        viewonly=True,
    )
    
    def __repr__(self):
        return f"<User(username={self.username}, email={self.email}, organisation_id={self.organisation_id})>"


# ----------------------------------------------------------------------
# USER-ROLE LINK TABLE
# ----------------------------------------------------------------------
class UserRole(Base):
    __tablename__ = "user_roles"

    user_role_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    role_id = Column(PGUUID(as_uuid=True), ForeignKey("roles.role_id", ondelete="CASCADE"), nullable=False)
    assigned_by = Column(PGUUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"))
    assigned_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    user = relationship(
        "User",
        back_populates="roles",
        foreign_keys=[user_id],
    )
    role = relationship(
        "Role",
        back_populates="user_roles",
        foreign_keys=[role_id],
    )
    assigned_by_user = relationship(
        "User",
        foreign_keys=[assigned_by],
    )

    __table_args__ = (
        UniqueConstraint("user_id", "role_id", name="ux_user_roles_user_role"),
    )

    def __repr__(self):
        return f"<UserRole(user_id={self.user_id}, role_id={self.role_id})>"