import os
import shutil
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_
from jose import jwt

from app.core.database import get_db
from app.models.user import User
from app.models.academic import VideoLecture, Material, SubjectEnum
from app.api.v1.auth import SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/academic", tags=["Academic Content"])

UPLOAD_DIR = "static/materials"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class VideoOut(BaseModel):
    id: str
    lecture_no: int
    topic: str
    title: Optional[str] = None
    chapter: str
    subject: str
    youtube_url: str
    video_url: str

    class Config:
        from_attributes = True


class MaterialOut(BaseModel):
    id: str
    title: str
    chapter: str
    subject: str
    pdf_url: str
    file_url: str

    class Config:
        from_attributes = True


class NoticeOut(BaseModel):
    id: str
    content: str
    created_at: str


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1].strip()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
        email = payload.get("sub")
        if email:
            stmt = select(User).where(User.email == email)
            res = await db.execute(stmt)
            return res.scalar_one_or_none()
    except Exception:
        pass
    return None


def get_subject_name(subj) -> str:
    if hasattr(subj, "value"):
        return str(subj.value).upper()
    s = str(subj).upper()
    if "CHEM" in s:
        return "CHEMISTRY"
    if "MATH" in s:
        return "HIGHER_MATH"
    return "PHYSICS"


# --- 1. VIDEOS FEED (DUAL ROUTE: /videos & /lectures FOR ZERO BREAKAGE) ---
@router.get("/videos", response_model=List[VideoOut])
@router.get("/lectures", response_model=List[VideoOut])
async def list_published_videos(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(VideoLecture)
        .where(or_(VideoLecture.is_published == True, VideoLecture.is_published.is_(None)))
        .order_by(VideoLecture.lecture_no.asc(), VideoLecture.created_at.asc())
    )
    res = await db.execute(stmt)
    videos = res.scalars().all()

    output = []
    for v in videos:
        url = getattr(v, "youtube_url", None) or getattr(v, "video_url", "") or ""
        name = getattr(v, "topic", None) or getattr(v, "title", "Lecture")
        subj_str = get_subject_name(v.subject)
        chap = v.chapter or "General"
        lec_num = v.lecture_no if v.lecture_no is not None else 1

        output.append(
            VideoOut(
                id=str(v.id),
                lecture_no=lec_num,
                topic=name,
                title=name,
                chapter=chap,
                subject=subj_str,
                youtube_url=url,
                video_url=url,
            )
        )
    return output


# --- 2. MATERIALS FEED ---
@router.get("/materials", response_model=List[MaterialOut])
async def list_published_materials(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Material)
        .where(or_(Material.is_published == True, Material.is_published.is_(None)))
        .order_by(Material.created_at.desc())
    )
    res = await db.execute(stmt)
    materials = res.scalars().all()

    output = []
    for m in materials:
        url = getattr(m, "pdf_url", None) or getattr(m, "file_url", "") or ""
        output.append(
            MaterialOut(
                id=str(m.id),
                title=m.title or "Study Material",
                chapter=m.chapter or "General",
                subject=get_subject_name(m.subject),
                pdf_url=url,
                file_url=url,
            )
        )
    return output


# --- 3. NOTICE ENDPOINT ---
@router.get("/notice")
async def get_active_notice(db: AsyncSession = Depends(get_db)):
    return None


# --- 4. MATERIAL FILE UPLOAD ---
@router.post("/materials/upload")
async def upload_material_file(
    title: str = Form(...),
    chapter: str = Form(...),
    subject: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    file_extension = os.path.splitext(file.filename)[1]
    saved_filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    backend_base = os.getenv("BACKEND_URL", "https://edutrack-backend-qjxg.onrender.com").rstrip("/")
    file_url = f"{backend_base}/static/materials/{saved_filename}"

    s = subject.strip().upper().replace(" ", "_")
    subj_enum = SubjectEnum.PHYSICS
    if "CHEM" in s:
        subj_enum = SubjectEnum.CHEMISTRY
    elif "MATH" in s:
        subj_enum = SubjectEnum.HIGHER_MATH

    material = Material(
        title=title.strip(),
        chapter=chapter.strip(),
        subject=subj_enum,
        pdf_url=file_url,
        is_published=True
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)

    return {"message": "File uploaded successfully.", "file_url": file_url}