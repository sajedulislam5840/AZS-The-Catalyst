from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt
import bcrypt
import os

SECRET_KEY = os.getenv("SECRET_KEY", "edutrack_academic_secret_jwt_key_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        # plain password এবং hashed password বাইটসে রূপান্তর
        plain_bytes = plain_password.encode("utf-8")
        # 72 বাইট লিমিট সেফগার্ড (bcrypt limit)
        if len(plain_bytes) > 72:
            plain_bytes = plain_bytes[:72]
            
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception as e:
        print(f"[Auth Error] verify_password failed: {e}")
        return False


def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    if len(pwd_bytes) > 72:
        pwd_bytes = pwd_bytes[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def create_access_token(subject: Union[str, Any], role: str, expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(subject),
        "role": role,
        "exp": expire
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt