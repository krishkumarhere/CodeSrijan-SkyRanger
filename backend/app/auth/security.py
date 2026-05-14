# backend/app/auth/security.py
import time
from datetime import datetime, timedelta
from typing import Optional

import jwt
from passlib.context import CryptContext

# -----------------------------
#   Configuration (demo-only)
# -----------------------------
SECRET_KEY = "CHANGE_ME_TO_A_STRONG_RANDOM_VALUE"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60      # 1-hour tokens

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Hard-coded demo users (plain passwords - replace with DB later)
_DEMO_USERS = {
    "operator": {"password": "skyranger123", "role": "operator"},
    "viewer":   {"password": "viewer123",    "role": "viewer"},
}


def verify_password(plain: str, hashed: str) -> bool:
    """passlib verify - for demo we keep plain passwords."""
    return plain == hashed


def get_user(username: str) -> Optional[dict]:
    """Return user dict or None."""
    return _DEMO_USERS.get(username)


def create_access_token(*, data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.utcnow()
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
