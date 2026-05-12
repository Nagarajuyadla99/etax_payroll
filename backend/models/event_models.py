from __future__ import annotations

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, TIMESTAMP, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.sql import func

from database import Base


class DomainEvent(Base):
    """
    Outbox-style domain events for Phase 2G.
    Produced inside DB transactions and dispatched asynchronously by workers.
    """

    __tablename__ = "domain_events"
    __table_args__ = (
        UniqueConstraint("organisation_id", "dedupe_key", name="ux_domain_event_org_dedupe"),
    )

    event_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )

    event_type = Column(String(80), nullable=False)  # payout.initiated, fraud.detected, etc.
    dedupe_key = Column(String(160), nullable=False)  # prevent duplicates per org (idempotency)

    # payload should be compact; raw provider/webhook should live in their own tables
    payload = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    status = Column(String(20), nullable=False, server_default=text("'pending'"))  # pending/processing/processed/failed/dead
    attempts = Column(Integer, nullable=False, server_default=text("0"))
    next_attempt_at = Column(TIMESTAMP(timezone=True))
    locked_until = Column(TIMESTAMP(timezone=True))
    last_error = Column(Text)

    correlation_id = Column(String(80))
    request_id = Column(String(80))

    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    processed_at = Column(TIMESTAMP(timezone=True))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

