# backend/app/auth/routes.py
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from .security import get_user, verify_password, create_access_token
from .models import TokenResponse

router = APIRouter(tags=["auth"])


class LoginForm(BaseModel):
    username: str
    password: str


@router.post("/login", response_model=TokenResponse)
async def login(form: LoginForm):
    """
    Demo login - grants 'operator' to krish/krish, and 'viewer' to viewer/viewer.
    """
    if form.username.lower() == "krish" and form.password == "krish":
        role = "operator"
    elif form.username.lower() == "viewer" and form.password == "viewer":
        role = "viewer"
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    access_token = create_access_token(data={"sub": form.username, "role": role})
    return TokenResponse(access_token=access_token, role=role)
