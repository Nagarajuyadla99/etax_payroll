"""API idempotency keys (additive, idempotent)

Revision ID: bb11cc22dd33
Revises: aa11bb22cc33
Create Date: 2026-05-08
"""

from typing import Sequence, Union

from alembic import op


revision: str = "bb11cc22dd33"
down_revision: Union[str, Sequence[str], None] = "aa11bb22cc33"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE TABLE IF NOT EXISTS api_idempotency_keys ("
        "id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"
        "organisation_id uuid NOT NULL,"
        "\"key\" varchar(128) NOT NULL,"
        "method varchar(10) NOT NULL DEFAULT 'POST',"
        "path varchar(255) NOT NULL,"
        "request_hash varchar(64) NOT NULL,"
        "status_code integer NOT NULL DEFAULT 200,"
        "response_json jsonb NOT NULL DEFAULT '{}'::jsonb,"
        "created_at timestamptz NOT NULL DEFAULT now(),"
        "CONSTRAINT ux_api_idempo_org_key UNIQUE (organisation_id, \"key\")"
        ")"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_api_idempo_org_created "
        "ON api_idempotency_keys (organisation_id, created_at)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS api_idempotency_keys")

