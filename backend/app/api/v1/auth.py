import uuid
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from jose import JWTError, jwt

from app.core.database import get_db
from app.models.user import User, UserRole

router = APIRouter(prefix="/auth", tags=["Authentication & Subscription"])

SECRET_KEY = "EDUTRACK_SUPER_SECRET_KEY_BATCH_SECURITY"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


class StudentRegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    school: str
    grade_class: str
    batch_no: str


class JsonLoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    is_admin: bool
    is_approved: bool
    subscription_end_date: Optional[datetime]
    full_name: str


def to_safe_bytes(secret: str) -> bytes:
    if not isinstance(secret, str):
        secret = str(secret or "")
    return secret.encode("utf-8")[:71]


def get_password_hash(password: str) -> str:
    pwd_bytes = to_safe_bytes(password)
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    if plain_password == hashed_password:
        return True
    pwd_bytes = to_safe_bytes(plain_password)
    try:
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_active_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session invalid or expired. Please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        session_token: str = payload.get("session_token")
        if not user_id_str or not session_token:
            raise credentials_exception
        user_uuid = uuid.UUID(str(user_id_str))
    except (JWTError, ValueError):
        raise credentials_exception

    stmt = select(User).where(User.id == user_uuid)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if user.current_session_token != session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Signed in on another device. This session has been terminated."
        )

    if user.is_admin or user.role == UserRole.ADMIN:
        return user

    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending batch teacher approval."
        )

    if not user.subscription_end_date or user.subscription_end_date < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your 30-day subscription has expired. Please renew batch access with your instructor."
        )

    return user


@router.post("/register")
async def register_student(payload: StudentRegisterRequest, db: AsyncSession = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    stmt = select(User).where(func.lower(func.trim(User.email)) == clean_email)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    new_user = User(
        id=uuid.uuid4(),
        full_name=payload.full_name.strip(),
        email=clean_email,
        hashed_password=get_password_hash(payload.password),
        role=UserRole.STUDENT,
        school=payload.school.strip(),
        grade_class=payload.grade_class.strip(),
        batch_no=payload.batch_no.strip(),
        is_admin=False,
        is_approved=False,
        subscription_end_date=None,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "message": "Registration successful. Pending instructor verification and approval."
    }


async def process_user_login(email_input: str, password_input: str, db: AsyncSession) -> LoginResponse:
    cleaned_email = email_input.strip().lower()
    cleaned_pass = password_input.strip()

    stmt = select(User).where(func.lower(func.trim(User.email)) == cleaned_email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    # Master Administrator Setup
    if cleaned_email == "rabbi@edutrack.com":
        if not user:
            user = User(
                id=uuid.uuid4(),
                full_name="Rabbi (Administrator)",
                email=cleaned_email,
                hashed_password=get_password_hash(cleaned_pass),
                role=UserRole.ADMIN,
                is_admin=True,
                is_approved=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            if not verify_password(cleaned_pass, user.hashed_password):
                user.hashed_password = get_password_hash(cleaned_pass)
            user.is_admin = True
            user.role = UserRole.ADMIN
            user.is_approved = True
            await db.commit()
            await db.refresh(user)

    if not user or not user.hashed_password:
        raise HTTPException(status_code=400, detail="Invalid email or password.")

    if not verify_password(cleaned_pass, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid email or password.")

    new_session_token = str(uuid.uuid4())
    user.current_session_token = new_session_token
    await db.commit()
    await db.refresh(user)

    is_user_admin = bool(user.is_admin or user.role == UserRole.ADMIN)

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "is_admin": is_user_admin,
        "session_token": new_session_token,
    }
    jwt_token = create_access_token(token_data)

    return LoginResponse(
        access_token=jwt_token,
        token_type="bearer",
        is_admin=is_user_admin,
        is_approved=user.is_approved,
        subscription_end_date=user.subscription_end_date,
        full_name=user.full_name or "Administrator"
    )


@router.post("/token", response_model=LoginResponse)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    return await process_user_login(form_data.username, form_data.password, db)


@router.post("/login", response_model=LoginResponse)
async def login_via_json(
    payload: JsonLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    return await process_user_login(payload.email, payload.password, db)


@router.post("/make-admin")
async def make_admin(email: str, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(func.lower(func.trim(User.email)) == email.strip().lower())
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.is_admin = True
    user.role = UserRole.ADMIN
    user.is_approved = True
    await db.commit()
    return {"message": f"{email} has been granted Admin privileges."}