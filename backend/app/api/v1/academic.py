from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List
import uuid

from app.core.database import get_db
from app.models.academic import Material, VideoLecture
from app.schemas.academic import MaterialCreate, MaterialResponse, VideoCreate, VideoResponse
from app.core.deps import require_admin

router = APIRouter(prefix="/academic", tags=["Academic"])

# --- MATERIALS (PDF ONLY) ---

@router.get("/materials", response_model=List[MaterialResponse])
async def list_materials(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Material).order_by(Material.created_at.desc()))
    return result.scalars().all()

@router.post("/materials", response_model=MaterialResponse, dependencies=[Depends(require_admin)])
async def create_material(payload: MaterialCreate, db: AsyncSession = Depends(get_db)):
    material = Material(
        title=payload.title,
        chapter=payload.chapter,
        subject=payload.subject,
        pdf_url=payload.pdf_url
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)
    return material

@router.delete("/materials/{material_id}", dependencies=[Depends(require_admin)])
async def delete_material(material_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(Material).where(Material.id == material_id)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Material not found")
    
    await db.delete(item)
    await db.commit()
    return {"message": "Material removed successfully"}


# --- VIDEOS (YOUTUBE) ---

@router.get("/videos", response_model=List[VideoResponse])
async def list_videos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(VideoLecture).order_by(VideoLecture.created_at.desc()))
    return result.scalars().all()

@router.post("/videos", response_model=VideoResponse, dependencies=[Depends(require_admin)])
async def create_video(payload: VideoCreate, db: AsyncSession = Depends(get_db)):
    video = VideoLecture(
        title=payload.title,
        chapter=payload.chapter,
        subject=payload.subject,
        youtube_url=payload.youtube_url
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)
    return video

@router.delete("/videos/{video_id}", dependencies=[Depends(require_admin)])
async def delete_video(video_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(VideoLecture).where(VideoLecture.id == video_id)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Video not found")
    
    await db.delete(item)
    await db.commit()
    return {"message": "Video lecture removed successfully"}