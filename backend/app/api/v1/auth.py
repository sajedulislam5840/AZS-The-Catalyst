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