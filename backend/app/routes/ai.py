from fastapi import APIRouter
from app.core.ai_state import ai_state
import json
import os
import time
from datetime import datetime
from pathlib import Path

router = APIRouter(
    prefix="/ai",
    tags=["AI"]
)

# Robust project root resolution
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
AI_STATE_FILE = BASE_DIR / "ai_state.json"


# ─────────────────────────────────────────────────────────────
# LIVE AI RESULTS
# ─────────────────────────────────────────────────────────────

@router.get("/latest")
async def get_latest_ai():
    """
    Returns latest AI detections from active pipeline with health metrics.
    """

    if not AI_STATE_FILE.exists():
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
                    # Parse ISO timestamp from pipeline (handling Z for older Python)
                    clean_ts = str(ts_str).replace('Z', '+00:00').strip()
                    dt = datetime.fromisoformat(clean_ts)
                    diff = time.time() - dt.timestamp()
                    if diff < 5.0:  # 5 second threshold for "Live"
                        is_stale = False
                except Exception as e:
                    print(f"[AI] Heartbeat Parse Error: {e}")

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


# ─────────────────────────────────────────────────────────────
# AI MODE STATE
# ─────────────────────────────────────────────────────────────

@router.get("/state")
async def get_ai_state():

    return ai_state


# ─────────────────────────────────────────────────────────────
# INFRASTRUCTURE MODE
# ─────────────────────────────────────────────────────────────

@router.post("/infrastructure/enable")
async def enable_infrastructure():

    # Enable infra
    ai_state["infrastructure_mode"] = True

    # Disable powerline
    ai_state["powerline_mode"] = False

    print(
        "[AI] Infrastructure mode ENABLED"
    )

    return {
        "success": True,
        "mode": "infrastructure",
        "enabled": True
    }


@router.post("/infrastructure/disable")
async def disable_infrastructure():

    ai_state["infrastructure_mode"] = False

    print(
        "[AI] Infrastructure mode DISABLED"
    )

    return {
        "success": True,
        "mode": "infrastructure",
        "enabled": False
    }


# ─────────────────────────────────────────────────────────────
# POWERLINE MODE
# ─────────────────────────────────────────────────────────────

@router.post("/powerline/enable")
async def enable_powerline():

    # Enable powerline
    ai_state["powerline_mode"] = True

    # Disable infrastructure
    ai_state["infrastructure_mode"] = False

    print(
        "[AI] Powerline mode ENABLED"
    )

    return {
        "success": True,
        "mode": "powerline",
        "enabled": True
    }


@router.post("/powerline/disable")
async def disable_powerline():

    ai_state["powerline_mode"] = False

    print(
        "[AI] Powerline mode DISABLED"
    )

    return {
        "success": True,
        "mode": "powerline",
        "enabled": False
    }