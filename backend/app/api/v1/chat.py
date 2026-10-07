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


# Ultra-fast model target (No sequential loops)
FAST_MODEL = "gemini-2.5-flash"


@router.post("/chat", response_model=ChatResponse)
async def chat_with_edutrack_ai(payload: ChatRequest, db: AsyncSession = Depends(get_db)):
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured on server")

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
        "Your role is to help students with Physics, Chemistry, mathematical derivations, and platform navigation.\n"
        "Provide direct, complete, and accurate explanations from start to finish without stalling.\n"
        "Answer warmly and clearly in Bengali (or English if prompted in English).\n\n"
        f"Available Platform Lectures:\n{video_summary or 'None'}\n\n"
        f"Available Platform Sheets:\n{sheet_summary or 'None'}\n"
    )

    full_prompt = f"{system_instruction}\n\nStudent Question: {user_text}"

    request_payload = {
        "contents": [
            {
                "parts": [{"text": full_prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.5
        }
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{FAST_MODEL}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(url, headers=headers, json=request_payload)

            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    parts = candidates[0]["content"].get("parts", [])
                    reply_text = "".join([p.get("text", "") for p in parts if "text" in p])
                    if reply_text.strip():
                        return ChatResponse(reply=reply_text.strip())

            # Backup single attempt if 2.5-flash fails
            backup_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={api_key}"
            backup_resp = await client.post(backup_url, headers=headers, json=request_payload)
            if backup_resp.status_code == 200:
                b_data = backup_resp.json()
                candidates = b_data.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    parts = candidates[0]["content"].get("parts", [])
                    reply_text = "".join([p.get("text", "") for p in parts if "text" in p])
                    if reply_text.strip():
                        return ChatResponse(reply=reply_text.strip())

            print(f"[API Error]: Status {resp.status_code} - {resp.text}")
            raise HTTPException(status_code=500, detail="Google API server returned an error.")

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI response timed out. Please try asking again.")
    except HTTPException:
        raise
    except Exception as ex:
        print(f"[API Exception]: {ex}")
        raise HTTPException(status_code=500, detail="Internal server error occurred.")