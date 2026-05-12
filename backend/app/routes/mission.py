from fastapi import APIRouter, HTTPException
from app.core.mavlink_handler import fetch_mission, get_mission_status

router = APIRouter(
    prefix="/mission",
    tags=["Mission"]
)

@router.get("")
def get_mission_list():
    """
    Fetches the current mission from Pixhawk.
    SkyRanger follows QGroundControl authoritative mission.
    """
    try:
        mission = fetch_mission()
        return {"mission": mission}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
def get_mission_status_api():
    """
    Returns live mission execution status (active WP, total WPs).
    """
    try:
        return get_mission_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync")
def sync_mission_api():
    """
    Manually triggers a mission sync from Pixhawk.
    """
    try:
        mission = fetch_mission()
        return {"status": "synced", "count": len(mission)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))