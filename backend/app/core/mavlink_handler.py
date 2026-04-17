# app/core/mavlink_handler.py
# Responsible for ONE thing only: talking to Pixhawk via MAVLink
# Follows Single Responsibility Principle — this file never touches HTTP or WebSocket

from pymavlink import mavutil
from config import MAVLINK_CONNECTION, MAVLINK_BAUD

# Module-level variable — one connection shared across the entire app
_connection = None

def connect():
    """
    Open MAVLink connection to Pixhawk and wait for first heartbeat.
    Called once at startup.
    """
    global _connection

    print(f"[MAVLink] Connecting to {MAVLINK_CONNECTION} at {MAVLINK_BAUD} baud...")
    _connection = mavutil.mavlink_connection(MAVLINK_CONNECTION, baud=MAVLINK_BAUD)

    # Heartbeat = Pixhawk saying "I'm alive"
    # This blocks until FC responds — if it hangs here, check your USB connection
    _connection.wait_heartbeat()
    print(f"[MAVLink] Heartbeat received. System ID: {_connection.target_system}")

def get_connection():
    """
    Returns the active MAVLink connection.
    Other modules import this instead of touching _connection directly.
    """
    return _connection

def get_telemetry() -> dict:
    """
    Reads multiple MAVLink message types and returns a single clean dict.
    Returns empty dict fields as None if message times out — never crashes.
    """
    conn = get_connection()
    data = {}

    # --- ATTITUDE: roll, pitch, yaw in radians ---
    msg = conn.recv_match(type='ATTITUDE', blocking=True, timeout=1)
    if msg:
        data['roll']  = round(msg.roll, 3)
        data['pitch'] = round(msg.pitch, 3)
        data['yaw']   = round(msg.yaw, 3)
    else:
        data['roll'] = data['pitch'] = data['yaw'] = None

    # --- GPS POSITION ---
    # MAVLink sends lat/lon multiplied by 1e7 (integer), altitude in mm
    msg = conn.recv_match(type='GLOBAL_POSITION_INT', blocking=True, timeout=1)
    if msg:
        data['lat'] = msg.lat / 1e7
        data['lon'] = msg.lon / 1e7
        data['alt'] = msg.relative_alt / 1000   # mm → meters
        data['vx']  = msg.vx / 100              # cm/s → m/s
        data['vy']  = msg.vy / 100
    else:
        data['lat'] = data['lon'] = data['alt'] = None

    # --- BATTERY ---
    msg = conn.recv_match(type='SYS_STATUS', blocking=True, timeout=1)
    if msg:
        data['battery_voltage']   = msg.voltage_battery / 1000  # mV → V
        data['battery_remaining'] = msg.battery_remaining        # 0-100%
    else:
        data['battery_voltage'] = data['battery_remaining'] = None

    # --- GPS QUALITY ---
    msg = conn.recv_match(type='GPS_RAW_INT', blocking=True, timeout=1)
    if msg:
        data['satellites'] = msg.satellites_visible
        data['gps_fix']    = msg.fix_type   # 3 = 3D fix (what you want)
    else:
        data['satellites'] = data['gps_fix'] = None

    # --- ARM STATUS + FLIGHT MODE ---
    msg = conn.recv_match(type='HEARTBEAT', blocking=True, timeout=1)
    if msg:
        data['armed'] = bool(msg.base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED)
        data['flight_mode'] = mavutil.mode_string_v10(msg)
    else:
        data['armed'] = None
        data['flight_mode'] = None

    return data

def upload_mission(waypoints: list):
    """
    Upload mission to Pixhawk using existing MAVLink connection.
    waypoints = [{"lat": ..., "lon": ..., "alt": ...}, ...]
    """
    conn = get_connection()

    if conn is None:
        raise Exception("MAVLink not connected")

    print("[MISSION] Clearing existing mission...")

    # Clear old mission
    conn.mav.mission_clear_all_send(
        conn.target_system,
        conn.target_component
    )

    ack = conn.recv_match(type="MISSION_ACK", blocking=True, timeout=3)
    if not ack:
        raise Exception("Failed to clear mission")

    count = len(waypoints)
    print(f"[MISSION] Uploading {count} waypoints...")

    # Send count
    conn.mav.mission_count_send(
        conn.target_system,
        conn.target_component,
        count
    )

    # Upload each waypoint
    for i in range(count):
        req = conn.recv_match(type=['MISSION_REQUEST', 'MISSION_REQUEST_INT'], blocking=True, timeout=3)

        if not req:
            raise Exception(f"Timeout waiting for waypoint request {i}")

        wp = waypoints[i]

        print(f"[MISSION] Sending WP {i}: {wp}")

        conn.mav.mission_item_int_send(
            conn.target_system,
            conn.target_component,
            seq=i,
            frame=mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT,
            command=mavutil.mavlink.MAV_CMD_NAV_WAYPOINT,
            current=0,
            autocontinue=1,
            param1=0, param2=0, param3=0, param4=0,
            x=int(wp["lat"] * 1e7),
            y=int(wp["lon"] * 1e7),
            z=wp["alt"]
        )

    # Final ACK
    ack = conn.recv_match(type="MISSION_ACK", blocking=True, timeout=5)

    if not ack:
        raise Exception("Mission upload failed (no ACK)")

    print("[MISSION] Upload successful")

    return {"status": "success", "waypoints": count}