from __future__ import annotations

from sqlalchemy import Column, String, Text, TIMESTAMP, ForeignKey, Boolean, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.sql import func

from database import Base


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(PGUUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)

    kind = Column(String(50), nullable=False)  # approval_requested/approved/rejected/payout_success/payout_failed
    title = Column(Text, nullable=False)
    body = Column(Text)
    data = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    is_read = Column(Boolean, nullable=False, server_default=text("false"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    read_at = Column(TIMESTAMP(timezone=True))

