from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

import uuid

from app.core.access import get_current_user
from app.core.database import get_db
from app.models.billing import Notification
from app.models.user import User
from app.services.subscription import ensure_expiry_notifications, list_notifications

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationOut(BaseModel):
    id: str
    kind: str
    title: str
    body: str
    created_at: str
    read: bool


class NotificationsOut(BaseModel):
    unread: int
    items: List[NotificationOut]


def _out(n: Notification) -> NotificationOut:
    return NotificationOut(
        id=str(n.id), kind=n.kind, title=n.title, body=n.body, created_at=n.created_at.isoformat() + "Z", read=n.read_at is not None
    )


@router.get("/me", response_model=NotificationsOut)
async def my_notifications(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """The student's messages. Expiry warnings (7, 3 and 1 days left) are created here the first time they are due."""
    await ensure_expiry_notifications(db, user)
    items = await list_notifications(db, user)
    unread = (
        await db.execute(
            select(func.count(Notification.id)).where(Notification.user_id == user.id, Notification.read_at.is_(None))
        )
    ).scalar_one()
    return NotificationsOut(unread=int(unread or 0), items=[_out(n) for n in items])


@router.post("/read-all")
async def mark_all_read(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.read_at.is_(None))
        .values(read_at=datetime.utcnow())
    )
    await db.commit()
    return {"message": "ok"}


@router.post("/{notification_id}/read")
async def mark_read(notification_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        nid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid notification id.")
    await db.execute(
        update(Notification)
        .where(Notification.id == nid, Notification.user_id == user.id, Notification.read_at.is_(None))
        .values(read_at=datetime.utcnow())
    )
    await db.commit()
    return {"message": "ok"}
