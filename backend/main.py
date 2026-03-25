from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.attendance_route import router as attendance_router
from api.employee_route import router as employee_router
from api.user_routes import router as user_router
from api.auth_routes import router as auth_router
from api.salary_routes import router as salary_router
from api.payroll_routes import router as payroll_router
from api.payslip_routes import router as payslip_router
from api.org_routes import router as org_router
import uvicorn



from database import engine, Base

# IMPORTANT: import models BEFORE create_all
import models

app = FastAPI()
API_PREFIX = "/api"
origins = [
    "http://localhost:9999",
    "http://127.0.0.1:9999",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
     expose_headers=["*"],
)

# include router
app.include_router(attendance_router, prefix=API_PREFIX)
app.include_router(employee_router, prefix=API_PREFIX)
app.include_router(user_router, prefix=API_PREFIX)

app.include_router(auth_router, prefix=API_PREFIX + "/auth", tags=["Authentication"])
app.include_router(salary_router, prefix=API_PREFIX + "/salary", tags=["Salary"])

app.include_router(payroll_router, prefix=API_PREFIX)
app.include_router(payslip_router, prefix=API_PREFIX)

app.include_router(org_router, prefix=API_PREFIX + "/organisation")

# create tables on startup
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=9000, reload=True)