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


@router.post("/chat", response_model=ChatResponse)
async def chat_with_edutrack_ai(payload: ChatRequest, db: AsyncSession = Depends(get_db)):
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured on server")

    user_text = payload.prompt.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    try:
        # Fetch current platform context
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
            [f"- Lec {v[0]}: {v[1]} (Chapter: {v[2]}, Subject: {v[3]})" for v in all_videos[:25]]
        )
        sheet_summary = "\n".join(
            [f"- {m[0]} (Chapter: {m[1]}, Subject: {m[2]})" for m in all_materials[:25]]
        )

        system_instruction = f"""
You are the official AI Academic Tutor & Platform Guide of 'EduTrack'.
Your role is to help students with Physics, Chemistry, math derivations, formulas, conceptual questions, and platform navigation.
Answer questions politely, warmly, and helpfully in clear Bengali (or English if the user asks in English).
Keep answers concise, clear, and easy to understand.

Current Platform Curriculum Context:
Lectures available:
{video_summary or "No video lectures published yet"}

Study Sheets (PDF) available:
{sheet_summary or "No PDF sheets published yet"}

If a student asks which lecture or sheet covers a topic, guide them to the exact lecture number or sheet listed above.
"""

        # Google Gemini Native REST API Endpoint with header authentication
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        }

        body = {
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": [
                {
                    "parts": [{"text": user_text}]
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 800
            }
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=body)

        if resp.status_code != 200:
            print(f"Gemini API Error {resp.status_code}: {resp.text}")
            raise HTTPException(
                status_code=500,
                detail=f"Gemini API responded with status {resp.status_code}"
            )

        data = resp.json()
        candidates = data.get("candidates", [])
        if candidates and "content" in candidates[0]:
            parts = candidates[0]["content"].get("parts", [])
            reply_text = "".join([p.get("text", "") for p in parts])
            return ChatResponse(reply=reply_text or "Abar ektu por cheshta koro.")

        return ChatResponse(reply="Kono uttor pawa jayni, abar proshno koro.")

    except HTTPException:
        raise
    except Exception as e:
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail="AI Service is temporarily unavailable.")