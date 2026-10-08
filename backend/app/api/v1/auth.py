import os
import uuid
import hashlib
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from passlib.context import CryptContext
from jose import jwt, JWTError

from app.core.database import get_db
from app.models.user import User

router = APIRouter(tags=["Authentication"])

SECRET_KEY = os.getenv("SECRET_KEY", "edutrack-super-secret-jwt-key-2025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # 30 days session

pwd_context = CryptContext(
    schemes=["bcrypt", "sha256_crypt", "md5_crypt", "des_crypt"],
    deprecated="auto"
)


class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    school: Optional[str] = None
    grade_class: Optional[str] = None
    batch_no: Optional[str] = "General"


class UserLogin(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str
    email: str


class UserMeOut(BaseModel):
    id: str
    full_name: str
    email: str
    school: Optional[str] = None
    grade_class: Optional[str] = None
    batch_no: Optional[str] = None
    role: str
    is_admin: bool = False
    is_approved: bool = False
    subscription_end_date: Optional[datetime] = None


# --- MULTI-ENGINE COMPATIBLE VERIFIER ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password or not plain_password:
        return False

    plain_bytes = plain_password.encode("utf-8")
    clean_hash = hashed_password.strip()

    # 1. Direct plaintext comparison
    if plain_password == clean_hash or plain_password.strip() == clean_hash:
        return True

    # 2. Native C-Bcrypt check (handles $2b$, $2a$, $2y$)
    try:
        hash_bytes = clean_hash.encode("utf-8")
        if bcrypt.checkpw(plain_bytes, hash_bytes):
            return True
    except Exception:
        pass

    # 3. Native C-Bcrypt with normalized $2b$ prefix
    try:
        if clean_hash.startswith("$2y$") or clean_hash.startswith("$2a$"):
            normalized = ("$2b$" + clean_hash[4:]).encode("utf-8")
            if bcrypt.checkpw(plain_bytes, normalized):
                return True
    except Exception:
        pass

    # 4. Standard Passlib crypt-context verification
    try:
        if pwd_context.verify(plain_password, clean_hash):
            return True
    except Exception:
        pass

    # 5. SHA256 / MD5 digest verification
    try:
        sha256_val = hashlib.sha256(plain_bytes).hexdigest()
        if sha256_val.lower() == clean_hash.lower():
            return True
        md5_val = hashlib.md5(plain_bytes).hexdigest()
        if md5_val.lower() == clean_hash.lower():
            return True
    except Exception:
        pass

    return False


def get_password_hash(password: str) -> str:
    safe_pass = password[:72].encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(safe_pass, salt).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# --- 1. USER REGISTRATION ---
@router.post("/register", status_code=status.HTTP_201_CREATED)
@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    clean_email = str(payload.email).strip().lower()

    stmt = select(User).where(func.lower(User.email) == clean_email)
    res = await db.execute(stmt)
    existing_user = res.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    is_admin_account = clean_email == "rabbi@edutrack.com"
    user_role = "ADMIN" if is_admin_account else "STUDENT"

    hashed_pw = get_password_hash(payload.password)
    new_user = User(
        id=uuid.uuid4(),
        full_name=payload.full_name.strip(),
        email=clean_email,
        password_hash=hashed_pw,
        school=payload.school.strip() if payload.school else None,
        grade_class=payload.grade_class.strip() if payload.grade_class else None,
        batch_no=payload.batch_no.strip() if payload.batch_no else "General",
        is_admin=is_admin_account,
        is_approved=True if is_admin_account else False,
        is_active=True,
        role=user_role,
        created_at=datetime.utcnow()
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {"message": "Account created successfully."}


# --- 2. USER LOGIN ---
@router.post("/login", response_model=TokenOut)
@router.post("/auth/login", response_model=TokenOut)
async def login(request: Request, db: AsyncSession = Depends(get_db)):
    email_val = ""
    password_val = ""

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            email_val = str(body.get("email") or body.get("username") or "").strip().lower()
            password_val = str(body.get("password") or "")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON body.")
    else:
        try:
            form = await request.form()
            email_val = str(form.get("email") or form.get("username") or "").strip().lower()
            password_val = str(form.get("password") or "")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid form body.")

    if not email_val or not password_val:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    stmt = select(User).where(func.lower(User.email) == email_val)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found. Please verify your email."
        )

    # Multi-engine check on the exact stored hash
    is_valid_pw = verify_password(password_val, getattr(user, "password_hash", "") or "")
    if not is_valid_pw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again."
        )

    is_admin = bool(
        getattr(user, "is_admin", False) or 
        str(getattr(user, "role", "")).upper() == "ADMIN" or 
        user.email == "rabbi@edutrack.com"
    )
    role_str = "ADMIN" if is_admin else "STUDENT"

    access_token = create_access_token(data={"sub": user.email, "role": role_str})

    return TokenOut(
        access_token=access_token,
        token_type="bearer",
        role=role_str,
        full_name=user.full_name or "User",
        email=user.email
    )


# --- 3. CURRENT USER IDENTITY HANDSHAKE (/me) ---
@router.get("/me", response_model=UserMeOut)
@router.get("/auth/me", response_model=UserMeOut)
async def get_me(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ")[1].strip()

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token identity.")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    stmt = select(User).where(func.lower(User.email) == email.strip().lower())
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    is_admin = bool(
        getattr(user, "is_admin", False) or 
        str(getattr(user, "role", "")).upper() == "ADMIN" or 
        user.email == "rabbi@edutrack.com"
    )
    role_str = "ADMIN" if is_admin else "STUDENT"

    return UserMeOut(
        id=str(user.id),
        full_name=user.full_name or "User",
        email=user.email,
        school=user.school,
        grade_class=user.grade_class,
        batch_no=user.batch_no,
        role=role_str,
        is_admin=is_admin,
        is_approved=bool(user.is_approved),
        subscription_end_date=user.subscription_end_date
    )