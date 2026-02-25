from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.attendance_route import router as attendance_router
from api.employee_route import router as employee_router



from database import engine, Base

# IMPORTANT: import models BEFORE create_all
import models

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# include router
app.include_router(attendance_router)
app.include_router(employee_router)


# create tables on startup
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
