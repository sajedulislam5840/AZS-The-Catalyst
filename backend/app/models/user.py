import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import String, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    STUDENT = "STUDENT"

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.STUDENT, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    # Academic & Batch Info
    school = Column(String, nullable=True)
    grade_class = Column(String, nullable=True)  # e.g., Class 9, 10, HSC
    batch_no = Column(String, nullable=True)     # e.g., Batch 01, Friday Physics
    
    # Role & Permissions
    is_admin = Column(Boolean, default=False)
    is_approved = Column(Boolean, default=False)
    
    # Subscription & 30-Day Cycle
    subscription_end_date = Column(DateTime, nullable=True)
    
    # Single-Device Concurrency Control
    current_session_token = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)