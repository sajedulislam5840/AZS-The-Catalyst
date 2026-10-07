import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.database import get_db
from app.models.academic import Material, VideoLecture, Notice, SubjectEnum
from app.schemas.academic import (
    MaterialResponse,
    VideoCreate,
    VideoResponse,
    NoticeCreate,
    NoticeResponse,
)
from app.core.deps import require_admin

router = APIRouter(prefix="/academic", tags=["Academic"])

UPLOAD_DIR = "uploads/materials"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# --- NOTICE BROADCASTER ---

@router.get("/notice", response_model=Optional[NoticeResponse])
async def get_latest_notice(db: AsyncSession = Depends(get_db)):
    stmt = select(Notice).order_by(Notice.created_at.desc()).limit(1)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


@router.post("/notice", response_model=NoticeResponse, dependencies=[Depends(require_admin)])
async def broadcast_notice(payload: NoticeCreate, db: AsyncSession = Depends(get_db)):
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="Notice content cannot be empty")
    
    # আগের নোটিশ ক্লিয়ার করে নতুন নোটিশ সেট করা
    await db.execute(delete(Notice))
    notice = Notice(content=payload.content.strip())
    db.add(notice)
    await db.commit()
    await db.refresh(notice)
    return notice


@router.delete("/notice", dependencies=[Depends(require_admin)])
async def clear_notice(db: AsyncSession = Depends(get_db)):
    await db.execute(delete(Notice))
    await db.commit()
    return {"message": "Active notice cleared"}


# --- MATERIALS (PDF ONLY) ---

@router.get("/materials", response_model=List[MaterialResponse])
async def list_materials(db: AsyncSession = Depends(get_db)):
    stmt = select(Material).order_by(Material.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/materials/upload", response_model=MaterialResponse, dependencies=[Depends(require_admin)])
async def upload_material(
    request: Request,
    title: str = Form(...),
    chapter: str = Form(...),
    subject: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    subj_val = subject.upper()
    if subj_val not in [SubjectEnum.PHYSICS.value, SubjectEnum.CHEMISTRY.value]:
        raise HTTPException(status_code=400, detail="Subject must be PHYSICS or CHEMISTRY")

    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    base_url = str(request.base_url).rstrip("/")
    pdf_url = f"{base_url}/static/materials/{unique_filename}"

    material = Material(
        title=title.strip(),
        chapter=chapter.strip(),
        subject=SubjectEnum(subj_val),
        pdf_url=pdf_url
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)
    return material


@router.delete("/materials/{material_id}", dependencies=[Depends(require_admin)])
async def delete_material(material_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(Material).where(Material.id == material_id)
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Material not found")

    filename = item.pdf_url.split("/")[-1]
    local_path = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(local_path):
        try:
            os.remove(local_path)
        except OSError:
            pass

    await db.delete(item)
    await db.commit()
    return {"message": "Material deleted successfully"}


# --- VIDEO LECTURES ---

@router.get("/videos", response_model=List[VideoResponse])
async def list_videos(db: AsyncSession = Depends(get_db)):
    stmt = select(VideoLecture).order_by(VideoLecture.lecture_no.asc(), VideoLecture.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/videos", response_model=VideoResponse, dependencies=[Depends(require_admin)])
async def create_video(payload: VideoCreate, db: AsyncSession = Depends(get_db)):
    video = VideoLecture(
        lecture_no=payload.lecture_no,
        topic=payload.topic.strip(),
        chapter=payload.chapter.strip(),
        subject=payload.subject,
        youtube_url=payload.youtube_url.strip()
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)
    return video


@router.delete("/videos/{video_id}", dependencies=[Depends(require_admin)])
async def delete_video(video_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(VideoLecture).where(VideoLecture.id == video_id)
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Video not found")

    await db.delete(item)
    await db.commit()
    return {"message": "Video lecture removed successfully"}