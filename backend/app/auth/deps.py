# backend/app/auth/deps.py
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
import jwt

from .security import decode_token
from .models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")   # token endpoint

def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Validate JWT and return a User model.
    Raises 401 if token missing/invalid/expired.
    """
    try:
        payload = decode_token(token)
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None or role is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Invalid token payload")
        return User(username=username, role=role)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Token expired")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Could not validate credentials")


def require_role(allowed_roles: list[str]):
    """
    Dependency factory - use in route signatures:
        def endpoint(..., user: User = Depends(require_role(["operator"])):

    Returns the validated User if role matches, otherwise 403.
    """
    async def role_checker(user: User = Depends(get_current_user)):
        if user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Insufficient permissions")
        return user
    return role_checker

async def block_report_when_flying(request: Request):
    """
    Expected request body contains flight_state fields.
    In a real system you would query the telemetry DB or a live state service.
    For demo we look for a JSON payload:
        {"flight_state": "ARMED|TAKEOFF|MISSION_ACTIVE|LANDING|IDLE|POST_MISSION"}
    """
    try:
        body = await request.json()
    except Exception:
        body = {}
    restricted = {"ARMED", "TAKEOFF", "MISSION_ACTIVE", "LANDING"}
    if body.get("flight_state") in restricted:
        raise HTTPException(
            status_code=403,
            detail="Report generation blocked while drone is active"
        )
