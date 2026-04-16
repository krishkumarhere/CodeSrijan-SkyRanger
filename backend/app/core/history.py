# app/core/history.py
# Functions to write and read historical data

from sqlalchemy.orm import Session
from app.core.database import SensorReading, TelemetryReading
from datetime import datetime, timedelta

# ── Write ─────────────────────────────────────────────────────────────

def save_sensor_reading(db: Session, data: dict):
    row = SensorReading(
        temperature = data.get("temperature"),
        humidity    = data.get("humidity"),
        vibration   = data.get("vibration", False),
        motion      = data.get("motion", False),
        vib_alarm   = data.get("vib_alarm", False),
        pir_alarm   = data.get("pir_alarm", False),
    )
    db.add(row)
    db.commit()

def save_telemetry_reading(db: Session, data: dict):
    row = TelemetryReading(
        altitude          = data.get("alt"),
        speed             = data.get("vx"),
        battery_remaining = data.get("battery_remaining"),
        battery_voltage   = data.get("battery_voltage"),
        satellites        = data.get("satellites"),
        gps_fix           = data.get("gps_fix"),
        roll              = data.get("roll"),
        pitch             = data.get("pitch"),
        yaw               = data.get("yaw"),
        lat               = data.get("lat"),
        lon               = data.get("lon"),
        flight_mode       = data.get("flight_mode"),
        armed             = data.get("armed", False),
    )
    db.add(row)
    db.commit()

# ── Read ──────────────────────────────────────────────────────────────

def get_sensor_history(db: Session, hours: int = 1):
    """Last N hours of sensor readings"""
    since = datetime.utcnow() - timedelta(hours=hours)
    rows = db.query(SensorReading)\
             .filter(SensorReading.timestamp >= since)\
             .order_by(SensorReading.timestamp.asc())\
             .all()
    return [
        {
            "timestamp":   r.timestamp.isoformat(),
            "temperature": r.temperature,
            "humidity":    r.humidity,
            "vibration":   r.vibration,
            "motion":      r.motion,
            "vib_alarm":   r.vib_alarm,
            "pir_alarm":   r.pir_alarm,
        }
        for r in rows
    ]

def get_sensor_stats(db: Session, hours: int = 24):
    """Summary stats for the last N hours"""
    since = datetime.utcnow() - timedelta(hours=hours)
    rows = db.query(SensorReading)\
             .filter(SensorReading.timestamp >= since)\
             .all()

    if not rows:
        return {}

    temps = [r.temperature for r in rows if r.temperature is not None]
    hums  = [r.humidity    for r in rows if r.humidity    is not None]

    return {
        "total_readings":    len(rows),
        "temp_avg":          round(sum(temps) / len(temps), 1) if temps else None,
        "temp_max":          max(temps) if temps else None,
        "temp_min":          min(temps) if temps else None,
        "humidity_avg":      round(sum(hums) / len(hums), 1)  if hums  else None,
        "vibration_events":  sum(1 for r in rows if r.vibration),
        "alarm_events":      sum(1 for r in rows if r.vib_alarm or r.pir_alarm),
        "pir_events":        sum(1 for r in rows if r.motion),
    }