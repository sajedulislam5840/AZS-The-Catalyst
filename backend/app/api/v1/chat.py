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


# Endpoint path will be exactly: POST /api/v1/ai/chat
@router.post("/chat", response_model=ChatResponse)
async def chat_with_edutrack_ai(payload: ChatRequest, db: AsyncSession = Depends(get_db)):
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("[EduTrack AI] Error: GEMINI_API_KEY is not configured!")
        raise HTTPException(status_code=500, detail="Gemini API Key missing on server")

    user_text = payload.prompt.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    # DB Content summary
    video_summary = ""
    sheet_summary = ""
    try:
        v_res = await db.execute(
            select(
                VideoLecture.lecture_no,
                VideoLecture.topic,
                VideoLecture.chapter,
                VideoLecture.subject
            )
        )
        all_videos = v_res.all()

        m_res = await db.execute(
            select(
                Material.title,
                Material.chapter,
                Material.subject
            )
        )
        all_materials = m_res.all()

        video_summary = "\n".join(
            [f"- Lec {v[0]}: {v[1]} ({v[2]}, {v[3]})" for v in all_videos[:25]]
        )
        sheet_summary = "\n".join(
            [f"- {m[0]} ({m[1]}, {m[2]})" for m in all_materials[:25]]
        )
    except Exception as db_err:
        print(f"[EduTrack DB Context Error]: {db_err}")

    system_instruction = (
        "You are the official AI Academic Tutor & Platform Guide of 'EduTrack'.\n"
        "Help students with Physics, Chemistry, formulas, derivations, and platform navigation.\n"
        "Respond warmly, encouragingly, and clearly in Bengali (or English if the user asks in English).\n\n"
        f"Available Videos:\n{video_summary or 'None'}\n\n"
        f"Available Sheets:\n{sheet_summary or 'None'}\n"
    )

    full_prompt = f"{system_instruction}\n\nStudent Question: {user_text}"

    # Google Gemini 1.5 Flash standard v1beta REST endpoint
    models_to_try = [
        "gemini-1.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash-latest"
    ]

    request_body = {
        "contents": [
            {
                "parts": [{"text": full_prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 800
        }
    }

    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": api_key,
    }

    last_error_detail = ""
    async with httpx.AsyncClient(timeout=25.0) as client:
        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                resp = await client.post(url, headers=headers, json=request_body)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        reply = "".join([p.get("text", "") for p in parts if "text" in p])
                        if reply.strip():
                            return ChatResponse(reply=reply.strip())
                last_error_detail = f"Model {model} returned HTTP {resp.status_code}: {resp.text}"
                print(f"[AI Model Fail] {last_error_detail}")
            except Exception as e:
                last_error_detail = str(e)
                print(f"[AI Request Exception]: {e}")

    raise HTTPException(status_code=500, detail=f"Google API Error: {last_error_detail[:150]}")