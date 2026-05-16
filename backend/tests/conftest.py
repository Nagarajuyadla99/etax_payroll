import os
import sys
from pathlib import Path


# Ensure backend module-style imports work in tests (e.g. `from utils...`).
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

# Unit tests must not require a live DB URL at import time.
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/payroll_test",
)

