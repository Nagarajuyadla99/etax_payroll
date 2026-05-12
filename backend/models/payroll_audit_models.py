"""Phase 4 — audit trail for payroll lifecycle (verify / approve / lock / denied actions)."""

import uuid

from sqlalchemy import Column, String, TIMESTAMP, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.sql import func

from database import Base


class PayrollLifecycleAuditLog(Base):
    __tablename__ = "payroll_lifecycle_audit"

    audit_id = Column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
    )
    action = Column(String(64), nullable=False)
    entity_type = Column(String(64), nullable=False)
    entity_id = Column(PGUUID(as_uuid=True), nullable=False)
    detail = Column(JSONB, nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
