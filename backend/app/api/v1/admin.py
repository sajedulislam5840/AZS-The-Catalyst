from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.models.user import User, UserRole
from app.api.v1.auth import get_current_active_user

# Safe dynamic import jate model missing thakleo server crash na kore
try:
    from app.models.academic import Lecture, Material
except Exception:
    Lecture = None
    Material = None

router = APIRouter(prefix="/admin", tags=["Admin Instructor Operations"])


class StudentOut(BaseModel):
    id: int
    full_name: str
    email: str
    school: Optional[str]
    grade_class: Optional[str]
    batch_no: Optional[str]
    is_approved: bool
    subscription_end_date: Optional[datetime]
    days_left: int

    class Config:
        from_attributes = True


class LectureCreate(BaseModel):
    lecture_no: int
    title: str
    topic: str
    chapter: str
    subject: str
    video_url: str


class MaterialCreate(BaseModel):
    title: str
    chapter: str
    subject: str
    file_url: str


async def verify_admin(current_user: User = Depends(get_current_active_user)):
    if not (current_user.is_admin or current_user.role == UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Instructor/Admin privileges required."
        )
    return current_user


@router.get("/students", response_model=List[StudentOut])
async def list_students(
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.is_admin == False).order_by(desc(User.created_at))
    res = await db.execute(stmt)
    students = res.scalars().all()

    output = []
    now = datetime.utcnow()
    for s in students:
        days = 0
        if s.subscription_end_date and s.subscription_end_date > now:
            days = (s.subscription_end_date - now).days + 1
        output.append(
            StudentOut(
                id=s.id,
                full_name=s.full_name or "N/A",
                email=s.email,
                school=s.school,
                grade_class=s.grade_class,
                batch_no=s.batch_no,
                is_approved=s.is_approved,
                subscription_end_date=s.subscription_end_date,
                days_left=days,
            )
        )
    return output


@router.post("/students/{student_id}/approve-and-pay")
async def approve_and_extend_30_days(
    student_id: int,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.id == student_id)
    res = await db.execute(stmt)
    student = res.scalar_one_or_none()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    student.is_approved = True
    now = datetime.utcnow()
    if student.subscription_end_date and student.subscription_end_date > now:
        student.subscription_end_date += timedelta(days=30)
    else:
        student.subscription_end_date = now + timedelta(days=30)

    await db.commit()
    return {
        "message": f"Student access extended by 30 days until {student.subscription_end_date.strftime('%Y-%m-%d')}"
    }


@router.post("/lectures")
async def add_lecture(
    payload: LectureCreate,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    if Lecture is None:
        raise HTTPException(
            status_code=500,
            detail="Lecture database model is not configured properly in app.models.academic"
        )
    lecture = Lecture(
        lecture_no=payload.lecture_no,
        title=payload.title,
        topic=payload.topic,
        chapter=payload.chapter,
        subject=payload.subject,
        video_url=payload.video_url,
    )
    db.add(lecture)
    await db.commit()
    return {"message": "Lecture added successfully."}


@router.post("/materials")
async def add_material(
    payload: MaterialCreate,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    if Material is None:
        raise HTTPException(
            status_code=500,
            detail="Material database model is not configured properly in app.models.academic"
        )
    material = Material(
        title=payload.title,
        chapter=payload.chapter,
        subject=payload.subject,
        file_url=payload.file_url,
    )
    db.add(material)
    await db.commit()
    return {"message": "Lecture material added successfully."}