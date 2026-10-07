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


# ক্যাশে অ্যাক্টিভ মডেলের নাম সেভ রাখা যাতে বারবার গুগলকে জিজ্ঞেস করতে না হয়
DETECTED_MODEL = None


async def get_active_gemini_model(api_key: str) -> str:
    global DETECTED_MODEL
    if DETECTED_MODEL:
        return DETECTED_MODEL

    list_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(list_url)
        if res.status_code == 200:
            data = res.json()
            models = data.get("models", [])
            # যে মডেলগুলো generateContent সাপোর্ট করে
            valid_models = [
                m["name"].replace("models/", "")
                for m in models
                if "generateContent" in m.get("supportedGenerationMethods", [])
            ]
            
            # পছন্দের অগ্রাধিকার: 2.5-flash > 2.0-flash > 3-flash > যেকোনো ফ্ল্যাশ
            for pref in ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-exp", "gemini-flash"]:
                for vm in valid_models:
                    if pref in vm:
                        DETECTED_MODEL = vm
                        print(f"[EduTrack AI] Auto-detected best active model: {DETECTED_MODEL}")
                        return DETECTED_MODEL

            if valid_models:
                DETECTED_MODEL = valid_models[0]
                print(f"[EduTrack AI] Falling back to available model: {DETECTED_MODEL}")
                return DETECTED_MODEL

    # ডিফল্ট সেফ মডেল
    return "gemini-2.5-flash"


@router.post("/chat", response_model=ChatResponse)
async def chat_with_edutrack_ai(payload: ChatRequest, db: AsyncSession = Depends(get_db)):
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured on server")

    user_text = payload.prompt.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    # কারিকুলাম সামারি
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
        "Your mission is to help students learn Physics, Chemistry, solve problems, and guide them around the platform.\n"
        "Reply warmly, encouragingly, and clearly in Bengali (or English if the user asks in English).\n\n"
        f"Platform Lectures:\n{video_summary or 'None'}\n\n"
        f"Platform Study Sheets:\n{sheet_summary or 'None'}\n"
    )

    full_prompt = f"{system_instruction}\n\nStudent: {user_text}"

    # ডায়নামিকালি সঠিক মডেল বের করা
    try:
        active_model = await get_active_gemini_model(api_key)
    except Exception:
        active_model = "gemini-2.5-flash"

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{active_model}:generateContent?key={api_key}"

    headers = {
        "Content-Type": "application/json",
    }

    body = {
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

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, headers=headers, json=body)

        if resp.status_code != 200:
            # যদি অটো-ডিটেক্ট করা মডেলেও সমস্যা হয়, তবে gemini-2.0-flash দিয়ে ফাইনাল ট্রাই
            fallback_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
            resp = await client.post(fallback_url, headers=headers, json=body)

        if resp.status_code != 200:
            print(f"[Gemini API Failed]: {resp.status_code} - {resp.text}")
            raise HTTPException(
                status_code=500,
                detail=f"Google API Error {resp.status_code}: {resp.text[:120]}"
            )

        data = resp.json()
        candidates = data.get("candidates", [])
        if candidates and "content" in candidates[0]:
            parts = candidates[0]["content"].get("parts", [])
            reply_text = "".join([p.get("text", "") for p in parts if "text" in p])
            if reply_text.strip():
                return ChatResponse(reply=reply_text.strip())

    return ChatResponse(reply="দুঃখিত, কোনো উত্তর জেনারেট করা সম্ভব হয়নি। আবার চেষ্টা করো।")