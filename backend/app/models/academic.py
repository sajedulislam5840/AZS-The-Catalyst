import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base

class SubjectEnum(str, enum.Enum):
    PHYSICS = "PHYSICS"
    CHEMISTRY = "CHEMISTRY"

class Material(Base):
    __tablename__ = "materials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    chapter = Column(String(255), nullable=False)
    subject = Column(SQLEnum(SubjectEnum), nullable=False)
    pdf_url = Column(String(1000), nullable=False)  # Direct PDF or Google Drive PDF link
    created_at = Column(DateTime, default=datetime.utcnow)

class VideoLecture(Base):
    __tablename__ = "video_lectures"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    chapter = Column(String(255), nullable=False)
    subject = Column(SQLEnum(SubjectEnum), nullable=False)
    youtube_url = Column(String(1000), nullable=False) # e.g. https://www.youtube.com/watch?v=...
    created_at = Column(DateTime, default=datetime.utcnow)