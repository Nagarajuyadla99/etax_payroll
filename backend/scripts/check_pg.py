"""One-off: test Postgres credentials and ensure payroll_db exists."""
import asyncio
import os
import sys

import asyncpg
from dotenv import load_dotenv

load_dotenv()


async def main() -> int:
  url = os.getenv("DATABASE_URL", "")
  candidates = []
  if url:
    candidates.append(("DATABASE_URL from .env", url))
  candidates.extend(
    [
      ("default 96188", "postgresql://postgres:96188@localhost:5432/postgres"),
      ("empty password", "postgresql://postgres@localhost:5432/postgres"),
    ]
  )

  for label, dsn in candidates:
    try:
      # asyncpg wants postgresql:// not postgresql+asyncpg://
      dsn_plain = dsn.replace("postgresql+asyncpg://", "postgresql://")
      conn = await asyncpg.connect(dsn_plain)
      print(f"CONNECTED via {label}")
      exists = await conn.fetchval(
        "SELECT 1 FROM pg_database WHERE datname = $1", "payroll_db"
      )
      if not exists:
        await conn.execute("CREATE DATABASE payroll_db")
        print("Created database payroll_db")
      else:
        print("Database payroll_db already exists")
      await conn.close()
      return 0
    except Exception as e:
      print(f"FAIL {label}: {type(e).__name__}: {e}")

  print("\nUpdate backend/.env DATABASE_URL with your real postgres password.")
  return 1


if __name__ == "__main__":
  sys.exit(asyncio.run(main()))
