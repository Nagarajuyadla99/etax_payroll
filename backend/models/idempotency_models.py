from sqlalchemy import Column, Integer, String, TIMESTAMP, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.sql import func

from database import Base


class ApiIdempotencyKey(Base):
    """
    Stores responses for idempotent POST requests (org-scoped).

    Contract:
    - client sends Idempotency-Key header (a random stable key per logical action)
    - server stores request_hash + response_json
    - replays the stored response if the same key is used again
    - rejects if same key is used with a different payload (409)
    """

    __tablename__ = "api_idempotency_keys"

    id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(PGUUID(as_uuid=True), nullable=False)

    key = Column(String(128), nullable=False)
    method = Column(String(10), nullable=False, server_default=text("'POST'"))
    path = Column(String(255), nullable=False)
    request_hash = Column(String(64), nullable=False)

    status_code = Column(Integer, nullable=False, server_default=text("200"))
    response_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("organisation_id", "key", name="ux_api_idempo_org_key"),
    )

