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


# Dedicated Gemini 3.0 Flash Endpoints
PRIMARY_MODEL = "gemini-3-flash-preview"
BACKUP_MODEL = "gemini-3.0-flash"


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
        "Your role is to help students with Physics, Chemistry, Higher Math (such as numerical methods like Runge-Kutta, calculus), derivations, and platform navigation.\n"
        "Always provide complete, thorough, step-by-step, and fully finished explanations from start to finish without omitting steps.\n"
        "Answer clearly in Bengali (or English if prompted in English).\n\n"
        f"Available Platform Lectures:\n{video_summary or 'None'}\n\n"
        f"Available Platform Sheets:\n{sheet_summary or 'None'}\n"
    )

    full_prompt = f"{system_instruction}\n\nStudent Question: {user_text}"

    # maxOutputTokens বাদ রাখা হয়েছে যাতে সম্পূর্ণ উত্তর আসে, তাপমাত্রা ব্যালেন্সড রাখা হয়েছে
    request_payload = {
        "contents": [
            {
                "parts": [{"text": full_prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.6
        }
    }

    headers = {"Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=45.0) as client:
        # Try Primary: gemini-3-flash-preview
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{PRIMARY_MODEL}:generateContent?key={api_key}"
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

            # Try Backup: gemini-3.0-flash
            backup_url = f"https://generativelanguage.googleapis.com/v1beta/models/{BACKUP_MODEL}:generateContent?key={api_key}"
            b_resp = await client.post(backup_url, headers=headers, json=request_payload)
            if b_resp.status_code == 200:
                b_data = b_resp.json()
                candidates = b_data.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    parts = candidates[0]["content"].get("parts", [])
                    reply_text = "".join([p.get("text", "") for p in parts if "text" in p])
                    if reply_text.strip():
                        return ChatResponse(reply=reply_text.strip())

            print(f"[Gemini 3 Flash Failure]: {resp.status_code} - {resp.text}")
            raise HTTPException(
                status_code=500,
                detail=f"Google API Error: {resp.text[:120]}"
            )

        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="AI response timed out. Please try again.")
        except HTTPException:
            raise
        except Exception as e:
            print(f"[Server Exception]: {e}")
            raise HTTPException(status_code=500, detail="Internal AI service error.")