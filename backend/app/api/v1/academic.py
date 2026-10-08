import os
import uuid
import re
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.academic import VideoLecture, Material, SubjectEnum

router = APIRouter(prefix="/academic", tags=["Academic Syllabus & Handouts"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
STATIC_MATERIALS_DIR = BASE_DIR / "static" / "materials"
STATIC_MATERIALS_DIR.mkdir(parents=True, exist_ok=True)


class LectureOut(BaseModel):
    id: str
    lecture_no: int
    title: str
    topic: str
    chapter: str
    subject: str
    video_url: str

    class Config:
        from_attributes = True


class MaterialOut(BaseModel):
    id: str
    title: str
    chapter: str
    subject: str
    file_url: str

    class Config:
        from_attributes = True


def parse_subject_enum(subj: str) -> SubjectEnum:
    s = subj.strip().upper().replace(" ", "_")
    if "CHEM" in s:
        return SubjectEnum.CHEMISTRY
    if "MATH" in s:
        return SubjectEnum.HIGHER_MATH
    return SubjectEnum.PHYSICS


# Student endpoint: fetches all published lectures (case-insensitive & safe fallback)
@router.get("/lectures")
async def get_student_lectures(db: AsyncSession = Depends(get_db)):
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
            "subject": l.subject.value if hasattr(l.subject, "value") else str(l.subject),
            "video_url": l.youtube_url,
            "youtube_url": l.youtube_url,
        }
        for l in lectures
    ]


@router.get("/materials")
async def get_student_materials(db: AsyncSession = Depends(get_db)):
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
            "subject": m.subject.value if hasattr(m.subject, "value") else str(m.subject),
            "file_url": m.pdf_url,
            "pdf_url": m.pdf_url,
        }
        for m in materials
    ]


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
            "file_url": new_material.pdf_url,
        },
    }