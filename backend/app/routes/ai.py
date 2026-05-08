from fastapi import APIRouter
import json
import os

router = APIRouter(prefix="/ai", tags=["AI"])

# Robust path to project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
AI_STATE_FILE = os.path.join(BASE_DIR, "ai_state.json")

@router.get("/latest")
async def get_latest_ai():
    """
    Returns the latest AI detection results from the Pi pipeline.
    """
    if not os.path.exists(AI_STATE_FILE):
        return {
            "state": "CLEAR",
            "fps": 0,
            "detections": [],
            "status": "offline"
        }
    
    try:
        with open(AI_STATE_FILE, "r") as f:
            data = json.load(f)
            data["status"] = "online"
            return data
    except Exception as e:
        return {
            "state": "CLEAR",
            "fps": 0,
            "detections": [],
            "status": "error",
            "error": str(e)
        }
