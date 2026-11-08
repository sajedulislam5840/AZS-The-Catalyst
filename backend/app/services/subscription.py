"""Renewals (cash, recorded by the admin), undo, and the automatic expiry notifications."""
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.access import days_left, is_admin_user, subscription_status
from app.models.billing import Notification, SubscriptionPayment
from app.models.user import User

MAX_RENEW_DAYS = 366
DUPLICATE_WINDOW_SECONDS = 10


class RenewalError(Exception):
    """A renewal or undo that cannot be done. The message is shown to the admin."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _fmt(d: Optional[datetime]) -> str:
    return d.strftime("%d %b %Y") if d else "-"


# ---------- notifications ----------

async def _add_notification(
    db: AsyncSession, user_id, kind: str, title: str, body: str, dedupe_key: str, now: datetime
) -> bool:
    """Insert once per (user, dedupe_key). Returns True if a new row was created."""
    exists = (
        await db.execute(
            select(Notification.id).where(Notification.user_id == user_id, Notification.dedupe_key == dedupe_key)
        )
    ).first()
    if exists:
        return False
    try:
        async with db.begin_nested():
            db.add(
                Notification(
                    user_id=user_id, kind=kind, title=title[:120], body=body[:400], dedupe_key=dedupe_key, created_at=now
                )
            )
            await db.flush()
    except IntegrityError:  # two requests raced; the other one won
        return False
    return True


async def ensure_expiry_notifications(db: AsyncSession, user: User, now: Optional[datetime] = None) -> None:
    """Create the warning a student is due, once. Runs whenever the student opens the app.

    Thresholds are 7, 3 and 1 days. A student who first opens the app with 2 days left gets the 3-day
    warning, not all of them.
    """
    now = now or datetime.utcnow()
    if is_admin_user(user) or not user.subscription_end_date:
        return
    end_key = user.subscription_end_date.strftime("%Y%m%d")
    state = subscription_status(user, now)

    if state == "expiring":
        left = days_left(user, now)
        step = min(t for t in (1, 3, 7) if left <= t)
        when = "আজই শেষ হবে" if left <= 1 else f"আর {left} দিন বাকি"
        created = await _add_notification(
            db,
            user.id,
            "expiring",
            "সাবস্ক্রিপশনের মেয়াদ শেষ হতে চলেছে",
            f"তোমার সাবস্ক্রিপশনের মেয়াদ {_fmt(user.subscription_end_date)} তারিখে শেষ হবে ({when})। "
            "চালু রাখতে শিক্ষকের কাছে নগদ পেমেন্ট করে রিনিউ করো।",
            f"expiring{step}:{end_key}",
            now,
        )
        if created:
            await db.commit()
    elif state == "expired":
        created = await _add_notification(
            db,
            user.id,
            "expired",
            "সাবস্ক্রিপশনের মেয়াদ শেষ হয়েছে",
            f"তোমার সাবস্ক্রিপশন {_fmt(user.subscription_end_date)} তারিখে শেষ হয়েছে। ক্লাস ও শিট আবার পেতে শিক্ষকের কাছে রিনিউ করো।",
            f"expired:{end_key}",
            now,
        )
        if created:
            await db.commit()


# ---------- renew / undo ----------

async def renew_student(
    db: AsyncSession,
    student: User,
    admin_email: str,
    days: int,
    amount: Optional[int] = None,
    note: Optional[str] = None,
    now: Optional[datetime] = None,
) -> SubscriptionPayment:
    now = now or datetime.utcnow()
    if is_admin_user(student):
        raise RenewalError("Administrator accounts do not need a subscription.")
    if not 1 <= days <= MAX_RENEW_DAYS:
        raise RenewalError(f"Days must be between 1 and {MAX_RENEW_DAYS}.", 422)
    if amount is not None and not 0 <= amount <= 10_000_000:
        raise RenewalError("Amount looks wrong.", 422)

    # A double tap must not give 60 days for one payment.
    recent = (
        await db.execute(
            select(SubscriptionPayment)
            .where(
                SubscriptionPayment.user_id == student.id,
                SubscriptionPayment.voided_at.is_(None),
                SubscriptionPayment.created_at >= now - timedelta(seconds=DUPLICATE_WINDOW_SECONDS),
            )
            .limit(1)
        )
    ).scalar_one_or_none()
    if recent is not None:
        raise RenewalError("এইমাত্র রিনিউ করা হয়েছে। ভুল হয়ে থাকলে আগের পেমেন্টটি Undo করো।", 409)

    previous_end = student.subscription_end_date
    base = previous_end if previous_end and previous_end > now else now
    new_end = base + timedelta(days=days)

    payment = SubscriptionPayment(
        user_id=student.id,
        days_added=days,
        amount=amount,
        method="cash",
        note=(note or "").strip()[:200] or None,
        previous_end=previous_end,
        new_end=new_end,
        recorded_by=admin_email,
        created_at=now,
    )
    db.add(payment)
    student.is_approved = True
    student.is_active = True
    student.subscription_end_date = new_end
    await db.flush()

    await _add_notification(
        db,
        student.id,
        "renewed",
        "সাবস্ক্রিপশন রিনিউ হয়েছে",
        f"তোমার সাবস্ক্রিপশন {_fmt(new_end)} পর্যন্ত চালু আছে। ভালো পড়াশোনা হোক!",
        f"renewed:{payment.id}",
        now,
    )
    await db.commit()
    await db.refresh(payment)
    return payment


async def undo_payment(db: AsyncSession, payment: SubscriptionPayment, now: Optional[datetime] = None) -> User:
    """Take back the newest payment of a student (so dates stay consistent)."""
    now = now or datetime.utcnow()
    if payment.voided_at is not None:
        raise RenewalError("এই পেমেন্টটি আগেই বাতিল করা হয়েছে।", 409)

    newer = (
        await db.execute(
            select(SubscriptionPayment.id).where(
                SubscriptionPayment.user_id == payment.user_id,
                SubscriptionPayment.voided_at.is_(None),
                SubscriptionPayment.created_at > payment.created_at,
            )
        )
    ).first()
    if newer:
        raise RenewalError("শুধু সর্বশেষ পেমেন্টটি Undo করা যায়।", 409)

    student = (await db.execute(select(User).where(User.id == payment.user_id))).scalar_one_or_none()
    if student is None:
        raise RenewalError("Student not found.", 404)

    payment.voided_at = now
    # Back to exactly how it was: running, lapsed (past date) or never paid (None).
    student.subscription_end_date = payment.previous_end
    student.is_approved = payment.previous_end is not None
    await db.commit()
    return student


async def list_notifications(db: AsyncSession, user: User, limit: int = 20) -> List[Notification]:
    res = await db.execute(
        select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(limit)
    )
    return list(res.scalars().all())
