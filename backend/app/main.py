from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, Base
from app.api.v1.auth import router as auth_router
from app.api.v1.admin import router as admin_router
from app.api.v1.academic import router as academic_router
from app.api.v1.chat import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Database table auto-creation
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="EduTrack API",
    description="Batch Management, 30-Day Paywall & AI Guide Platform",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS fix to allow browser fetch requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include All API Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(academic_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "status": "healthy",
        "service": "EduTrack API Engine",
        "version": "2.0.0",
    }


@app.get("/health")
async def health_check():
    return {"status": "ok"}