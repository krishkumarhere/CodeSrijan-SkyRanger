# app/core/sensor_handler.py
# Reads DHT11, vibration, PIR directly and exposes latest readings
# Runs in a background thread — FastAPI reads latest values on demand

import threading
import time

# Sensor libs — only available on Pi
try:
    import board
    import adafruit_dht
    from gpiozero import InputDevice, MotionSensor
    SENSORS_AVAILABLE = True
except (ImportError, NotImplementedError):
    SENSORS_AVAILABLE = False
    print("[SENSORS] Hardware not available — using mock data")

# GPIO pin config
DHT_PIN   = 4   # GPIO4
VIB_PIN   = 23  # GPIO17
PIR_PIN   = 24  # GPIO27

# Thresholds for alarms
PIR_ALARM_DISTANCE = 7    # meters — PIR triggers within 7m of ground
VIB_ALARM_COUNT    = 5    # consecutive vibration hits = turbulence alarm

# Latest sensor state — shared across threads
_sensor_data = {
    "temperature":    None,
    "humidity":       None,
    "vibration":      False,
    "motion":         False,
    "vib_alarm":      False,   # turbulence alarm
    "pir_alarm":      False,   # proximity alarm
}

_vib_consecutive = 0  # track consecutive vibration hits

def _read_loop():
    global _sensor_data, _vib_consecutive

    # Import here to avoid circular imports
    from app.core.database import SessionLocal
    from app.core.history import save_sensor_reading

    if not SENSORS_AVAILABLE:
        import random
        while True:
            _sensor_data = {
                "temperature": round(25 + random.uniform(-2, 2), 1),
                "humidity":    round(55 + random.uniform(-5, 5), 1),
                "vibration":   random.random() > 0.85,
                "motion":      random.random() > 0.7,
                "vib_alarm":   False,
                "pir_alarm":   False,
            }
            # Save to DB
            db = SessionLocal()
            try:
                save_sensor_reading(db, _sensor_data)
            finally:
                db.close()
            time.sleep(2)
        return

    dht = adafruit_dht.DHT11(board.D4)
    vib = InputDevice(VIB_PIN)
    pir = MotionSensor(PIR_PIN)

    while True:
        try:
            temp = dht.temperature
            hum  = dht.humidity
        except RuntimeError:
            temp = hum = None

        vibrating = vib.is_active
        motion    = pir.motion_detected

        if vibrating:
            _vib_consecutive += 1
        else:
            _vib_consecutive = 0
        vib_alarm = _vib_consecutive >= VIB_ALARM_COUNT
        pir_alarm = motion

        _sensor_data = {
            "temperature": temp,
            "humidity":    hum,
            "vibration":   vibrating,
            "motion":      motion,
            "vib_alarm":   vib_alarm,
            "pir_alarm":   pir_alarm,
        }

        # Save to DB
        db = SessionLocal()
        try:
            save_sensor_reading(db, _sensor_data)
        finally:
            db.close()

        time.sleep(2)

def start_sensor_loop():
    """Call once at startup — runs sensor reading in background thread"""
    t = threading.Thread(target=_read_loop, daemon=True)
    t.start()
    print("[SENSORS] Sensor loop started")

def get_sensor_data() -> dict:
    """Returns latest snapshot — called by WebSocket route"""
    return _sensor_data.copy()