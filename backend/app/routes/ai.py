from fastapi import APIRouter
import json
import os
import time
from datetime import datetime

# Shared state object
ai_state = {
    "infrastructure_mode": False,
    "powerline_mode": False
}

router = APIRouter(
    prefix="/ai",
    tags=["AI"]
)

# Robust path detection
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
AI_STATE_FILE = os.path.join(BASE_DIR, "ai_state.json")

@router.get("/latest")
async def get_latest_ai():
    """
    Returns latest AI detections from active pipeline with health metrics.
    """
    if not os.path.exists(AI_STATE_FILE):
        return {
            "state": "OFFLINE",
            "fps": 0,
            "detections": [],
            "status": "offline",
            "pipeline": "none"
        }

    try:
        with open(AI_STATE_FILE, "r") as f:
            data = json.load(f)
            
            # Determine staleness
            ts_str = data.get("timestamp")
            is_stale = True
            
            if ts_str:
                try:
                    # Clean timestamp for older Python support
                    clean_ts = str(ts_str).replace('Z', '+00:00').strip()
                    dt = datetime.fromisoformat(clean_ts)
                    diff = time.time() - dt.timestamp()
                    if diff < 5.0:
                        is_stale = False
                except Exception:
                    pass

            data["status"] = "online" if not is_stale else "stale"
            data["heartbeat_valid"] = not is_stale
            return data

    except Exception as e:
        return {
            "state": "ERROR",
            "fps": 0,
            "detections": [],
            "status": "error",
            "error": str(e)
        }

@router.get("/state")
async def get_ai_state():
    return ai_state

@router.post("/infrastructure/enable")
async def enable_infrastructure():
    ai_state["infrastructure_mode"] = True
    ai_state["powerline_mode"] = False
    print("[AI] Infrastructure mode ENABLED")
    return {"success": True, "mode": "infrastructure", "enabled": True}

@router.post("/infrastructure/disable")
async def disable_infrastructure():
    ai_state["infrastructure_mode"] = False
    print("[AI] Infrastructure mode DISABLED")
    return {"success": True, "mode": "infrastructure", "enabled": False}

@router.post("/powerline/enable")
async def enable_powerline():
    ai_state["powerline_mode"] = True
    ai_state["infrastructure_mode"] = False
    print("[AI] Powerline mode ENABLED")
    return {"success": True, "mode": "powerline", "enabled": True}

@router.post("/powerline/disable")
async def disable_powerline():
    ai_state["powerline_mode"] = False
    print("[AI] Powerline mode DISABLED")
    return {"success": True, "mode": "powerline", "enabled": False}
