from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.attendance_route import router as attendance_router
from api.employee_route import router as employee_router
from api.user_routes import router as user_router
from api.auth_rotes import router as auth_router



from database import engine, Base

# IMPORTANT: import models BEFORE create_all
import models

app = FastAPI()

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
)

# include router
app.include_router(attendance_router)
app.include_router(employee_router)
app.include_router(user_router)
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])


# create tables on startup
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
