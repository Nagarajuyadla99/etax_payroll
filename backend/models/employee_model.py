# payroll_system/models/employee_models.py
import uuid
from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    TIMESTAMP,
    Date,
    UniqueConstraint,
    ForeignKey,
    text,
    Numeric
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from database import Base  # Using absolute import for clarity


# --------------------------------------------------------------------
# EMPLOYEE
# --------------------------------------------------------------------
class Employee(Base):
    __tablename__ = "employees"
    __table_args__ = (
        UniqueConstraint("organisation_id", "employee_code", name="ux_employees_org_code"),
        UniqueConstraint("organisation_id", "email", name="ux_employees_org_email"),
    )

    employee_id = Column(PGUUID(as_uuid=True), primary_key=True, 
    server_default=text("gen_random_uuid()"))
    
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    employee_code = Column(String(100))
    first_name = Column(String(100), nullable=False)
    middle_name = Column(String(100))  # Added to align with schema
    last_name = Column(String(100))
    display_name = Column(Text)
    email = Column(String(255))
    work_email = Column(String(255))  # Added to align with schema
    phone = Column(String(30))
    mobile_phone = Column(String(30))  # Added to align with schema
    gender = Column(String(20))  # Use employee_status_t or string, consistent with DB enum
    date_of_birth = Column(Date)
    marital_status = Column(String(20))
    fathers_name = Column(String(100))
    date_of_joining = Column(Date)

    date_of_leaving = Column(Date)
    status = Column(String(20), nullable=False, server_default=text("'active'"))  # Matches employee_status_t enum
    department_id = Column(PGUUID(as_uuid=True), ForeignKey("departments.department_id", ondelete="SET NULL"))
    designation_id = Column(PGUUID(as_uuid=True), ForeignKey("designations.designation_id", ondelete="SET NULL"))
    location_id = Column(PGUUID(as_uuid=True), ForeignKey("work_locations.location_id", ondelete="SET NULL"))
    business_unit = Column(String(100))
    manager_id = Column(PGUUID(as_uuid=True), ForeignKey("employees.employee_id", ondelete="SET NULL"))
    pay_structure_id = Column(PGUUID(as_uuid=True), ForeignKey("pay_structures.pay_structure_id", ondelete="SET NULL"))
    annual_ctc = Column(Numeric(15, 2))  # Consider NUMERIC type; using String as placeholder
    pay_frequency = Column(String(20), server_default=text("'Monthly'"))
    uan_link_status = Column(String(50), server_default=text("'Unlinked'"))
    extra_metadata = Column("metadata", JSONB)  # Correctly mapped to JSONB metadata column
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    # ------------------ Relationships ------------------
    documents = relationship(
        "EmployeeDocument", back_populates="employee", cascade="all, delete-orphan"
    )
    salary_assignments = relationship(
        "EmployeeSalaryAssignment", back_populates="employee", cascade="all, delete-orphan"
    )
# employee_models.py

    department = relationship("Department", foreign_keys=[department_id], lazy="selectin")
    designation = relationship("Designation", foreign_keys=[designation_id], lazy="selectin")
    location = relationship("WorkLocation", foreign_keys=[location_id], lazy="selectin")
    pay_structure = relationship("PayStructure", foreign_keys=[pay_structure_id], lazy="selectin")
    manager = relationship("Employee", remote_side=[employee_id], lazy="selectin")

    # Attendance and leave relationships — ensure matching related model names
    attendance_records = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")
    leave_records = relationship("Leave", back_populates="employee", cascade="all, delete-orphan")


# --------------------------------------------------------------------
# EMPLOYEE DOCUMENTS
# --------------------------------------------------------------------
class EmployeeDocument(Base):
    __tablename__ = "employee_documents"

    document_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    employee_id = Column(PGUUID(as_uuid=True), ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False)
    organisation_id = Column(PGUUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False)
    document_type = Column(String(100))
    document_url = Column(Text)
    extra_metadata = Column("metadata", JSONB)  # Maps to DB 'metadata'
    uploaded_by = Column(PGUUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    uploaded_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    employee = relationship("Employee", back_populates="documents")


# --------------------------------------------------------------------
# EMPLOYEE SALARY ASSIGNMENTS
# --------------------------------------------------------------------
class EmployeeSalaryAssignment(Base):
    __tablename__ = "employee_salary_assignments"
    __table_args__ = (
        UniqueConstraint("employee_id", "effective_from", name="ux_emp_effective_from"),
    )

    salary_assignment_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    employee_id = Column(PGUUID(as_uuid=True), ForeignKey("employees.employee_id",
     ondelete="CASCADE"), nullable=False)
    pay_structure_id = Column(PGUUID(as_uuid=True), ForeignKey("pay_structures.pay_structure_id", ondelete="RESTRICT"), nullable=False)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date)
    created_by = Column(PGUUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    employee = relationship("Employee", back_populates="salary_assignments")

    # Confirm related attendance records exist if applicable
    attendance_records = relationship(
        "Attendance", back_populates="salary_assignment", cascade="all, delete-orphan"
    )