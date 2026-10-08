import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_

from app.core.database import get_db
from app.models.user import User
from app.api.v1.auth import get_current_active_user

try:
    from app.models.academic import Lecture, Material
except Exception:
    Lecture = None
    Material = None

router = APIRouter(prefix="/admin", tags=["Admin Instructor Operations"])

ADMIN_EMAIL = "rabbi@edutrack.com"


# ---------- SCHEMAS ----------
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
    lecture_no: int = Field(..., ge=1)
    title: str = Field(..., min_length=1, max_length=255)
    topic: str = Field(..., min_length=1, max_length=255)
    chapter: str = Field(..., min_length=1, max_length=255)
    subject: str = Field(..., min_length=1, max_length=100)
    video_url: str = Field(..., min_length=1)


class MaterialCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    chapter: str = Field(..., min_length=1, max_length=255)
    subject: str = Field(..., min_length=1, max_length=100)
    file_url: str = Field(..., min_length=1)


class MessageResponse(BaseModel):
    message: str


# ---------- SECURE ADMIN VERIFICATION ----------
async def verify_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Strict admin verification. Requires a valid authenticated session.
    No fallbacks, no backdoors.
    """
    user_role = str(
        current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    ).upper()

    is_authorized = bool(
        current_user.is_admin
        or user_role == "ADMIN"
        or (current_user.email and current_user.email.strip().lower() == ADMIN_EMAIL)
    )

    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Instructor/Admin privileges required.",
        )
    return current_user


# ---------- HELPERS ----------
def _parse_uuid(student_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(student_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid student UUID.")


async def _get_student_or_404(db: AsyncSession, student_uuid: uuid.UUID) -> User:
    res = await db.execute(select(User).where(User.id == student_uuid))
    student = res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    return student


# ---------- STUDENT MANAGEMENT ----------
@router.get("/students", response_model=List[StudentOut])
async def list_students(
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(User)
        .where(
            or_(
                User.is_admin == False,
                User.is_admin.is_(None),
                User.email != ADMIN_EMAIL,
            )
        )
        .where(User.id != admin.id)
        .order_by(desc(User.created_at))
    )
    res = await db.execute(stmt)
    students = res.scalars().all()

    now = datetime.utcnow()
    output = []
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


@router.post("/students/{student_id}/approve-and-pay", response_model=MessageResponse)
async def approve_and_extend_30_days(
    student_id: str,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    student = await _get_student_or_404(db, _parse_uuid(student_id))

    student.is_approved = True
    student.is_active = True
    now = datetime.utcnow()

    if student.subscription_end_date and student.subscription_end_date > now:
        student.subscription_end_date += timedelta(days=30)
    else:
        student.subscription_end_date = now + timedelta(days=30)

    await db.commit()
    await db.refresh(student)

    return MessageResponse(
        message=f"Access approved for {student.email} until "
        f"{student.subscription_end_date.strftime('%Y-%m-%d')}"
    )


@router.post("/students/{student_id}/revoke-access", response_model=MessageResponse)
async def revoke_student_access(
    student_id: str,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    student = await _get_student_or_404(db, _parse_uuid(student_id))

    student.is_approved = False
    student.subscription_end_date = None
    student.current_session_token = None

    await db.commit()
    await db.refresh(student)

    return MessageResponse(message=f"Access revoked for {student.email}.")


@router.delete("/students/{student_id}", response_model=MessageResponse)
async def delete_student(
    student_id: str,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    student = await _get_student_or_404(db, _parse_uuid(student_id))

    if student.id == admin.id or (student.email and student.email.lower() == ADMIN_EMAIL):
        raise HTTPException(status_code=400, detail="Cannot delete administrator account.")

    await db.delete(student)
    await db.commit()

    return MessageResponse(message=f"Student {student.email} deleted successfully.")


# ---------- VIDEO LECTURES ----------
@router.get("/lectures")
async def get_admin_lectures(
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    if Lecture is None:
        return []
    stmt = select(Lecture).order_by(Lecture.lecture_no.desc())
    res = await db.execute(stmt)
    lectures = res.scalars().all()
    return [
        {
            "id": l.id,
            "lecture_no": l.lecture_no,
            "title": l.title,
            "topic": l.topic,
            "chapter": l.chapter,
            "subject": l.subject,
            "video_url": l.video_url,
            "is_published": getattr(l, "is_published", True),
        }
        for l in lectures
    ]


@router.post("/lectures", response_model=MessageResponse)
async def add_lecture(
    payload: LectureCreate,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
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
    return MessageResponse(message="Lecture added successfully.")


@router.patch("/lectures/{lecture_id}/toggle-publish", response_model=MessageResponse)
async def toggle_lecture_publish(
    lecture_id: int,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    if Lecture is None:
        raise HTTPException(status_code=500, detail="Lecture model is not defined.")

    res = await db.execute(select(Lecture).where(Lecture.id == lecture_id))
    lec = res.scalar_one_or_none()
    if not lec:
        raise HTTPException(status_code=404, detail="Lecture not found.")

    current_status = getattr(lec, "is_published", True)
    setattr(lec, "is_published", not current_status)
    await db.commit()
    return MessageResponse(
        message=f"Lecture {'unpublished' if current_status else 'published'}."
    )


@router.delete("/lectures/{lecture_id}", response_model=MessageResponse)
async def delete_lecture(
    lecture_id: int,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    if Lecture is None:
        raise HTTPException(status_code=500, detail="Lecture model is not defined.")

    res = await db.execute(select(Lecture).where(Lecture.id == lecture_id))
    lec = res.scalar_one_or_none()
    if not lec:
        raise HTTPException(status_code=404, detail="Lecture not found.")

    await db.delete(lec)
    await db.commit()
    return MessageResponse(message="Lecture deleted permanently.")


# ---------- PDF MATERIALS ----------
@router.get("/materials")
async def get_admin_materials(
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    if Material is None:
        return []
    stmt = select(Material).order_by(Material.id.desc())
    res = await db.execute(stmt)
    materials = res.scalars().all()
    return [
        {
            "id": m.id,
            "title": m.title,
            "chapter": m.chapter,
            "subject": m.subject,
            "file_url": m.file_url,
            "is_published": getattr(m, "is_published", True),
        }
        for m in materials
    ]


@router.post("/materials", response_model=MessageResponse)
async def add_material(
    payload: MaterialCreate,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
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
    return MessageResponse(message="Lecture material added successfully.")


@router.patch("/materials/{material_id}/toggle-publish", response_model=MessageResponse)
async def toggle_material_publish(
    material_id: int,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    if Material is None:
        raise HTTPException(status_code=500, detail="Material model is not defined.")

    res = await db.execute(select(Material).where(Material.id == material_id))
    mat = res.scalar_one_or_none()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found.")

    current_status = getattr(mat, "is_published", True)
    setattr(mat, "is_published", not current_status)
    await db.commit()
    return MessageResponse(
        message=f"Material {'unpublished' if current_status else 'published'}."
    )


@router.delete("/materials/{material_id}", response_model=MessageResponse)
async def delete_material(
    material_id: int,
    admin: User = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    if Material is None:
        raise HTTPException(status_code=500, detail="Material model is not defined.")

    res = await db.execute(select(Material).where(Material.id == material_id))
    mat = res.scalar_one_or_none()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found.")

    await db.delete(mat)
    await db.commit()
    return MessageResponse(message="Material deleted permanently.")