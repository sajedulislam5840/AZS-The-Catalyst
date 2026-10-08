import uuid
from enum import Enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    STUDENT = "STUDENT"


class User(Base):
    __tablename__ = "users"

    # UUID primary key to match PostgreSQL schema exactly
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    
    # Dual-mapped password fields to satisfy every legacy constraint
    password_hash = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)
    
    role = Column(SQLEnum(UserRole), default=UserRole.STUDENT)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    school = Column(String, nullable=True)
    grade_class = Column(String, nullable=True)
    batch_no = Column(String, nullable=True)
    is_approved = Column(Boolean, default=False)
    subscription_end_date = Column(DateTime, nullable=True)
    current_session_token = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)