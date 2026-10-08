import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_, delete

from app.core.database import get_db
from app.models.user import User, UserRole
from app.api.v1.auth import get_current_active_user

try:
    from app.models.academic import Lecture, Material
except Exception:
    Lecture = None
    Material = None

router = APIRouter(prefix="/admin", tags=["Admin Instructor Operations"])


class StudentOut(BaseModel):
    id: str
    full_name: str
    email: str
    school: Optional[str] = None
    grade_class: Optional[str] = None
    batch_no: Optional[str] = None
    is_approved: bool = False
    subscription_end_date: Optional[datetime] = None
    days_left: int = 0

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
    user_role_str = str(current_user.role.value if hasattr(current_user.role, "value") else current_user.role).upper()
    is_authorized = bool(
        current_user.is_admin 
        or user_role_str == "ADMIN"
        or (current_user.email and current_user.email.strip().lower() == "rabbi@edutrack.com")
    )
    
    if not is_authorized:
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
    stmt = (
        select(User)
        .where(
            or_(
                User.is_admin == False,
                User.is_admin.is_(None),
                User.email != "rabbi@edutrack.com"
            )
        )
        .where(User.id != admin.id)
        .order_by(desc(User.created_at))
    )
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
                id=str(s.id),
                full_name=s.full_name or "Student",
                email=s.email,
                school=s.school,
                grade_class=s.grade_class,
                batch_no=s.batch_no,
                is_approved=bool(s.is_approved),
                subscription_end_date=s.subscription_end_date,
                days_left=days,
            )
        )
    return output


@router.post("/students/{student_id}/approve-and-pay")
async def approve_and_extend_30_days(
    student_id: str,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    try:
        student_uuid = uuid.UUID(student_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid student UUID.")

    stmt = select(User).where(User.id == student_uuid)
    res = await db.execute(stmt)
    student = res.scalar_one_or_none()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    student.is_approved = True
    student.is_active = True
    now = datetime.utcnow()

    if student.subscription_end_date and student.subscription_end_date > now:
        student.subscription_end_date += timedelta(days=30)
    else:
        student.subscription_end_date = now + timedelta(days=30)

    await db.commit()
    await db.refresh(student)

    return {
        "message": f"Student access approved and extended by 30 days until {student.subscription_end_date.strftime('%Y-%m-%d')}"
    }


@router.post("/students/{student_id}/revoke-access")
async def revoke_student_access(
    student_id: str,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    try:
        student_uuid = uuid.UUID(student_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid student UUID.")

    stmt = select(User).where(User.id == student_uuid)
    res = await db.execute(stmt)
    student = res.scalar_one_or_none()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    student.is_approved = False
    student.subscription_end_date = None
    student.current_session_token = None

    await db.commit()
    await db.refresh(student)

    return {"message": f"Access revoked for {student.email}. Marked as unpaid."}


@router.delete("/students/{student_id}")
async def delete_student(
    student_id: str,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    try:
        student_uuid = uuid.UUID(student_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid student UUID.")

    stmt = select(User).where(User.id == student_uuid)
    res = await db.execute(stmt)
    student = res.scalar_one_or_none()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if student.id == admin.id or student.email == "rabbi@edutrack.com":
        raise HTTPException(status_code=400, detail="Cannot delete administrator account.")

    await db.delete(student)
    await db.commit()

    return {"message": f"Student {student.email} has been permanently deleted from the database."}


@router.post("/lectures")
async def add_lecture(
    payload: LectureCreate,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    if Lecture is None:
        raise HTTPException(status_code=500, detail="Lecture model is not defined.")
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
        raise HTTPException(status_code=500, detail="Material model is not defined.")
    material = Material(
        title=payload.title,
        chapter=payload.chapter,
        subject=payload.subject,
        file_url=payload.file_url,
    )
    db.add(material)
    await db.commit()
    return {"message": "Lecture material added successfully."}