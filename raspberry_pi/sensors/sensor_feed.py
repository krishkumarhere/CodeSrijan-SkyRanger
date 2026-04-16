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
VIB_PIN   = 17  # GPIO17
PIR_PIN   = 27  # GPIO27

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

    if not SENSORS_AVAILABLE:
        # Mock mode for dev on laptop
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
            time.sleep(2)
        return

    # Real hardware
    dht    = adafruit_dht.DHT11(board.D4)
    vib    = InputDevice(VIB_PIN)
    pir    = MotionSensor(PIR_PIN)

    while True:
        # DHT11 — can throw RuntimeError, always handle it
        try:
            temp = dht.temperature
            hum  = dht.humidity
        except RuntimeError:
            temp = hum = None

        vibrating = vib.is_active
        motion    = pir.motion_detected

        # Turbulence alarm — consecutive vibration hits
        if vibrating:
            _vib_consecutive += 1
        else:
            _vib_consecutive = 0
        vib_alarm = _vib_consecutive >= VIB_ALARM_COUNT

        # PIR alarm — motion detected = object within ~7m below drone
        pir_alarm = motion

        _sensor_data = {
            "temperature": temp,
            "humidity":    hum,
            "vibration":   vibrating,
            "motion":      motion,
            "vib_alarm":   vib_alarm,
            "pir_alarm":   pir_alarm,
        }

        time.sleep(2)  # DHT11 needs 2s between reads

def start_sensor_loop():
    """Call once at startup — runs sensor reading in background thread"""
    t = threading.Thread(target=_read_loop, daemon=True)
    t.start()
    print("[SENSORS] Sensor loop started")

def get_sensor_data() -> dict:
    """Returns latest snapshot — called by WebSocket route"""
    return _sensor_data.copy()