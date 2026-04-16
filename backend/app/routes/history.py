# app/routes/history.py
# REST endpoints for historical data — used by frontend charts

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.history import get_sensor_history, get_sensor_stats

router = APIRouter(prefix="/history")

@router.get("/sensors")
def sensor_history(hours: int = 1, db: Session = Depends(get_db)):
    """Returns time-series sensor data for charts"""
    return get_sensor_history(db, hours)

@router.get("/sensors/stats")
def sensor_stats(hours: int = 24, db: Session = Depends(get_db)):
    """Returns summary stats for sensor dashboard"""
    return get_sensor_stats(db, hours)