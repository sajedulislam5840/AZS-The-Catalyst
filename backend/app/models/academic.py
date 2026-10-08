import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID

# Database Base ইমপোর্ট করা হলো
from app.core.database import Base


class SubjectEnum(str, enum.Enum):
    PHYSICS = "PHYSICS"
    CHEMISTRY = "CHEMISTRY"
    HIGHER_MATH = "HIGHER_MATH"


class Material(Base):
    __tablename__ = "materials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    chapter = Column(String, nullable=False)
    subject = Column(SQLEnum(SubjectEnum), nullable=False)
    pdf_url = Column(String, nullable=False)
    is_published = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class VideoLecture(Base):
    __tablename__ = "video_lectures"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lecture_no = Column(Integer, nullable=False)
    topic = Column(String, nullable=False)
    chapter = Column(String, nullable=False)
    subject = Column(SQLEnum(SubjectEnum), nullable=False)
    youtube_url = Column(String, nullable=False)
    is_published = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notice(Base):
    __tablename__ = "notices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)