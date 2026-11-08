import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.access import days_left, is_admin_user, require_admin, subscription_status
from app.core.database import get_db
from app.models.academic import Material, Notice, SubjectEnum, VideoLecture
from app.models.billing import SubscriptionPayment
from app.models.chat import ChatMessage, ChatSession
from app.models.progress import LectureNote, LectureProgress, StudyActivity, StudyPlan
from app.models.user import User
from app.services import links
from app.services.student_progress import summarize_progress
from app.services.subscription import RenewalError, renew_student, undo_payment

router = APIRouter(prefix="/admin", tags=["Admin Instructor Operations"])

# Every route below needs a real admin login. There is no fallback identity.
verify_admin_token = require_admin


# ---------- schemas ----------

class StudentOut(BaseModel):
    id: str
    full_name: str
    email: str
    school: Optional[str] = None
    grade_class: Optional[str] = None
    batch_no: Optional[str] = None
    is_approved: bool = False  # true while the subscription is running
    subscription_end_date: Optional[datetime] = None
    days_left: int = 0
    status: str = "pending"  # active | expiring | expired | pending
    created_at: Optional[datetime] = None
    completed_lectures: int = 0
    progress_percent: int = 0
    last_active: Optional[str] = None


class StudentUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=120)
    school: Optional[str] = Field(default=None, max_length=160)
    grade_class: Optional[str] = Field(default=None, max_length=60)
    batch_no: Optional[str] = Field(default=None, max_length=60)


class RenewIn(BaseModel):
    days: int = Field(ge=1, le=366)
    amount: Optional[int] = Field(default=None, ge=0, le=10_000_000)  # taka received, optional
    note: Optional[str] = Field(default=None, max_length=200)


class LectureCreate(BaseModel):
    lecture_no: int
    title: str = ""
    topic: str = ""
    chapter: str
    subject: str
    video_url: str


class LectureUpdate(BaseModel):
    lecture_no: Optional[int] = None
    title: Optional[str] = None
    topic: Optional[str] = None
    chapter: Optional[str] = None
    subject: Optional[str] = None
    video_url: Optional[str] = None


class SwapOrderPayload(BaseModel):
    lecture_id_1: str
    lecture_id_2: str


class NormalizeOrderPayload(BaseModel):
    subject: str
    chapter: str


class MaterialCreate(BaseModel):
    title: str
    chapter: str
    subject: str
    file_url: str


class MaterialUpdate(BaseModel):
    title: Optional[str] = None
    chapter: Optional[str] = None
    subject: Optional[str] = None
    file_url: Optional[str] = None


class NoticeIn(BaseModel):
    content: str = Field(min_length=1, max_length=500)


# ---------- helpers ----------

def parse_subject_enum(subj: str) -> SubjectEnum:
    s = subj.strip().upper().replace(" ", "_")
    if "CHEM" in s:
        return SubjectEnum.CHEMISTRY
    if "MATH" in s:
        return SubjectEnum.HIGHER_MATH
    return SubjectEnum.PHYSICS


def _uuid(value: str, what: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {what} UUID.")


def _subject_name(subj) -> str:
    return subj.value if hasattr(subj, "value") else str(subj)


def _bad_link(exc: ValueError) -> HTTPException:
    return HTTPException(status_code=422, detail=str(exc))


async def _get_student(db: AsyncSession, student_id: str) -> User:
    res = await db.execute(select(User).where(User.id == _uuid(student_id, "student")))
    student = res.scalar_one_or_none()
    if not student or is_admin_user(student):
        raise HTTPException(status_code=404, detail="Student not found.")
    return student


async def _published_lectures(db: AsyncSession) -> List[VideoLecture]:
    res = await db.execute(
        select(VideoLecture).where(or_(VideoLecture.is_published.is_(True), VideoLecture.is_published.is_(None)))
    )
    return list(res.scalars().all())


def _student_out(u: User, now: datetime, completed: int = 0, total: int = 0, last_active=None) -> StudentOut:
    state = subscription_status(u, now)
    return StudentOut(
        id=str(u.id),
        full_name=u.full_name or "Student",
        email=u.email,
        school=u.school,
        grade_class=u.grade_class,
        batch_no=u.batch_no or "General",
        is_approved=state in ("active", "expiring"),
        subscription_end_date=u.subscription_end_date,
        days_left=days_left(u, now),
        status=state,
        created_at=u.created_at,
        completed_lectures=completed,
        progress_percent=round(100 * completed / total) if total else 0,
        last_active=last_active.isoformat() + "Z" if last_active else None,
    )


async def _all_students(db: AsyncSession) -> List[User]:
    res = await db.execute(select(User).order_by(desc(User.created_at)))
    return [u for u in res.scalars().all() if not is_admin_user(u)]


# ---------- OVERVIEW (analytics) ----------

@router.get("/overview")
async def overview(admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)):
    now = datetime.utcnow()
    students = await _all_students(db)

    counts = {"active": 0, "expiring": 0, "expired": 0, "pending": 0}
    batches: Dict[str, Dict[str, int]] = {}
    attention = []
    new_this_week = 0
    for u in students:
        state = subscription_status(u, now)
        counts[state] += 1
        batch = (u.batch_no or "General").strip() or "General"
        row = batches.setdefault(batch, {"total": 0, "paid": 0, "expired": 0, "pending": 0})
        row["total"] += 1
        row["paid" if state in ("active", "expiring") else state] += 1
        if u.created_at and u.created_at >= now - timedelta(days=7):
            new_this_week += 1

        item = {
            "id": str(u.id),
            "full_name": u.full_name or "Student",
            "batch_no": batch,
            "status": state,
            "days_left": days_left(u, now),
        }
        if state == "expiring":
            attention.append({**item, "reason": "expiring"})
        elif state == "expired" and u.subscription_end_date and u.subscription_end_date >= now - timedelta(days=14):
            attention.append({**item, "reason": "recently_expired"})
        elif state == "pending" and u.created_at and u.created_at >= now - timedelta(days=14):
            attention.append({**item, "reason": "new_unpaid"})
    order = {"expiring": 0, "recently_expired": 1, "new_unpaid": 2}
    attention.sort(key=lambda a: (order[a["reason"]], a["days_left"], a["full_name"].lower()))

    lectures = (await db.execute(select(VideoLecture))).scalars().all()
    materials = (await db.execute(select(Material))).scalars().all()

    def content(rows):
        by_subject: Dict[str, int] = {}
        published = 0
        for r in rows:
            if r.is_published is None or r.is_published:
                published += 1
                key = _subject_name(r.subject)
                by_subject[key] = by_subject.get(key, 0) + 1
        return {"total": len(rows), "published": published, "by_subject": by_subject}

    since = now - timedelta(days=7)
    ai_messages = (
        await db.execute(
            select(func.count(ChatMessage.id)).where(ChatMessage.role == "user", ChatMessage.created_at >= since)
        )
    ).scalar_one()
    ai_students = (
        await db.execute(
            select(func.count(func.distinct(ChatSession.user_id)))
            .select_from(ChatSession)
            .join(ChatMessage, ChatMessage.session_id == ChatSession.id)
            .where(ChatMessage.role == "user", ChatMessage.created_at >= since)
        )
    ).scalar_one()

    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    pay_rows = (
        await db.execute(
            select(SubscriptionPayment.amount).where(
                SubscriptionPayment.voided_at.is_(None), SubscriptionPayment.created_at >= month_start
            )
        )
    ).all()

    return {
        "totals": {"students": len(students), "paid_now": counts["active"] + counts["expiring"], **counts},
        "new_this_week": new_this_week,
        "attention": attention[:15],
        "batches": [{"batch": k, **v} for k, v in sorted(batches.items())],
        "lectures": content(lectures),
        "materials": content(materials),
        "ai": {"messages_7d": int(ai_messages or 0), "students_7d": int(ai_students or 0)},
        "collected_this_month": {
            "payments": len(pay_rows),
            "amount": sum(a or 0 for (a,) in pay_rows),
            "amounts_recorded": sum(1 for (a,) in pay_rows if a is not None),
        },
    }


# ---------- STUDENTS ----------

@router.get("/students", response_model=List[StudentOut])
async def list_students(admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)):
    now = datetime.utcnow()
    students = await _all_students(db)
    lecture_ids = [str(l.id) for l in await _published_lectures(db)]

    completed: Dict[uuid.UUID, int] = {}
    last_seen: Dict[uuid.UUID, datetime] = {}
    if students:
        if lecture_ids:
            rows = await db.execute(
                select(LectureProgress.user_id, func.count(LectureProgress.id))
                .where(LectureProgress.completed.is_(True), LectureProgress.lecture_id.in_(lecture_ids))
                .group_by(LectureProgress.user_id)
            )
            completed = {uid: n for uid, n in rows.all()}
        rows = await db.execute(
            select(LectureProgress.user_id, func.max(LectureProgress.updated_at)).group_by(LectureProgress.user_id)
        )
        last_seen = {uid: ts for uid, ts in rows.all()}

    return [
        _student_out(u, now, completed.get(u.id, 0), len(lecture_ids), last_seen.get(u.id)) for u in students
    ]


def _payment_json(p: SubscriptionPayment, latest_id) -> dict:
    return {
        "id": str(p.id),
        "days_added": p.days_added,
        "amount": p.amount,
        "method": p.method,
        "note": p.note,
        "previous_end": p.previous_end.isoformat() + "Z" if p.previous_end else None,
        "new_end": p.new_end.isoformat() + "Z",
        "recorded_by": p.recorded_by,
        "created_at": p.created_at.isoformat() + "Z",
        "voided": p.voided_at is not None,
        "can_undo": p.voided_at is None and p.id == latest_id,
    }


@router.get("/students/{student_id}")
async def student_detail(student_id: str, admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)):
    """One student: profile, payment history and learning progress (what the admin sees on click)."""
    student = await _get_student(db, student_id)
    now = datetime.utcnow()

    lectures = await _published_lectures(db)
    lecture_dicts = [
        {
            "id": str(l.id),
            "title": l.topic,
            "subject": _subject_name(l.subject),
            "chapter": l.chapter or "General",
            "lecture_no": l.lecture_no if l.lecture_no is not None else 1,
        }
        for l in lectures
    ]
    prog_rows = (await db.execute(select(LectureProgress).where(LectureProgress.user_id == student.id))).scalars().all()
    days = (await db.execute(select(StudyActivity.day).where(StudyActivity.user_id == student.id))).scalars().all()
    notes = (
        await db.execute(select(func.count(LectureNote.id)).where(LectureNote.user_id == student.id, LectureNote.content != ""))
    ).scalar_one()
    plans = (await db.execute(select(func.count(StudyPlan.id)).where(StudyPlan.user_id == student.id))).scalar_one()

    progress = summarize_progress(
        lecture_dicts,
        [
            {
                "lecture_id": r.lecture_id,
                "completed": bool(r.completed),
                "position": r.position or 0,
                "duration": r.duration or 0,
                "updated_at": r.updated_at,
            }
            for r in prog_rows
        ],
        list(days),
        int(notes or 0),
        int(plans or 0),
        now.date(),
    )

    payments = (
        await db.execute(
            select(SubscriptionPayment)
            .where(SubscriptionPayment.user_id == student.id)
            .order_by(desc(SubscriptionPayment.created_at))
            .limit(50)
        )
    ).scalars().all()
    latest_id = next((p.id for p in payments if p.voided_at is None), None)

    last_seen = max((r.updated_at for r in prog_rows if r.updated_at), default=None)
    return {
        "student": _student_out(student, now, progress["completed_lectures"], progress["total_lectures"], last_seen),
        "payments": [_payment_json(p, latest_id) for p in payments],
        "progress": progress,
    }


@router.patch("/students/{student_id}", response_model=StudentOut)
async def update_student(
    student_id: str,
    payload: StudentUpdate,
    admin: User = Depends(verify_admin_token),
    db: AsyncSession = Depends(get_db),
):
    student = await _get_student(db, student_id)
    data = payload.model_dump(exclude_unset=True)
    if "full_name" in data:
        name = (data["full_name"] or "").strip()
        if not name:
            raise HTTPException(status_code=422, detail="Name cannot be empty.")
        student.full_name = name
    for field in ("school", "grade_class", "batch_no"):
        if field in data:
            setattr(student, field, (data[field] or "").strip() or None)
    await db.commit()
    return _student_out(student, datetime.utcnow())


@router.post("/students/{student_id}/renew")
async def renew_subscription(
    student_id: str,
    payload: RenewIn,
    admin: User = Depends(verify_admin_token),
    db: AsyncSession = Depends(get_db),
):
    """Record a cash payment and extend the subscription (from today, or from the current end date if still running)."""
    student = await _get_student(db, student_id)
    try:
        payment = await renew_student(db, student, admin.email, payload.days, payload.amount, payload.note)
    except RenewalError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return {
        "message": f"Renewed for {payload.days} days.",
        "payment_id": str(payment.id),
        "subscription_end_date": payment.new_end.isoformat() + "Z",
        "days_left": days_left(student),
    }


@router.post("/payments/{payment_id}/undo")
async def undo_renewal(payment_id: str, admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SubscriptionPayment).where(SubscriptionPayment.id == _uuid(payment_id, "payment")))
    payment = res.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found.")
    try:
        student = await undo_payment(db, payment)
    except RenewalError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return {"message": "Payment undone.", "days_left": days_left(student)}


@router.post("/students/{student_id}/revoke-access")
async def mark_student_unpaid(student_id: str, admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)):
    student = await _get_student(db, student_id)
    student.is_approved = False
    student.subscription_end_date = None
    student.current_session_token = None
    await db.commit()
    return {"message": f"Student {student.email} marked as Unpaid."}


@router.delete("/students/{student_id}")
async def delete_student(student_id: str, admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)):
    student = await _get_student(db, student_id)
    await db.delete(student)
    await db.commit()
    return {"message": "Student account deleted permanently."}


# ---------- VIDEO LECTURES ----------

def _lecture_json(l: VideoLecture) -> dict:
    return {
        "id": str(l.id),
        "lecture_no": l.lecture_no if l.lecture_no is not None else 1,
        "title": l.topic,
        "topic": l.topic,
        "chapter": l.chapter or "General",
        "subject": _subject_name(l.subject),
        "video_url": l.youtube_url,
        "is_published": True if l.is_published is None else bool(l.is_published),
    }


async def _get_lecture(db: AsyncSession, lecture_id: str) -> VideoLecture:
    res = await db.execute(select(VideoLecture).where(VideoLecture.id == _uuid(lecture_id, "lecture")))
    lec = res.scalar_one_or_none()
    if not lec:
        raise HTTPException(status_code=404, detail="Lecture not found.")
    return lec


@router.get("/lectures")
async def get_admin_lectures(admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)):
    """Every lecture, including unpublished ones, so a hidden lecture can always be published again."""
    res = await db.execute(select(VideoLecture).order_by(VideoLecture.lecture_no.asc(), VideoLecture.created_at.asc()))
    return [_lecture_json(l) for l in res.scalars().all()]


@router.post("/lectures")
async def add_lecture(payload: LectureCreate, admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)):
    title = (payload.title or payload.topic).strip()
    if not title:
        raise HTTPException(status_code=422, detail="Lecture title is required.")
    try:
        url = links.validate_youtube_url(payload.video_url)
    except ValueError as exc:
        raise _bad_link(exc)
    lecture = VideoLecture(
        lecture_no=payload.lecture_no,
        topic=title,
        chapter=payload.chapter.strip(),
        subject=parse_subject_enum(payload.subject),
        youtube_url=url,
        is_published=True,
    )
    db.add(lecture)
    await db.commit()
    return {"message": "Lecture added successfully."}


@router.put("/lectures/{lecture_id}")
async def update_lecture(
    lecture_id: str, payload: LectureUpdate, admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)
):
    lec = await _get_lecture(db, lecture_id)
    if payload.lecture_no is not None:
        lec.lecture_no = payload.lecture_no
    new_title = (payload.title or payload.topic or "").strip()
    if new_title:
        lec.topic = new_title
    if payload.chapter is not None:
        lec.chapter = payload.chapter.strip()
    if payload.subject is not None:
        lec.subject = parse_subject_enum(payload.subject)
    if payload.video_url is not None and payload.video_url.strip() != lec.youtube_url:
        try:
            lec.youtube_url = links.validate_youtube_url(payload.video_url)
        except ValueError as exc:
            raise _bad_link(exc)
    await db.commit()
    return {"message": "Lecture updated successfully."}


@router.post("/lectures/swap-order")
async def swap_lecture_order(
    payload: SwapOrderPayload, admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)
):
    lec1 = await _get_lecture(db, payload.lecture_id_1)
    lec2 = await _get_lecture(db, payload.lecture_id_2)
    lec1.lecture_no, lec2.lecture_no = lec2.lecture_no, lec1.lecture_no
    await db.commit()
    return {"message": "Lecture sequence swapped successfully."}


@router.post("/lectures/normalize-order")
async def normalize_lecture_order(
    payload: NormalizeOrderPayload, admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(VideoLecture)
        .where(VideoLecture.subject == parse_subject_enum(payload.subject))
        .where(VideoLecture.chapter == payload.chapter.strip())
        .order_by(VideoLecture.lecture_no.asc(), VideoLecture.created_at.asc())
    )
    chapter_lectures = res.scalars().all()
    for idx, lec in enumerate(chapter_lectures, start=1):
        lec.lecture_no = idx
    await db.commit()
    return {"message": f"Renumbered {len(chapter_lectures)} lectures sequentially (1..{len(chapter_lectures)})."}


@router.patch("/lectures/{lecture_id}/toggle-publish")
async def toggle_lecture_publish(lecture_id: str, admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)):
    lec = await _get_lecture(db, lecture_id)
    lec.is_published = not (lec.is_published if lec.is_published is not None else True)
    await db.commit()
    return {"message": f"Lecture publish status changed to {lec.is_published}.", "is_published": lec.is_published}


@router.delete("/lectures/{lecture_id}")
async def delete_lecture(lecture_id: str, admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)):
    lec = await _get_lecture(db, lecture_id)
    await db.delete(lec)
    await db.commit()
    return {"message": "Lecture deleted permanently."}


# ---------- STUDY MATERIALS (Google Drive links only) ----------

def _material_json(m: Material) -> dict:
    return {
        "id": str(m.id),
        "title": m.title,
        "chapter": m.chapter,
        "subject": _subject_name(m.subject),
        "file_url": m.pdf_url or "",
        "is_published": True if m.is_published is None else bool(m.is_published),
    }


async def _get_material(db: AsyncSession, material_id: str) -> Material:
    res = await db.execute(select(Material).where(Material.id == _uuid(material_id, "material")))
    mat = res.scalar_one_or_none()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found.")
    return mat


@router.get("/materials")
async def get_admin_materials(admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Material).order_by(Material.created_at.desc()))
    return [_material_json(m) for m in res.scalars().all()]


@router.post("/materials")
async def add_material(payload: MaterialCreate, admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)):
    if not payload.title.strip():
        raise HTTPException(status_code=422, detail="Title is required.")
    try:
        url = links.normalize_drive_url(payload.file_url)
    except ValueError as exc:
        raise _bad_link(exc)
    db.add(
        Material(
            title=payload.title.strip(),
            chapter=payload.chapter.strip(),
            subject=parse_subject_enum(payload.subject),
            pdf_url=url,
            is_published=True,
        )
    )
    await db.commit()
    return {"message": "Study material added successfully.", "file_url": url}


@router.put("/materials/{material_id}")
async def update_material(
    material_id: str, payload: MaterialUpdate, admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)
):
    mat = await _get_material(db, material_id)
    if payload.title is not None and payload.title.strip():
        mat.title = payload.title.strip()
    if payload.chapter is not None:
        mat.chapter = payload.chapter.strip()
    if payload.subject is not None:
        mat.subject = parse_subject_enum(payload.subject)
    if payload.file_url is not None and payload.file_url.strip() != (mat.pdf_url or ""):
        try:
            mat.pdf_url = links.normalize_drive_url(payload.file_url)
        except ValueError as exc:
            raise _bad_link(exc)
    await db.commit()
    return {"message": "Material updated successfully."}


@router.patch("/materials/{material_id}/toggle-publish")
async def toggle_material_publish(material_id: str, admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)):
    mat = await _get_material(db, material_id)
    mat.is_published = not (mat.is_published if mat.is_published is not None else True)
    await db.commit()
    return {"message": f"Material publish status changed to {mat.is_published}.", "is_published": mat.is_published}


@router.delete("/materials/{material_id}")
async def delete_material(material_id: str, admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)):
    mat = await _get_material(db, material_id)
    await db.delete(mat)
    await db.commit()
    return {"message": "Material deleted permanently."}


# ---------- NOTICES (shown to students with a running subscription) ----------

@router.get("/notices")
async def list_notices(admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Notice).order_by(desc(Notice.created_at)).limit(30))
    return [{"id": str(n.id), "content": n.content, "created_at": n.created_at.isoformat() + "Z"} for n in res.scalars().all()]


@router.post("/notices", status_code=201)
async def add_notice(payload: NoticeIn, admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)):
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=422, detail="Notice cannot be empty.")
    notice = Notice(content=content, created_at=datetime.utcnow())
    db.add(notice)
    await db.commit()
    return {"id": str(notice.id), "content": notice.content, "created_at": notice.created_at.isoformat() + "Z"}


@router.delete("/notices/{notice_id}")
async def delete_notice(notice_id: str, admin: User = Depends(verify_admin_token), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Notice).where(Notice.id == _uuid(notice_id, "notice")))
    notice = res.scalar_one_or_none()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found.")
    await db.delete(notice)
    await db.commit()
    return {"message": "Notice deleted."}
