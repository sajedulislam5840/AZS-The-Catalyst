import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.academic import Material, VideoLecture, SubjectEnum
from app.core.cloudinary_config import upload_pdf_to_cloudinary, delete_pdf_from_cloudinary

router = APIRouter(prefix="/admin", tags=["Admin Academic"])


# ============ SCHEMAS ============
class VideoCreateIn(BaseModel):
    lecture_no: int
    title: str
    topic: Optional[str] = ""
    chapter: str
    subject: str
    video_url: str


class MaterialLinkIn(BaseModel):
    title: str
    chapter: str
    subject: str
    file_url: str


# ============ VIDEO LECTURES (ADMIN) ============

@router.get("/lectures", dependencies=[Depends(require_admin)])
async def admin_list_lectures(db: AsyncSession = Depends(get_db)):
    """Admin সব ভিডিও দেখতে পারবে (published এবং unpublished উভয়)"""
    stmt = select(VideoLecture).order_by(VideoLecture.lecture_no.asc())
    result = await db.execute(stmt)
    lectures = result.scalars().all()
    return [
        {
            "id": str(l.id),
            "lecture_no": l.lecture_no,
            "title": l.topic,
            "topic": l.topic,
            "chapter": l.chapter,
            "subject": l.subject.value if hasattr(l.subject, "value") else l.subject,
            "video_url": l.youtube_url,
            "is_published": getattr(l, "is_published", True),
        }
        for l in lectures
    ]


@router.post("/lectures", dependencies=[Depends(require_admin)])
async def admin_create_lecture(payload: VideoCreateIn, db: AsyncSession = Depends(get_db)):
    try:
        subj = SubjectEnum(payload.subject.upper().replace(" ", "_"))
    except ValueError:
        raise HTTPException(400, f"Invalid subject: {payload.subject}")

    video = VideoLecture(
        lecture_no=payload.lecture_no,
        topic=payload.title.strip(),
        chapter=payload.chapter.strip(),
        subject=subj,
        youtube_url=payload.video_url.strip(),
        is_published=True,
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)
    return {"message": "Lecture created", "id": str(video.id)}


@router.patch("/lectures/{lecture_id}/toggle-publish", dependencies=[Depends(require_admin)])
async def toggle_lecture_publish(lecture_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(VideoLecture).where(VideoLecture.id == lecture_id)
    res = await db.execute(stmt)
    lec = res.scalar_one_or_none()
    if not lec:
        raise HTTPException(404, "Lecture not found")
    
    lec.is_published = not getattr(lec, "is_published", True)
    await db.commit()
    return {"message": "Toggled", "is_published": lec.is_published}


@router.delete("/lectures/{lecture_id}", dependencies=[Depends(require_admin)])
async def admin_delete_lecture(lecture_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(VideoLecture).where(VideoLecture.id == lecture_id)
    res = await db.execute(stmt)
    lec = res.scalar_one_or_none()
    if not lec:
        raise HTTPException(404, "Lecture not found")
    await db.delete(lec)
    await db.commit()
    return {"message": "Lecture deleted permanently"}


# ============ MATERIALS / PDF (ADMIN) ============

@router.get("/materials", dependencies=[Depends(require_admin)])
async def admin_list_materials(db: AsyncSession = Depends(get_db)):
    """Admin সব PDF দেখতে পারবে"""
    stmt = select(Material).order_by(Material.created_at.desc())
    result = await db.execute(stmt)
    mats = result.scalars().all()
    return [
        {
            "id": str(m.id),
            "title": m.title,
            "chapter": m.chapter,
            "subject": m.subject.value if hasattr(m.subject, "value") else m.subject,
            "file_url": m.pdf_url,
            "is_published": getattr(m, "is_published", True),
        }
        for m in mats
    ]


@router.post("/materials", dependencies=[Depends(require_admin)])
async def admin_create_material_link(payload: MaterialLinkIn, db: AsyncSession = Depends(get_db)):
    """Google Drive link দিয়ে PDF add"""
    try:
        subj = SubjectEnum(payload.subject.upper().replace(" ", "_"))
    except ValueError:
        raise HTTPException(400, f"Invalid subject")

    material = Material(
        title=payload.title.strip(),
        chapter=payload.chapter.strip(),
        subject=subj,
        pdf_url=payload.file_url.strip(),
        is_published=True,
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)
    return {"message": "Link saved", "id": str(material.id)}


@router.post("/materials/upload", dependencies=[Depends(require_admin)])
async def admin_upload_material_pdf(
    title: str = Form(...),
    chapter: str = Form(...),
    subject: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """PC থেকে PDF upload → Cloudinary তে store"""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files allowed")

    try:
        subj = SubjectEnum(subject.upper().replace(" ", "_"))
    except ValueError:
        raise HTTPException(400, f"Invalid subject: {subject}")

    # ফাইল bytes read
    contents = await file.read()
    
    if len(contents) > 20 * 1024 * 1024:  # 20MB limit
        raise HTTPException(400, "File too large (max 20MB)")

    # Cloudinary তে upload
    try:
        pdf_url = upload_pdf_to_cloudinary(contents, file.filename)
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {str(e)}")

    # Database তে save
    material = Material(
        title=title.strip(),
        chapter=chapter.strip(),
        subject=subj,
        pdf_url=pdf_url,
        is_published=True,
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)
    
    return {
        "message": "PDF uploaded successfully",
        "file_url": pdf_url,
        "id": str(material.id),
    }


@router.patch("/materials/{material_id}/toggle-publish", dependencies=[Depends(require_admin)])
async def toggle_material_publish(material_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(Material).where(Material.id == material_id)
    res = await db.execute(stmt)
    mat = res.scalar_one_or_none()
    if not mat:
        raise HTTPException(404, "Material not found")
    
    mat.is_published = not getattr(mat, "is_published", True)
    await db.commit()
    return {"message": "Toggled", "is_published": mat.is_published}


@router.delete("/materials/{material_id}", dependencies=[Depends(require_admin)])
async def admin_delete_material(material_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(Material).where(Material.id == material_id)
    res = await db.execute(stmt)
    mat = res.scalar_one_or_none()
    if not mat:
        raise HTTPException(404, "Material not found")
    
    # Cloudinary থেকেও delete করো
    if mat.pdf_url and "cloudinary.com" in mat.pdf_url:
        delete_pdf_from_cloudinary(mat.pdf_url)
    
    await db.delete(mat)
    await db.commit()
    return {"message": "Material deleted permanently"}