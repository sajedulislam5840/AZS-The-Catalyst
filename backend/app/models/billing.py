import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class SubscriptionPayment(Base):
    """One cash payment the admin recorded. Renewing a student always writes a row, so every change is traceable."""

    __tablename__ = "subscription_payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    days_added = Column(Integer, nullable=False)
    amount = Column(Integer, nullable=True)  # taka, optional
    method = Column(String(20), default="cash", nullable=False)
    note = Column(String(200), nullable=True)
    previous_end = Column(DateTime, nullable=True)  # subscription end before this payment
    new_end = Column(DateTime, nullable=False)
    recorded_by = Column(String, nullable=True)  # admin email
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    voided_at = Column(DateTime, nullable=True)  # set when the admin undoes it


class Notification(Base):
    """A message for one student (expiry warnings, renewal receipts). dedupe_key stops repeats."""

    __tablename__ = "notifications"
    __table_args__ = (UniqueConstraint("user_id", "dedupe_key", name="uq_notification_user_key"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    kind = Column(String(20), nullable=False)  # expiring | expired | renewed
    title = Column(String(120), nullable=False)
    body = Column(String(400), nullable=False)
    dedupe_key = Column(String(80), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    read_at = Column(DateTime, nullable=True)
