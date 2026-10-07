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


# সমর্থিত আধুনিক মডেলের তালিকা
CANDIDATE_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
]


@router.post("/chat", response_model=ChatResponse)
async def chat_with_edutrack_ai(payload: ChatRequest, db: AsyncSession = Depends(get_db)):
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("[EduTrack AI] Error: GEMINI_API_KEY is missing from environment variables!")
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured on server")

    user_text = payload.prompt.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    # কারিকুলাম ডেটাবেস থেকে কনটেক্সট নেওয়া
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
        print(f"[EduTrack DB Warning]: {db_err}")

    system_instruction = (
        "You are the official AI Academic Tutor & Platform Guide of 'EduTrack'.\n"
        "Your role is to help students with Physics, Chemistry, formulas, exam problems, and platform navigation.\n"
        "Respond warmly, encouragingly, and clearly in Bengali (or English if prompted in English).\n\n"
        "Platform Curriculum Context:\n"
        f"Videos: {video_summary or 'None'}\n"
        f"Sheets: {sheet_summary or 'None'}\n"
    )

    full_prompt = f"{system_instruction}\n\nStudent Question: {user_text}"

    request_payload = {
        "contents": [
            {
                "parts": [{"text": full_prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1000
        }
    }

    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": api_key,
    }

    async with httpx.AsyncClient(timeout=25.0) as client:
        last_error = ""
        for model_name in CANDIDATE_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            try:
                resp = await client.post(url, headers=headers, json=request_payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        reply_text = "".join([p.get("text", "") for p in parts if "text" in p])
                        if reply_text.strip():
                            return ChatResponse(reply=reply_text.strip())

                last_error = f"Model {model_name} returned status {resp.status_code}: {resp.text}"
                print(f"[EduTrack AI Attempt Failed] {last_error}")
            except Exception as req_err:
                last_error = str(req_err)
                print(f"[EduTrack AI Request Exception on {model_name}]: {req_err}")

    # কোনো মডেলেই কাজ না হলে আসল মেসেজ ফ্রন্টএন্ডে পাঠাবে যাতে বোঝা যায় কী সমস্যা
    print(f"[EduTrack AI All Models Failed] Last Error: {last_error}")
    raise HTTPException(
        status_code=500,
        detail=f"Google AI API Error: {last_error[:200]}"
    )