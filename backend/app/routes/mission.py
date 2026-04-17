from fastapi import APIRouter, HTTPException
from app.core.mavlink_handler import upload_mission

router = APIRouter()

@router.post("/upload_mission")
def upload_mission_api(data: dict):
    try:
        return upload_mission(data["mission"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))