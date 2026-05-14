# backend/app/auth/models.py
from pydantic import BaseModel

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str

class User(BaseModel):
    username: str
    role: str
