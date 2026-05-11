from fastapi import APIRouter
from app.core.ai_state import ai_state

import json
import os

router = APIRouter(
    prefix="/ai",
    tags=["AI"]
)

# Robust path to project root
BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.dirname(
                os.path.abspath(__file__)
            )
        )
    )
)

AI_STATE_FILE = os.path.join(
    BASE_DIR,
    "ai_state.json"
)


# ─────────────────────────────────────────────────────────────
# LIVE AI RESULTS
# ─────────────────────────────────────────────────────────────

@router.get("/latest")
async def get_latest_ai():
    """
    Returns latest AI detections from infrastructure pipeline.
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


# ─────────────────────────────────────────────────────────────
# AI MODE CONTROL
# ─────────────────────────────────────────────────────────────

@router.get("/state")
async def get_ai_state():

    return ai_state


@router.post("/infrastructure/enable")
async def enable_infrastructure():

    ai_state["infrastructure_mode"] = True

    print("[AI] Infrastructure mode ENABLED")

    return {
        "success": True,
        "mode": "infrastructure",
        "enabled": True
    }


@router.post("/infrastructure/disable")
async def disable_infrastructure():

    ai_state["infrastructure_mode"] = False

    print("[AI] Infrastructure mode DISABLED")

    return {
        "success": True,
        "mode": "infrastructure",
        "enabled": False
    }