from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.user import User
from app.models.academic import VideoLecture, Material
from app.api.v1.auth import get_current_active_user

router = APIRouter(prefix="/admin", tags=["Admin Portal"])


# Admin Permission Dependency
async def get_current_admin(current_user: User = Depends(get_current_active_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Shudhu teacher/admin ei panel access korte parbe."
        )
    return current_user


# Schemas
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


@router.get("/students", response_model=List[StudentOut])
async def list_all_students(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.is_admin == False).order_by(User.id.desc())
    res = await db.execute(stmt)
    students = res.scalars().all()

    now = datetime.utcnow()
    output = []
    for s in students:
        remaining_days = 0
        if s.subscription_end_date and s.subscription_end_date > now:
            remaining_days = (s.subscription_end_date - now).days + 1

        output.append(StudentOut(
            id=s.id,
            full_name=s.full_name,
            email=s.email,
            school=s.school,
            grade_class=s.grade_class,
            batch_no=s.batch_no,
            is_approved=s.is_approved,
            subscription_end_date=s.subscription_end_date,
            days_left=remaining_days
        ))
    return output


@router.post("/students/{student_id}/approve-and-pay")
async def approve_and_renew_student(
    student_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.id == student_id)
    res = await db.execute(stmt)
    student = res.scalar_one_or_none()

    if not student:
        raise HTTPException(status_code=404, detail="Student khuje paoa jay ni.")

    now = datetime.utcnow()
    # 30 Days Rolling Subscription Calculation
    if student.subscription_end_date and student.subscription_end_date > now:
        student.subscription_end_date += timedelta(days=30)
    else:
        student.subscription_end_date = now + timedelta(days=30)

    student.is_approved = True
    await db.commit()
    await db.refresh(student)

    return {
        "message": f"{student.full_name}-er 30 diner access update kora hoyeche!",
        "new_end_date": student.subscription_end_date
    }


@router.post("/lectures")
async def add_video_lecture(
    payload: LectureCreate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    lecture = VideoLecture(**payload.dict())
    db.add(lecture)
    await db.commit()
    return {"message": "Video lecture shofolbhabe upload hoyeche!"}


@router.post("/materials")
async def add_lecture_material(
    payload: MaterialCreate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    mat = Material(**payload.dict())
    db.add(mat)
    await db.commit()
    return {"message": "Lecture PDF/Sheet shofolbhabe upload hoyeche!"}