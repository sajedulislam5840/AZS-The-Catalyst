import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from sqlalchemy import text

from app.core.database import engine, Base
from app.api.v1.auth import router as auth_router
from app.api.v1.academic import router as academic_router
from app.models.user import User
from app.models.academic import Material, VideoLecture

UPLOAD_DIR = "uploads/materials"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # টেবিল আগে থেকে থাকলে মিসিং কলামগুলো অ্যাড করে দেবে যাতে ক্র্যাশ না করে
        try:
            await conn.execute(text("ALTER TABLE video_lectures ADD COLUMN IF NOT EXISTS lecture_no INTEGER DEFAULT 1;"))
            await conn.execute(text("ALTER TABLE video_lectures ADD COLUMN IF NOT EXISTS topic VARCHAR(255) DEFAULT '';"))
        except Exception:
            pass
    yield

app = FastAPI(title="EduTrack API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static/materials", StaticFiles(directory=UPLOAD_DIR), name="materials")

app.include_router(auth_router, prefix="/api/v1")
app.include_router(academic_router, prefix="/api/v1")

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}