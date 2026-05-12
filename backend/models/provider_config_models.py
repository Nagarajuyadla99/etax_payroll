from __future__ import annotations

from sqlalchemy import Boolean, Column, ForeignKey, String, Text, TIMESTAMP, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.sql import func

from database import Base


class BankingProviderConfig(Base):
    __tablename__ = "banking_provider_configs"
    __table_args__ = (
        UniqueConstraint("organisation_id", "provider_code", name="ux_provider_config_org_provider"),
    )

    config_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(PGUUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False)
    provider_code = Column(String(30), nullable=False)

    # Store encrypted secrets as ciphertext blobs (encryption handled in service layer).
    credentials_enc = Column(Text, nullable=False)  # e.g. "nonce:ciphertext" json string encrypted
    webhook_secret_enc = Column(Text)

    is_sandbox = Column(Boolean, nullable=False, server_default=text("true"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    meta = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class ProviderHealthLog(Base):
    __tablename__ = "provider_health_logs"

    health_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(PGUUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False)
    provider_code = Column(String(30), nullable=False)
    ok = Column(Boolean, nullable=False, server_default=text("false"))
    latency_ms = Column(String(20))
    error = Column(Text)
    meta = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

