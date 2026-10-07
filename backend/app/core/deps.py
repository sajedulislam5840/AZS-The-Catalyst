from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.core.security import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user_role(token: str = Depends(oauth2_scheme)) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        role: str = payload.get("role")
        if role is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return role
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def require_admin(role: str = Depends(get_current_user_role)):
    if role.upper() != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return role