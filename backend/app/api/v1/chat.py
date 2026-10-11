import os
import uuid
import re
import httpx
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Header, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete
from jose import jwt

from app.core.database import get_db
from app.models.user import User
from app.models.academic import VideoLecture, Material
from app.models.chat import ChatSession, ChatMessage
from app.api.v1.auth import SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/ai", tags=["AI Tutor & Guide"])

# --- AI Provider & Model Constants ---
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
XAI_API_URL = "https://api.x.ai/v1/chat/completions"

# Primary Free High-Performance Models on Groq
MODEL_DEEPSEEK_R1 = "deepseek-r1-distill-llama-70b"  # Groq hosted DeepSeek R1
MODEL_GROQ_LLAMA = "llama-3.3-70b-versatile"         # Groq hosted Meta Llama 3.3 70B


# --- Pydantic Request / Response Schemas ---
class HistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = None
    model: Optional[str] = "deepseek"  # "deepseek" | "groq" | "grok"
    history: Optional[List[HistoryMessage]] = None


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


# --- Authentication Helper ---
async def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1].strip()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
        email = payload.get("sub")
        if email:
            stmt = select(User).where(User.email == email.strip().lower())
            res = await db.execute(stmt)
            return res.scalar_one_or_none()
    except Exception:
        pass
    return None


# --- 1. SESSION MANAGEMENT (CHAT RETRACKING) ---
@router.get("/sessions", response_model=List[SessionOut])
async def list_chat_sessions(
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve past chat sessions so students can retrack their study history."""
    if not user:
        return []

    stmt = (
        select(ChatSession)
        .where(ChatSession.user_id == user.id)
        .order_by(desc(ChatSession.updated_at))
    )
    res = await db.execute(stmt)
    sessions = res.scalars().all()

    output = []
    for s in sessions:
        # Count messages for summary display
        msg_stmt = select(ChatMessage.id).where(ChatMessage.session_id == s.id)
        msg_res = await db.execute(msg_stmt)
        count = len(msg_res.scalars().all())

        output.append(
            SessionOut(
                id=str(s.id),
                title=s.title,
                model=s.model,
                created_at=s.created_at,
                updated_at=s.updated_at,
                message_count=count
            )
        )
    return output


@router.post("/sessions", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    payload: CreateSessionRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Start a fresh chat thread."""
    new_session = ChatSession(
        id=uuid.uuid4(),
        user_id=user.id if user else None,
        title=payload.title.strip() if payload.title else "New Conversation",
        model=payload.model or "deepseek",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
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
        message_count=0
    )


@router.get("/sessions/{session_id}", response_model=SessionDetailOut)
async def get_session_history(
    session_id: str,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Load messages of an existing session to resume/retrack it."""
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format.")

    stmt = select(ChatSession).where(ChatSession.id == session_uuid)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    if session.user_id and user and session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this chat session.")

    msg_stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
    )
    msg_res = await db.execute(msg_stmt)
    messages = msg_res.scalars().all()

    return SessionDetailOut(
        id=str(session.id),
        title=session.title,
        model=session.model,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=[
            MessageOut(
                id=str(m.id),
                role=m.role,
                content=m.content,
                created_at=m.created_at
            )
            for m in messages
        ]
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_200_OK)
async def delete_chat_session(
    session_id: str,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a chat session and its recorded history."""
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format.")

    stmt = select(ChatSession).where(ChatSession.id == session_uuid)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    if session.user_id and user and session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this session.")

    await db.execute(delete(ChatSession).where(ChatSession.id == session_uuid))
    await db.commit()
    return {"message": "Chat session deleted successfully."}


# --- 2. DUAL AI ENGINE CHAT INFERENCE (DEEPSEEK R1 + GROQ/LLAMA) ---
@router.post("/chat", response_model=ChatResponse)
async def chat_with_edutrack_ai(
    payload: ChatRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    user_text = payload.prompt.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    requested_model = (payload.model or "deepseek").lower().strip()

    # Determine Active Session or Create One
    session: Optional[ChatSession] = None
    if payload.session_id:
        try:
            s_uuid = uuid.UUID(payload.session_id)
            s_stmt = select(ChatSession).where(ChatSession.id == s_uuid)
            s_res = await db.execute(s_stmt)
            session = s_res.scalar_one_or_none()
        except Exception:
            session = None

    if not session:
        # Auto-create session with descriptive title from the first prompt
        title_snippet = user_text[:40].strip()
        if len(user_text) > 40:
            title_snippet += "..."

        session = ChatSession(
            id=uuid.uuid4(),
            user_id=user.id if user else None,
            title=title_snippet,
            model=requested_model,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
    else:
        # Update model & updated timestamp if session exists
        session.model = requested_model
        session.updated_at = datetime.utcnow()
        await db.commit()

    # Save User Message to Database
    user_msg = ChatMessage(
        id=uuid.uuid4(),
        session_id=session.id,
        role="user",
        content=user_text,
        created_at=datetime.utcnow(),
    )
    db.add(user_msg)
    await db.commit()

    # Dynamic Syllabus Knowledge Base Context
    video_summary = ""
    sheet_summary = ""
    try:
        v_res = await db.execute(
            select(
                VideoLecture.lecture_no,
                VideoLecture.topic,
                VideoLecture.chapter,
                VideoLecture.subject
            ).limit(15)
        )
        all_videos = v_res.all()

        m_res = await db.execute(
            select(
                Material.title,
                Material.chapter,
                Material.subject
            ).limit(15)
        )
        all_materials = m_res.all()

        video_summary = "\n".join(
            [f"- Lec {v[0]}: {v[1]} ({v[2]}, {v[3]})" for v in all_videos]
        )
        sheet_summary = "\n".join(
            [f"- {m[0]} ({m[1]}, {m[2]})" for m in all_materials]
        )
    except Exception as db_err:
        print(f"[EduTrack DB Warning]: {db_err}")

    system_instruction = (
        "You are the official AI Academic Tutor & Platform Guide of 'AZS: The Catalyst' (by AZS Razon Sir).\n"
        "You are an expert tutor for SSC & HSC science education in Bangladesh, covering Physics, Chemistry, and Higher Mathematics.\n"
        "Guidelines:\n"
        "1. Step-by-Step Logic: Provide complete, rigorous, and fully worked-out solutions and derivations without skipping crucial steps.\n"
        "2. Formulas & Equations: Use clean LaTeX formatting for all mathematical equations, chemical formulas, and units (inline with $...$, display blocks with $$...$$).\n"
        "3. Language: Respond fluently and respectfully in clear Bengali (or English if prompted in English).\n"
        "4. Platform Guidance: Refer students to relevant coaching lectures and sheets when applicable.\n\n"
        f"Available Platform Lectures:\n{video_summary or 'None'}\n\n"
        f"Available Platform Study Sheets:\n{sheet_summary or 'None'}\n"
    )

    # Prepare Messages Payload with History
    messages_payload = [{"role": "system", "content": system_instruction}]

    if payload.history:
        # Include up to the last 10 messages for multi-turn context
        recent_history = payload.history[-10:]
        for h in recent_history:
            if h.role in ["user", "assistant"] and h.content.strip():
                messages_payload.append({"role": h.role, "content": h.content.strip()})

    messages_payload.append({"role": "user", "content": user_text})

    # Provider & Model Selection Logic
    groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
    xai_api_key = os.getenv("XAI_API_KEY", "").strip()

    target_api_url = GROQ_API_URL
    target_api_key = groq_api_key
    target_model_name = MODEL_DEEPSEEK_R1  # default to DeepSeek R1

    if requested_model == "grok" and xai_api_key:
        target_api_url = XAI_API_URL
        target_api_key = xai_api_key
        target_model_name = "grok-2"
    elif requested_model in ["groq", "llama"]:
        target_model_name = MODEL_GROQ_LLAMA
    else:
        # Default: DeepSeek R1 on Groq
        target_model_name = MODEL_DEEPSEEK_R1

    if not target_api_key:
        raise HTTPException(
            status_code=500,
            detail="AI API Key (GROQ_API_KEY) is missing in environment variables. Please configure it in your Render settings or .env file."
        )

    headers = {
        "Authorization": f"Bearer {target_api_key}",
        "Content-Type": "application/json",
    }

    req_body = {
        "model": target_model_name,
        "messages": messages_payload,
        "temperature": 0.6,
        "max_tokens": 4096,
    }

    reply_text = ""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(target_api_url, headers=headers, json=req_body)

            if resp.status_code == 200:
                data = resp.json()
                choices = data.get("choices", [])
                if choices and "message" in choices[0]:
                    raw_reply = choices[0]["message"].get("content", "")

                    # Clean or format DeepSeek R1 reasoning tags
                    # If model includes <think>...</think>, format nicely or preserve cleanly
                    if "<think>" in raw_reply and "</think>" in raw_reply:
                        # Extract thought process
                        thought_match = re.search(r"<think>(.*?)</think>", raw_reply, re.DOTALL)
                        clean_answer = re.sub(r"<think>.*?</think>", "", raw_reply, flags=re.DOTALL).strip()
                        
                        if thought_match and clean_answer:
                            thought_text = thought_match.group(1).strip()
                            # Prepend collapsible thought section for student inspection
                            reply_text = f"> 💭 **গাণিতিক বিশ্লেষণ (DeepSeek Reasoning)**:\n> {thought_text}\n\n---\n\n{clean_answer}"
                        else:
                            reply_text = clean_answer or raw_reply.strip()
                    else:
                        reply_text = raw_reply.strip()

            else:
                err_detail = resp.text
                print(f"[AI Model Error]: {resp.status_code} - {err_detail}")
                raise HTTPException(
                    status_code=502,
                    detail=f"AI Provider error ({resp.status_code}): {err_detail[:120]}"
                )

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI request timed out. Please try again.")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Internal Exception]: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while contacting AI service.")

    if not reply_text:
        reply_text = "কোনো উত্তর পাওয়া যায়নি। দয়া করে আবার চেষ্টা করো।"

    # Save Assistant Message to Database
    assistant_msg = ChatMessage(
        id=uuid.uuid4(),
        session_id=session.id,
        role="assistant",
        content=reply_text,
        created_at=datetime.utcnow(),
    )
    db.add(assistant_msg)
    await db.commit()

    return ChatResponse(
        reply=reply_text,
        session_id=str(session.id),
        model=requested_model,
        title=session.title,
    )