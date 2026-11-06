import re
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import ALGORITHM, SECRET_KEY
from app.core.database import get_db
from app.models.progress import LectureNote, LectureProgress, StudyActivity, StudyPlan
from app.models.user import User

router = APIRouter(prefix="/progress", tags=["Student Progress"])

DAY_PATTERN = r"^\d{4}-\d{2}-\d{2}$"
DAY_RE = re.compile(DAY_PATTERN)
MAX_SECONDS = 24 * 60 * 60
MAX_IMPORT_ITEMS = 1000


# ---------- auth ----------

async def get_current_student(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication token required.")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalid or expired.")
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token identity.")

    res = await db.execute(select(User).where(func.lower(User.email) == str(email).strip().lower()))
    user = res.scalar_one_or_none()
    if user is None or user.is_active is False:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.")
    return user


# ---------- schemas ----------

class LectureProgressIn(BaseModel):
    completed: Optional[bool] = None
    position: Optional[int] = Field(default=None, ge=0)
    duration: Optional[int] = Field(default=None, ge=0)
    day: Optional[str] = Field(default=None, pattern=DAY_PATTERN)


class LectureProgressOut(BaseModel):
    lecture_id: str
    completed: bool
    completed_at: Optional[str] = None
    position: int
    duration: int
    updated_at: str


class NoteIn(BaseModel):
    content: str = Field(default="", max_length=20000)
    day: Optional[str] = Field(default=None, pattern=DAY_PATTERN)


class NoteOut(BaseModel):
    content: str
    updated_at: str


class PlanIn(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    date_key: str = Field(pattern=DAY_PATTERN)
    title: str = Field(min_length=1, max_length=200)
    time: Optional[str] = Field(default=None, max_length=40)
    source: str = Field(default="manual", pattern=r"^(manual|auto)$")


class PlanOut(BaseModel):
    id: str
    date_key: str
    title: str
    time: Optional[str] = None
    source: str


class ProgressOut(BaseModel):
    lectures: List[LectureProgressOut]
    notes: Dict[str, NoteOut]
    plans: List[PlanOut]
    activity_days: List[str]


class ImportIn(BaseModel):
    watched: List[str] = Field(default_factory=list, max_length=MAX_IMPORT_ITEMS)
    notes: Dict[str, str] = Field(default_factory=dict)
    plans: List[PlanIn] = Field(default_factory=list, max_length=MAX_IMPORT_ITEMS)
    day: Optional[str] = Field(default=None, pattern=DAY_PATTERN)


# ---------- helpers ----------

def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() + "Z" if value else None


def _check_lecture_id(lecture_id: str) -> str:
    lecture_id = lecture_id.strip()
    if not lecture_id or len(lecture_id) > 64:
        raise HTTPException(status_code=422, detail="Invalid lecture id.")
    return lecture_id


async def _get_or_create(db: AsyncSession, model, filters: dict, defaults: Optional[dict] = None):
    """Select the row, or insert it. Two concurrent first-writes can race on the unique
    constraint; the loser rolls back and reads the winner's row instead of returning a 500."""
    stmt = select(model).filter_by(**filters)
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is not None:
        return row
    row = model(**filters, **(defaults or {}))
    try:
        async with db.begin_nested():
            db.add(row)
            await db.flush()
    except IntegrityError:
        row = (await db.execute(stmt)).scalar_one()
    return row


async def _touch_day(db: AsyncSession, user_id, day: Optional[str]) -> None:
    if day and DAY_RE.match(day):
        await _get_or_create(db, StudyActivity, {"user_id": user_id, "day": day})


async def _snapshot(db: AsyncSession, user: User) -> ProgressOut:
    lectures = (
        await db.execute(select(LectureProgress).where(LectureProgress.user_id == user.id))
    ).scalars().all()
    notes = (await db.execute(select(LectureNote).where(LectureNote.user_id == user.id))).scalars().all()
    plans = (
        await db.execute(
            select(StudyPlan).where(StudyPlan.user_id == user.id).order_by(StudyPlan.date_key, StudyPlan.created_at)
        )
    ).scalars().all()
    days = (
        await db.execute(select(StudyActivity.day).where(StudyActivity.user_id == user.id).order_by(StudyActivity.day))
    ).scalars().all()

    return ProgressOut(
        lectures=[
            LectureProgressOut(
                lecture_id=r.lecture_id,
                completed=bool(r.completed),
                completed_at=_iso(r.completed_at),
                position=r.position or 0,
                duration=r.duration or 0,
                updated_at=_iso(r.updated_at) or "",
            )
            for r in lectures
        ],
        notes={n.lecture_id: NoteOut(content=n.content or "", updated_at=_iso(n.updated_at) or "") for n in notes},
        plans=[
            PlanOut(id=p.id, date_key=p.date_key, title=p.title, time=p.time, source=p.source or "manual")
            for p in plans
        ],
        activity_days=list(days),
    )


# ---------- endpoints ----------

@router.get("/me", response_model=ProgressOut)
async def get_my_progress(user: User = Depends(get_current_student), db: AsyncSession = Depends(get_db)):
    return await _snapshot(db, user)


@router.put("/lectures/{lecture_id}", response_model=LectureProgressOut)
async def update_lecture_progress(
    lecture_id: str,
    payload: LectureProgressIn,
    user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    lecture_id = _check_lecture_id(lecture_id)
    now = datetime.utcnow()
    row = await _get_or_create(
        db,
        LectureProgress,
        {"user_id": user.id, "lecture_id": lecture_id},
        {"completed": False, "position": 0, "duration": 0, "updated_at": now},
    )

    if payload.completed is not None:
        if payload.completed and not row.completed:
            row.completed_at = now
        if not payload.completed:
            row.completed_at = None
        row.completed = payload.completed
    if payload.position is not None:
        row.position = min(payload.position, MAX_SECONDS)
    if payload.duration is not None:
        row.duration = min(payload.duration, MAX_SECONDS)
    row.updated_at = now

    await _touch_day(db, user.id, payload.day)
    await db.commit()

    return LectureProgressOut(
        lecture_id=row.lecture_id,
        completed=bool(row.completed),
        completed_at=_iso(row.completed_at),
        position=row.position or 0,
        duration=row.duration or 0,
        updated_at=_iso(row.updated_at) or "",
    )


@router.put("/notes/{lecture_id}", response_model=NoteOut)
async def save_note(
    lecture_id: str,
    payload: NoteIn,
    user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    lecture_id = _check_lecture_id(lecture_id)
    now = datetime.utcnow()
    row = await _get_or_create(
        db, LectureNote, {"user_id": user.id, "lecture_id": lecture_id}, {"content": "", "updated_at": now}
    )
    row.content = payload.content
    row.updated_at = now
    await _touch_day(db, user.id, payload.day)
    await db.commit()
    return NoteOut(content=row.content, updated_at=_iso(row.updated_at) or "")


@router.post("/plans", response_model=PlanOut)
async def upsert_plan(
    payload: PlanIn,
    user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    existing = (await db.execute(select(StudyPlan).where(StudyPlan.id == payload.id))).scalar_one_or_none()
    if existing is not None and existing.user_id != user.id:
        # Another student's id: refuse without revealing that it exists.
        raise HTTPException(status_code=409, detail="Plan id already in use.")
    if existing is None:
        existing = StudyPlan(id=payload.id, user_id=user.id)
        db.add(existing)
    existing.date_key = payload.date_key
    existing.title = payload.title.strip()
    existing.time = (payload.time or "").strip() or None
    existing.source = payload.source
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Plan id already in use.")
    return PlanOut(
        id=existing.id,
        date_key=existing.date_key,
        title=existing.title,
        time=existing.time,
        source=existing.source,
    )


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: str,
    user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    # Deleting something already gone is a success, so a replayed request is harmless.
    await db.execute(delete(StudyPlan).where(StudyPlan.id == plan_id, StudyPlan.user_id == user.id))
    await db.commit()


@router.post("/import", response_model=ProgressOut)
async def import_local_progress(
    payload: ImportIn,
    user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    """One-time move of what a student already saved in their browser. It only fills gaps:
    anything already on the server is left alone."""
    now = datetime.utcnow()

    for raw_id in payload.watched[:MAX_IMPORT_ITEMS]:
        lecture_id = str(raw_id).strip()
        if not lecture_id or len(lecture_id) > 64:
            continue
        row = await _get_or_create(
            db,
            LectureProgress,
            {"user_id": user.id, "lecture_id": lecture_id},
            {"completed": False, "position": 0, "duration": 0, "updated_at": now},
        )
        if not row.completed:
            row.completed = True
            row.completed_at = now

    for raw_id, content in list(payload.notes.items())[:MAX_IMPORT_ITEMS]:
        lecture_id = str(raw_id).strip()
        text = str(content or "")[:20000]
        if not lecture_id or len(lecture_id) > 64 or not text.strip():
            continue
        row = await _get_or_create(
            db, LectureNote, {"user_id": user.id, "lecture_id": lecture_id}, {"content": "", "updated_at": now}
        )
        if not (row.content or "").strip():
            row.content = text
            row.updated_at = now

    for plan in payload.plans[:MAX_IMPORT_ITEMS]:
        existing = (await db.execute(select(StudyPlan).where(StudyPlan.id == plan.id))).scalar_one_or_none()
        if existing is None:
            db.add(
                StudyPlan(
                    id=plan.id,
                    user_id=user.id,
                    date_key=plan.date_key,
                    title=plan.title.strip(),
                    time=(plan.time or "").strip() or None,
                    source=plan.source,
                )
            )

    await _touch_day(db, user.id, payload.day)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Import conflicted with existing data; try again.")
    return await _snapshot(db, user)
