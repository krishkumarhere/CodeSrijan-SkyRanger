# config.py
# Central place for all configuration constants
# Change these values here and they update everywhere

MAVLINK_CONNECTION = "/dev/ttyACM0"  # USB port on Pi (ttyACM0 = Pixhawk over USB)
MAVLINK_BAUD = 57600                  # Pixhawk default baud rate over USB

HOST = "0.0.0.0"   # Listen on all network interfaces (so laptop can reach Pi)
PORT = 8000

# How often we send telemetry to the frontend (seconds)
# 0.2 = 5 times per second (5Hz) — smooth enough for a GCS
TELEMETRY_RATE = 0.2