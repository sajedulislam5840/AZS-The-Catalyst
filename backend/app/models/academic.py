import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, String, Integer, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class SubjectEnum(str, Enum):
    PHYSICS = "PHYSICS"
    CHEMISTRY = "CHEMISTRY"


class Material(Base):
    __tablename__ = "materials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    chapter = Column(String(255), nullable=False)
    subject = Column(SQLEnum(SubjectEnum), nullable=False)
    pdf_url = Column(String(1000), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class VideoLecture(Base):
    __tablename__ = "video_lectures"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lecture_no = Column(Integer, nullable=False, default=1)
    topic = Column(String(255), nullable=False)
    chapter = Column(String(255), nullable=False)
    subject = Column(SQLEnum(SubjectEnum), nullable=False)
    youtube_url = Column(String(1000), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notice(Base):
    __tablename__ = "notices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content = Column(String(1000), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)