import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.access import get_optional_user, require_subscriber
from app.core.database import get_db
from app.models.academic import Material, VideoLecture
from app.models.chat import ChatMessage, ChatSession
from app.models.user import User
from app.services import ai_tutor

router = APIRouter(prefix="/ai", tags=["AI Tutor & Guide"])


# --- Pydantic Request / Response Schemas ---
class HistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = None
    model: Optional[str] = "deepseek"  # "deepseek" (deep) | "groq" (fast)
    history: Optional[List[HistoryMessage]] = None  # kept for old clients; history now comes from the database


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    model: str
    title: Optional[str] = None


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class SessionOut(BaseModel):
    id: str
    title: str
    model: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0

    class Config:
        from_attributes = True


class SessionDetailOut(BaseModel):
    id: str
    title: str
    model: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageOut]

    class Config:
        from_attributes = True


class CreateSessionRequest(BaseModel):
    title: Optional[str] = "New Conversation"
    model: Optional[str] = "deepseek"


def _parse_uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format.")


async def _owned_session(db: AsyncSession, session_id: str, user: User) -> ChatSession:
    """Fetch a session only if it belongs to `user`. Other people's sessions look like they don't exist."""
    res = await db.execute(select(ChatSession).where(ChatSession.id == _parse_uuid(session_id)))
    session = res.scalar_one_or_none()
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    return session


# --- 1. SESSION MANAGEMENT (CHAT RETRACKING) ---
@router.get("/sessions", response_model=List[SessionOut])
async def list_chat_sessions(
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Past chat sessions so students can retrack their study history."""
    if not user:
        return []

    res = await db.execute(
        select(ChatSession).where(ChatSession.user_id == user.id).order_by(desc(ChatSession.updated_at))
    )
    sessions = res.scalars().all()
    if not sessions:
        return []

    count_res = await db.execute(
        select(ChatMessage.session_id, func.count(ChatMessage.id))
        .where(ChatMessage.session_id.in_([s.id for s in sessions]))
        .group_by(ChatMessage.session_id)
    )
    counts = {sid: n for sid, n in count_res.all()}

    return [
        SessionOut(
            id=str(s.id),
            title=s.title,
            model=s.model,
            created_at=s.created_at,
            updated_at=s.updated_at,
            message_count=counts.get(s.id, 0),
        )
        for s in sessions
    ]


@router.post("/sessions", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    payload: CreateSessionRequest,
    user: User = Depends(require_subscriber),
    db: AsyncSession = Depends(get_db),
):
    """Start a fresh chat thread."""
    now = datetime.utcnow()
    new_session = ChatSession(
        id=uuid.uuid4(),
        user_id=user.id,
        title=(payload.title or "").strip()[:80] or "New Conversation",
        model=ai_tutor.normalize_choice(payload.model),
        created_at=now,
        updated_at=now,
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)

    return SessionOut(
        id=str(new_session.id),
        title=new_session.title,
        model=new_session.model,
        created_at=new_session.created_at,
        updated_at=new_session.updated_at,
        message_count=0,
    )


@router.get("/sessions/{session_id}", response_model=SessionDetailOut)
async def get_session_history(
    session_id: str,
    user: User = Depends(require_subscriber),
    db: AsyncSession = Depends(get_db),
):
    """Load messages of one of the student's own sessions."""
    session = await _owned_session(db, session_id, user)

    msg_res = await db.execute(
        select(ChatMessage).where(ChatMessage.session_id == session.id).order_by(ChatMessage.created_at.asc())
    )
    return SessionDetailOut(
        id=str(session.id),
        title=session.title,
        model=session.model,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=[
            MessageOut(id=str(m.id), role=m.role, content=m.content, created_at=m.created_at)
            for m in msg_res.scalars().all()
        ],
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_200_OK)
async def delete_chat_session(
    session_id: str,
    user: User = Depends(require_subscriber),
    db: AsyncSession = Depends(get_db),
):
    """Delete one of the student's own sessions and its messages."""
    session = await _owned_session(db, session_id, user)
    await db.execute(delete(ChatMessage).where(ChatMessage.session_id == session.id))
    await db.execute(delete(ChatSession).where(ChatSession.id == session.id))
    await db.commit()
    return {"message": "Chat session deleted successfully."}


# --- 2. AI TUTOR CHAT ---
async def _platform_context(db: AsyncSession) -> tuple:
    """A short list of the site's lectures and sheets so the tutor can point students to them."""
    try:
        v_res = await db.execute(
            select(VideoLecture.lecture_no, VideoLecture.topic, VideoLecture.chapter, VideoLecture.subject).limit(25)
        )
        m_res = await db.execute(select(Material.title, Material.chapter, Material.subject).limit(25))
        videos = "\n".join(f"- Lec {v[0]}: {v[1]} ({v[2]}, {v[3]})" for v in v_res.all())
        sheets = "\n".join(f"- {m[0]} ({m[1]}, {m[2]})" for m in m_res.all())
        return videos, sheets
    except Exception as exc:  # the tutor still works without the catalogue
        print(f"[AI tutor] could not load lectures/sheets: {exc}")
        return "", ""


@router.post("/chat", response_model=ChatResponse)
async def chat_with_edutrack_ai(
    payload: ChatRequest,
    user: User = Depends(require_subscriber),
    db: AsyncSession = Depends(get_db),
):
    user_text = payload.prompt.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="প্রশ্ন লিখে পাঠাও।")
    if len(user_text) > ai_tutor.MAX_PROMPT_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"প্রশ্ন একটু ছোট করো (সর্বোচ্চ {ai_tutor.MAX_PROMPT_CHARS} অক্ষর)।",
        )

    wait = ai_tutor.check_rate_limit(str(user.id))
    if wait:
        raise HTTPException(
            status_code=429,
            detail=f"অনেক দ্রুত প্রশ্ন করছো। {wait} সেকেন্ড পর আবার চেষ্টা করো।",
            headers={"Retry-After": str(wait)},
        )

    choice = ai_tutor.normalize_choice(payload.model)

    # Continue one of the student's own sessions, otherwise start a new one.
    session: Optional[ChatSession] = None
    if payload.session_id:
        try:
            res = await db.execute(select(ChatSession).where(ChatSession.id == uuid.UUID(payload.session_id)))
            found = res.scalar_one_or_none()
            if found and found.user_id == user.id:
                session = found
        except ValueError:
            session = None

    # Earlier turns come from the database, not from the browser.
    history: List[dict] = []
    if session:
        h_res = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session.id)
            .order_by(desc(ChatMessage.created_at))
            .limit(ai_tutor.HISTORY_LIMIT)
        )
        history = [{"role": m.role, "content": m.content} for m in reversed(h_res.scalars().all())]

    videos, sheets = await _platform_context(db)
    messages = [{"role": "system", "content": ai_tutor.build_system_prompt(videos, sheets)}]
    messages += history
    messages.append({"role": "user", "content": user_text})

    try:
        raw_reply, _model_used = await ai_tutor.complete(messages, choice)
    except ai_tutor.AIUnavailable as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)

    reply = ai_tutor.apply_scope(raw_reply)

    # Save only after the model answered, so a failed attempt never leaves half a conversation behind.
    now = datetime.utcnow()
    if not session:
        title = user_text[:40].strip() + ("..." if len(user_text) > 40 else "")
        session = ChatSession(id=uuid.uuid4(), user_id=user.id, title=title, model=choice, created_at=now, updated_at=now)
        db.add(session)
        await db.flush()
    else:
        session.model = choice
        session.updated_at = now

    db.add(ChatMessage(id=uuid.uuid4(), session_id=session.id, role="user", content=user_text, created_at=now))
    db.add(
        ChatMessage(
            id=uuid.uuid4(),
            session_id=session.id,
            role="assistant",
            content=reply,
            created_at=now + timedelta(milliseconds=1),
        )
    )
    await db.commit()

    return ChatResponse(reply=reply, session_id=str(session.id), model=choice, title=session.title)
