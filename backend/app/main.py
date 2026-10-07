from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.database import engine, Base
from app.api.v1.auth import router as auth_router
from app.api.v1.academic import router as academic_router

from app.models.user import User
from app.models.academic import Material, VideoLecture


@asynccontextmanager
async def lifespan(app: FastAPI):
    # সার্ভার স্টার্টআপের সময় Neon ডেটাবেসে মিসিং টেবিলগুলো অটো ক্রিয়েট করবে
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="EduTrack API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router, prefix="/api/v1")
app.include_router(academic_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}