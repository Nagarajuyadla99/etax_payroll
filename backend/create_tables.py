import asyncio
from database import engine, Base

# VERY IMPORTANT: import ALL models so SQLAlchemy registers them
from models.attendance_models import Attendance

# If you have these models, import them too:
# from models.employee_model import Employee
# from models.organisation_model import Organisation
# from models.user_model import User
# from models.employee_salary_assignment import EmployeeSalaryAssignment


async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("✅ Tables created successfully")


if __name__ == "__main__":
    asyncio.run(create_tables())
