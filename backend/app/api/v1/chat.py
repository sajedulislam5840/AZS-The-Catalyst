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


# Groq ultra-fast academic models
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"
BACKUP_GROQ_MODEL = "llama-3.1-8b-instant"


@router.post("/chat", response_model=ChatResponse)
async def chat_with_edutrack_ai(payload: ChatRequest, db: AsyncSession = Depends(get_db)):
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        print("[EduTrack AI] Error: GROQ_API_KEY is missing in environment variables!")
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not configured on the server environment"
        )

    user_text = payload.prompt.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    # Database platform curriculum context
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

    models_to_try = [GROQ_MODEL, BACKUP_GROQ_MODEL]
    last_err = ""

    async with httpx.AsyncClient(timeout=35.0) as client:
        for model in models_to_try:
            req_body = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": user_text}
                ],
                "temperature": 0.6,
                "max_tokens": 4096
            }
            try:
                resp = await client.post(GROQ_API_URL, headers=headers, json=req_body)

                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get("choices", [])
                    if choices and "message" in choices[0]:
                        reply_text = choices[0]["message"].get("content", "")
                        if reply_text.strip():
                            return ChatResponse(reply=reply_text.strip())

                last_err = f"Groq {model} HTTP {resp.status_code}: {resp.text}"
                print(f"[Groq AI Attempt Failed]: {last_err}")

            except httpx.TimeoutException:
                last_err = f"Groq {model} timed out"
                print(f"[Groq AI Timeout]: {last_err}")
            except Exception as e:
                last_err = str(e)
                print(f"[Groq AI Exception]: {e}")

    raise HTTPException(status_code=500, detail=f"Groq API Error: {last_err[:120]}")