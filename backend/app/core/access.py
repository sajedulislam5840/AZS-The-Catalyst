"""Who is logged in, who is the admin, and who has paid. Every protected route uses these.

There is no fallback identity: no valid token means no access.
"""
from datetime import datetime
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import ADMIN_EMAIL, ALGORITHM, SECRET_KEY
from app.core.database import get_db
from app.models.user import User

EXPIRING_DAYS = 7  # students are warned and flagged when this many days (or fewer) are left


# ---------- who is the admin ----------

def is_admin_user(user: User) -> bool:
    return bool(
        getattr(user, "is_admin", False)
        or str(getattr(user, "role", "")).upper().endswith("ADMIN")
        or (user.email or "").strip().lower() == ADMIN_EMAIL
    )


# ---------- subscription state ----------

def days_left(user: User, now: Optional[datetime] = None) -> int:
    now = now or datetime.utcnow()
    end = user.subscription_end_date
    if end and end > now:
        return (end - now).days + 1
    return 0


def subscription_status(user: User, now: Optional[datetime] = None) -> str:
    """active | expiring (7 days or fewer) | expired (paid before, lapsed) | pending (never paid / revoked)."""
    now = now or datetime.utcnow()
    if not user.is_approved or not user.subscription_end_date:
        return "pending"
    if user.subscription_end_date <= now:
        return "expired"
    return "expiring" if days_left(user, now) <= EXPIRING_DAYS else "active"


def has_access(user: User, now: Optional[datetime] = None) -> bool:
    if is_admin_user(user):
        return True
    return subscription_status(user, now) in ("active", "expiring")


# ---------- token -> user ----------

def _unauthorized(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=message,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def _user_from_header(authorization: Optional[str], db: AsyncSession) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise _unauthorized("Authentication token required.")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])  # expiry is enforced
    except JWTError:
        raise _unauthorized("Token invalid or expired.")
    email = str(payload.get("sub") or "").strip().lower()
    if not email:
        raise _unauthorized("Invalid token identity.")
    res = await db.execute(select(User).where(func.lower(User.email) == email))
    user = res.scalar_one_or_none()
    if user is None or user.is_active is False:
        raise _unauthorized("User account not found.")
    return user


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await _user_from_header(authorization, db)


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    try:
        return await _user_from_header(authorization, db)
    except HTTPException:
        return None


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if not is_admin_user(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Instructor/Admin privileges required.")
    return user


async def require_subscriber(user: User = Depends(get_current_user)) -> User:
    """Admins, and students whose subscription is running. Everyone else is told why."""
    if has_access(user):
        return user
    state = subscription_status(user)
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "code": "subscription_expired" if state == "expired" else "subscription_required",
            "message": "তোমার সাবস্ক্রিপশন সক্রিয় নেই। রিনিউ করতে শিক্ষকের সাথে যোগাযোগ করো।",
        },
    )
