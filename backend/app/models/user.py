import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from app.core.database import Base


class UserRole(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    # Role & Admin Access
    role = Column(Enum(UserRole), default=UserRole.STUDENT, nullable=True)
    is_admin = Column(Boolean, default=False)

    # Academic & Batch Info
    school = Column(String, nullable=True)
    grade_class = Column(String, nullable=True)  # e.g., Class 9, Class 10, HSC
    batch_no = Column(String, nullable=True)     # e.g., Batch 01

    # 30-Day Paywall & Access Gatekeeper
    is_approved = Column(Boolean, default=False)
    subscription_end_date = Column(DateTime, nullable=True)

    # Single-Device Concurrency Control (Auto logout on new login)
    current_session_token = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)