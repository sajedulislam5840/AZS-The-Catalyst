import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from app.core.database import engine, Base
from app.api.v1.auth import router as auth_router
from app.api.v1.academic import router as academic_router

# নিশ্চিত করো মডেলগুলো এখানে ইমপোর্ট করা আছে, যাতে Base.metadata টেবিলগুলো তৈরি করতে পারে
from app.models.user import User
from app.models.academic import Material, VideoLecture

# আপলোড ফোল্ডার তৈরি
UPLOAD_DIR = "uploads/materials"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # সার্ভার চালু হওয়ার সময় ডেটাবেসে materials এবং video_lectures টেবিল অটো তৈরি করবে
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="EduTrack API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ১. PDF ফাইলগুলো ব্রাউজার থেকে ডাউনলোড বা প্রিভিউ করার জন্য স্ট্যাটিক মাউন্ট
app.mount("/static/materials", StaticFiles(directory=UPLOAD_DIR), name="materials")

# ২. রাউটারগুলো যুক্ত করা
app.include_router(auth_router, prefix="/api/v1")
app.include_router(academic_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}