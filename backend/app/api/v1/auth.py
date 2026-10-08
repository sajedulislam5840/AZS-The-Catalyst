from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User, UserRole
from app.schemas.auth import UserRegister, UserLogin, TokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == payload.email)
    existing_user = (await db.execute(stmt)).scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Role conversion
    user_role = UserRole.ADMIN if str(payload.role).upper() in ["ADMIN", "USERROLE.ADMIN"] else UserRole.STUDENT

    new_user = User(
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role=user_role
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    role_str = new_user.role.value if hasattr(new_user.role, 'value') else str(new_user.role)
    token = create_access_token(subject=str(new_user.id), role=role_str)
    
    return TokenResponse(
        access_token=token,
        user_id=new_user.id,
        email=new_user.email,
        role=role_str
    )

@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == payload.email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="Email not found")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password")

    role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)
    token = create_access_token(subject=str(user.id), role=role_str)
    
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        role=role_str
    )
    


import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from jose import JWTError, jwt

from app.core.database import get_db
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication & Subscription"])

SECRET_KEY = "EDUTRACK_SUPER_SECRET_KEY_BATCH_SECURITY"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # 30 days token

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


# Schemas
class StudentRegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    school: str
    grade_class: str
    batch_no: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    is_admin: bool
    is_approved: bool
    subscription_end_date: Optional[datetime]
    full_name: str


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# Dependency: Active & Validated Student Session Checker
async def get_current_active_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Login invalid ba onno device theke login korar karone session sesh hoyeche.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        session_token: str = payload.get("session_token")
        if user_id is None or session_token is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    stmt = select(User).where(User.id == int(user_id))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    # 1. Single-Device Session Check (Option A: Invalidate older device)
    if user.current_session_token != session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Apnar account onno ekta device-e login kora hoyeche. Ei device theke auto logout kora holo."
        )

    # Admin bypasses student paywall
    if user.is_admin:
        return user

    # 2. Admin Approval Check
    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apnar account ekhono admin dara approve kora hoy ni. Shikkhor shathe jogajog korun."
        )

    # 3. 30-Day Paywall & Expiry Check
    if not user.subscription_end_date or user.subscription_end_date < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apnar 30 diner batch access sesh hoyeche! Shikkhor kache beton joma diye access renew korun."
        )

    return user


@router.post("/register")
async def register_student(payload: StudentRegisterRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == payload.email)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ei email diye already account khola ache.")

    new_user = User(
        full_name=payload.full_name.strip(),
        email=payload.email.strip().lower(),
        hashed_password=get_password_hash(payload.password),
        school=payload.school.strip(),
        grade_class=payload.grade_class.strip(),
        batch_no=payload.batch_no.strip(),
        is_approved=False,
        subscription_end_date=None,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "message": "Registration shompurno hoyeche! Shikkhor beton verification o approval er por login kora jabe."
    }


@router.post("/token", response_model=LoginResponse)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.email == form_data.username.strip().lower())
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Email othoba Password vul.")

    # Generate Unique Device Session Token
    new_session_token = str(uuid.uuid4())
    user.current_session_token = new_session_token
    await db.commit()
    await db.refresh(user)

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "is_admin": user.is_admin,
        "session_token": new_session_token
    }
    jwt_token = create_access_token(token_data)

    return LoginResponse(
        access_token=jwt_token,
        token_type="bearer",
        is_admin=user.is_admin,
        is_approved=user.is_approved,
        subscription_end_date=user.subscription_end_date,
        full_name=user.full_name
    )