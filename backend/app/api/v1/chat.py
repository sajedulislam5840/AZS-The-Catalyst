import os
import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.academic import VideoLecture, Material

router = APIRouter(prefix="/ai", tags=["AI Tutor & Guide"])


class ChatRequest(BaseModel):
    prompt: str


class ChatResponse(BaseModel):
    reply: str


# Groq latest verified production model
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
ACTIVE_MODEL = "llama-3.3-70b-versatile"


@router.post("/chat", response_model=ChatResponse)
async def chat_with_edutrack_ai(payload: ChatRequest, db: AsyncSession = Depends(get_db)):
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        print("[EduTrack AI] Error: GROQ_API_KEY is not configured!")
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is missing on Render Environment Variables."
        )

    user_text = payload.prompt.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

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
        "You are the official AI Academic Tutor & Platform Guide of 'EduTrack'.\n"
        "Your role is to help students with Physics, Chemistry, Higher Mathematics (calculus, numerical methods like Runge-Kutta, mechanics), derivations, and platform navigation.\n"
        "Always provide complete, step-by-step, thorough, and fully finished explanations from start to finish without omitting steps.\n"
        "Answer clearly in Bengali (or English if prompted in English).\n\n"
        f"Available Platform Lectures:\n{video_summary or 'None'}\n\n"
        f"Available Platform Sheets:\n{sheet_summary or 'None'}\n"
    )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    req_body = {
        "model": ACTIVE_MODEL,
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_text}
        ],
        "temperature": 0.5,
        "max_tokens": 4096
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(GROQ_API_URL, headers=headers, json=req_body)

            if resp.status_code == 200:
                data = resp.json()
                choices = data.get("choices", [])
                if choices and "message" in choices[0]:
                    reply_text = choices[0]["message"].get("content", "")
                    if reply_text.strip():
                        return ChatResponse(reply=reply_text.strip())

            # Error handling with direct detail
            err_detail = resp.text
            print(f"[Groq Error]: {resp.status_code} - {err_detail}")
            raise HTTPException(
                status_code=500,
                detail=f"Groq API Error {resp.status_code}: {err_detail[:120]}"
            )

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI request timed out. Please try again.")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Internal Exception]: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")