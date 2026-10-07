import os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import google.generativeai as genai
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

    if not payload.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    genai.configure(api_key=api_key)

    try:
        # ডেটাবেস থেকে ক্লাস এবং শিটের তথ্য নেওয়া
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
Maintain an encouraging teacher-like tone.

Current Platform Curriculum Context:
Lectures available:
{video_summary or "No video lectures published yet"}

Study Sheets (PDF) available:
{sheet_summary or "No PDF sheets published yet"}

If a student asks which lecture or sheet covers a topic, guide them to the exact lecture number or sheet listed above.
"""

        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system_instruction
        )

        response = await model.generate_content_async(payload.prompt)
        text_reply = response.text if response and response.text else "দুঃখিত, কোনো উত্তর পাওয়া যায়নি। আবার প্রশ্ন করো।"
        return ChatResponse(reply=text_reply)

    except Exception as e:
        print(f"Gemini API Error: {e}")
        raise HTTPException(status_code=500, detail="AI Service is currently busy. Please try again in a few moments.")