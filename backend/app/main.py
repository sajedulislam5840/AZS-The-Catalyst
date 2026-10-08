import os
import urllib.parse
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from app.api.v1 import admin_academic 

from app.core.database import engine, Base
from app.api.v1.auth import router as auth_router
from app.api.v1.admin import router as admin_router
from app.api.v1.academic import router as academic_router
from app.api.v1.chat import router as chat_router

# Static directories resolution
BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
MATERIALS_DIR = STATIC_DIR / "materials"

STATIC_DIR.mkdir(parents=True, exist_ok=True)
MATERIALS_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        migration_statements = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR;",
            "ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR;",
            "ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;",
            """
            DO $$
            BEGIN
                UPDATE users SET password_hash = hashed_password WHERE password_hash IS NULL AND hashed_password IS NOT NULL;
                UPDATE users SET hashed_password = password_hash WHERE hashed_password IS NULL AND password_hash IS NOT NULL;
            END $$;
            """,
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;",
            "ALTER TABLE users ALTER COLUMN is_active DROP NOT NULL;",
            "ALTER TABLE users ALTER COLUMN is_active SET DEFAULT TRUE;",
            "UPDATE users SET is_active = TRUE WHERE is_active IS NULL;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'STUDENT';",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS school VARCHAR;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS grade_class VARCHAR;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS batch_no VARCHAR;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITHOUT TIME ZONE;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS current_session_token VARCHAR;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;",
        ]

        for query in migration_statements:
            await conn.execute(text(query))

    yield


app = FastAPI(
    title="EduTrack API",
    description="Batch Management, 30-Day Paywall & AI Guide Platform",
    version="2.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def custom_cors_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        response = Response(status_code=200)
    else:
        try:
            response = await call_next(request)
        except Exception as exc:
            response = JSONResponse(
                status_code=500,
                content={"detail": f"Internal server error: {str(exc)}"},
            )

    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Expose-Headers"] = "*"
    return response


# Explicit Custom Route: Handles decoded Bangla unicode and %20 spaces in PDF requests
@app.get("/static/materials/{filename:path}")
async def serve_material_file(filename: str):
    decoded_filename = urllib.parse.unquote(filename)
    file_path = MATERIALS_DIR / decoded_filename

    if not file_path.exists():
        alt_path = Path("static/materials") / decoded_filename
        if alt_path.exists():
            file_path = alt_path
        else:
            raise HTTPException(status_code=404, detail="File not found on server disk.")

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=decoded_filename
    )


# General static files mount
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

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


app.include_router(admin_academic.router, prefix="/api/v1") 