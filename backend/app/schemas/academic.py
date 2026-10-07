import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.academic import SubjectEnum


class MaterialCreate(BaseModel):
    title: str
    chapter: str
    subject: SubjectEnum
    pdf_url: str


class MaterialResponse(BaseModel):
    id: uuid.UUID
    title: str
    chapter: str
    subject: SubjectEnum
    pdf_url: str
    created_at: datetime

    class Config:
        from_attributes = True


class VideoCreate(BaseModel):
    lecture_no: int
    topic: str
    chapter: str
    subject: SubjectEnum
    youtube_url: str


class VideoResponse(BaseModel):
    id: uuid.UUID
    lecture_no: int
    topic: str
    chapter: str
    subject: SubjectEnum
    youtube_url: str
    created_at: datetime

    class Config:
        from_attributes = True