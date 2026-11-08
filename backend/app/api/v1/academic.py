from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.access import require_subscriber
from app.core.database import get_db
from app.models.academic import Material, Notice, VideoLecture
from app.models.user import User

router = APIRouter(prefix="/academic", tags=["Academic Content"])


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
async def list_published_videos(
    user: User = Depends(require_subscriber),
    db: AsyncSession = Depends(get_db),
):
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
async def list_published_materials(
    user: User = Depends(require_subscriber),
    db: AsyncSession = Depends(get_db),
):
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


# --- 3. NOTICE ENDPOINT (latest announcement, for students whose subscription is running) ---
@router.get("/notice", response_model=Optional[NoticeOut])
async def get_active_notice(
    user: User = Depends(require_subscriber),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Notice).order_by(desc(Notice.created_at)).limit(1))
    notice = res.scalar_one_or_none()
    if not notice:
        return None
    return NoticeOut(
        id=str(notice.id),
        content=notice.content,
        created_at=(notice.created_at or datetime.utcnow()).isoformat() + "Z",
    )


# --- 4. FILE UPLOAD IS CLOSED: materials are Google Drive links added from the admin panel ---
@router.post("/materials/upload", status_code=410)
async def upload_material_file_closed():
    raise HTTPException(
        status_code=410,
        detail="File upload is closed. Add the study sheet as a Google Drive link from the admin panel.",
    )
