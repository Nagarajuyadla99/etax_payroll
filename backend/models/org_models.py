# payroll_system/models/org_models.py
import uuid
from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    TIMESTAMP,
    ForeignKey,
    UniqueConstraint,
    text,
    SmallInteger,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base  # Absolute import for clarity


# --------------------------------------------------------------------
# ORGANISATION
# --------------------------------------------------------------------
class Organisation(Base):
    __tablename__ = "organisations"

    organisation_id = Column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    name = Column(Text, nullable=False)
    legal_name = Column(Text)
    registration_no = Column(Text)
    tax_id = Column(String(100))
    pan = Column(String(20))
    tds_circle = Column(String(100))
    logo_url = Column(Text)
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100), server_default=text("'India'"))
    postal_code = Column(String(20))
    timezone = Column(String(50), server_default=text("'Asia/Kolkata'"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    # Relationships
    departments = relationship("Department", back_populates="organisation", cascade="all, delete-orphan")
    designations = relationship("Designation", back_populates="organisation", cascade="all, delete-orphan")
    work_locations = relationship("WorkLocation", back_populates="organisation", cascade="all, delete-orphan")
    roles = relationship("Role", back_populates="organisation", cascade="all, delete-orphan")
    users = relationship("User", back_populates="organisation", cascade="all, delete-orphan")


# --------------------------------------------------------------------
# DEPARTMENT
# --------------------------------------------------------------------
class Department(Base):
    __tablename__ = "departments"
    __table_args__ = (UniqueConstraint("organisation_id", "name", name="ux_departments_org_name"),)

    department_id = Column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(Text, nullable=False)
    code = Column(String(50))
    description = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    # Relationships
    organisation = relationship("Organisation", back_populates="departments")


# --------------------------------------------------------------------
# DESIGNATION
# --------------------------------------------------------------------
class Designation(Base):
    __tablename__ = "designations"
    __table_args__ = (UniqueConstraint("organisation_id", "title", name="ux_designations_org_title"),)

    designation_id = Column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    title = Column(Text, nullable=False)
    level = Column(SmallInteger)
    description = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    # Relationships
    organisation = relationship("Organisation", back_populates="designations")


# --------------------------------------------------------------------
# WORK LOCATION / BRANCH
# --------------------------------------------------------------------
class WorkLocation(Base):
    __tablename__ = "work_locations"
    __table_args__ = (UniqueConstraint("organisation_id", "name", name="ux_worklocations_org_name"),)

    location_id = Column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(Text, nullable=False)
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100), server_default=text("'India'"))
    postal_code = Column(String(20))
    phone = Column(String(30))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    # Relationships
    organisation = relationship("Organisation", back_populates="work_locations")