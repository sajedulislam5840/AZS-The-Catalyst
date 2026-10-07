import uuid
from pydantic import BaseModel, EmailStr
from typing import Union
from app.models.user import UserRole

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    role: Union[UserRole, str] = UserRole.STUDENT

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: uuid.UUID
    email: str
    role: str