import os
import uuid
import re
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.database import get_db
from app.models.academic import VideoLecture, Material, Notice, SubjectEnum

router = APIRouter(prefix="/academic", tags=["Academic Syllabus & Handouts"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
STATIC_MATERIALS_DIR = BASE_DIR / "static" / "materials"
STATIC_MATERIALS_DIR.mkdir(parents=True, exist_ok=True)


class NoticeCreate(BaseModel):
    content: str


def parse_subject_enum(subj: str) -> SubjectEnum:
    s = str(subj).strip().upper().replace(" ", "_")
    if "CHEM" in s:
        return SubjectEnum.CHEMISTRY
    if "MATH" in s:
        return SubjectEnum.HIGHER_MATH
    return SubjectEnum.PHYSICS


# 1. Lectures / Videos Fetch Endpoints (Both paths supported for dashboard compatibility)
@router.get("/videos")
@router.get("/lectures")
async def get_academic_videos(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(VideoLecture)
        .where(VideoLecture.is_published.isnot(False))
        .order_by(VideoLecture.lecture_no.asc())
    )
    res = await db.execute(stmt)
    lectures = res.scalars().all()
    return [
        {
            "id": str(l.id),
            "lecture_no": l.lecture_no,
            "title": l.topic,
            "topic": l.topic,
            "chapter": l.chapter,
            # Returns uppercase enum to match frontend dashboard: 'PHYSICS', 'CHEMISTRY', 'HIGHER_MATH'
            "subject": l.subject.value if hasattr(l.subject, "value") else str(l.subject).upper(),
            "video_url": l.youtube_url,
            "youtube_url": l.youtube_url,
        }
        for l in lectures
    ]


# 2. Add Video from Dashboard / Admin
@router.post("/videos")
async def add_academic_video(
    payload: dict,
    db: AsyncSession = Depends(get_db)
):
    lecture_no = payload.get("lecture_no", 1)
    topic = payload.get("topic") or payload.get("title", "Lecture")
    chapter = payload.get("chapter", "General")
    subject_raw = payload.get("subject", "PHYSICS")
    youtube_url = payload.get("youtube_url") or payload.get("video_url", "")

    subj_enum = parse_subject_enum(subject_raw)

    new_lec = VideoLecture(
        lecture_no=int(lecture_no),
        topic=topic.strip(),
        chapter=chapter.strip(),
        subject=subj_enum,
        youtube_url=youtube_url.strip(),
        is_published=True
    )
    db.add(new_lec)
    await db.commit()
    await db.refresh(new_lec)
    return {"message": "Video lecture created successfully", "id": str(new_lec.id)}


# 3. Delete Video by ID
@router.delete("/videos/{video_id}")
async def delete_academic_video(video_id: str, db: AsyncSession = Depends(get_db)):
    try:
        v_uuid = uuid.UUID(video_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid video UUID")

    stmt = select(VideoLecture).where(VideoLecture.id == v_uuid)
    res = await db.execute(stmt)
    lec = res.scalar_one_or_none()
    if not lec:
        raise HTTPException(status_code=404, detail="Video lecture not found")
    await db.delete(lec)
    await db.commit()
    return {"message": "Video lecture removed"}


# 4. Materials Fetch Endpoint
@router.get("/materials")
async def get_academic_materials(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Material)
        .where(Material.is_published.isnot(False))
        .order_by(Material.created_at.desc())
    )
    res = await db.execute(stmt)
    materials = res.scalars().all()
    return [
        {
            "id": str(m.id),
            "title": m.title,
            "chapter": m.chapter,
            "subject": m.subject.value if hasattr(m.subject, "value") else str(m.subject).upper(),
            "pdf_url": m.pdf_url,
            "file_url": m.pdf_url,
        }
        for m in materials
    ]


# 5. Delete Material by ID
@router.delete("/materials/{material_id}")
async def delete_academic_material(material_id: str, db: AsyncSession = Depends(get_db)):
    try:
        m_uuid = uuid.UUID(material_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid material UUID")

    stmt = select(Material).where(Material.id == m_uuid)
    res = await db.execute(stmt)
    mat = res.scalar_one_or_none()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
    await db.delete(mat)
    await db.commit()
    return {"message": "Study sheet removed"}


# 6. Upload Local PDF File
@router.post("/materials/upload")
async def upload_material_pdf(
    title: str = Form(...),
    subject: str = Form(...),
    chapter: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    original_name = file.filename or "handout.pdf"
    clean_name = re.sub(r'[\s]+', '_', original_name)
    file_id = uuid.uuid4().hex[:12]
    saved_filename = f"{file_id}_{clean_name}"

    destination = STATIC_MATERIALS_DIR / saved_filename

    contents = await file.read()
    with open(destination, "wb") as f:
        f.write(contents)

    file_url = f"https://edutrack-backend-qjxg.onrender.com/static/materials/{saved_filename}"
    subj_enum = parse_subject_enum(subject)

    new_material = Material(
        title=title.strip(),
        subject=subj_enum,
        chapter=chapter.strip(),
        pdf_url=file_url,
        is_published=True,
    )
    db.add(new_material)
    await db.commit()
    await db.refresh(new_material)

    return {
        "message": "File uploaded successfully.",
        "file_url": file_url,
        "material": {
            "id": str(new_material.id),
            "title": new_material.title,
            "pdf_url": new_material.pdf_url,
            "file_url": new_material.pdf_url,
        },
    }


# 7. Live Notice Endpoints (For student dashboard banner)
@router.get("/notice")
async def get_active_notice(db: AsyncSession = Depends(get_db)):
    stmt = select(Notice).order_by(Notice.created_at.desc()).limit(1)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


@router.post("/notice")
async def broadcast_notice(payload: NoticeCreate, db: AsyncSession = Depends(get_db)):
    new_notice = Notice(content=payload.content.strip())
    db.add(new_notice)
    await db.commit()
    await db.refresh(new_notice)
    return new_notice


@router.delete("/notice")
async def clear_notice(db: AsyncSession = Depends(get_db)):
    await db.execute(delete(Notice))
    await db.commit()
    return {"message": "All notices cleared"}