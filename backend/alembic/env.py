from logging.config import fileConfig
import os

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context
from dotenv import load_dotenv

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config
load_dotenv()

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
from database import Base
import models  # noqa: F401

target_metadata = Base.metadata

# ---------------------------------------------------------------------------
# Database URL — never hardcode secrets here.
# - Production/staging: set DATABASE_URL (and optionally in .env loaded above).
# - CI / offline checks: unset DATABASE_URL → SQLite file URL (no server needed).
# Alembic uses a synchronous engine; async URLs are mapped to a sync driver below.
# ---------------------------------------------------------------------------
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./test.db",
)


def _sync_sqlalchemy_url_for_alembic(raw: str) -> str:
    """Map app-style async URLs to a sync URL Alembic's engine can use."""
    if "+asyncpg" in raw:
        return raw.replace("+asyncpg", "+psycopg2")
    return raw


config.set_main_option(
    "sqlalchemy.url",
    _sync_sqlalchemy_url_for_alembic(DATABASE_URL),
)

# other values from the config file, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to
    the script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
