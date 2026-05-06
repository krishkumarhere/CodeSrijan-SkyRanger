# app/core/mavlink_handler.py
# Responsible for ONE thing only: talking to Pixhawk via MAVLink
# Follows Single Responsibility Principle — this file never touches HTTP or WebSocket

from pymavlink import mavutil
from config import MAVLINK_CONNECTION, MAVLINK_BAUD
import threading
import time

# Module-level variable — one connection shared across the entire app
_connection = None

# Global state dictionary updated continuously by the background thread
_telemetry_state = {
    'armed': None, 'flight_mode': None,
    'roll': None, 'pitch': None, 'yaw': None,
    'lat': None, 'lon': None, 'alt': None,
    'vx': None, 'vy': None,
    'battery_voltage': None, 'battery_remaining': None,
    'satellites': None, 'gps_fix': None
}

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

    # Request all required data streams at 10Hz
    print("[MAVLink] Requesting data streams at 10Hz...")
    _connection.mav.request_data_stream_send(
        _connection.target_system,
        _connection.target_component,
        mavutil.mavlink.MAV_DATA_STREAM_ALL,
        10, # 10Hz
        1   # 1 = start sending
    )

    # Start the background listener thread
    listener_thread = threading.Thread(target=_telemetry_loop, daemon=True)
    listener_thread.start()
    print("[MAVLink] Telemetry background listener started.")

def get_connection():
    """
    Returns the active MAVLink connection.
    Other modules import this instead of touching _connection directly.
    """
    return _connection

def _telemetry_loop():
    """
    Background thread that continuously reads MAVLink messages as fast as they arrive
    and updates the global _telemetry_state dictionary.
    """
    global _telemetry_state
    
    while True:
        if _connection is None:
            time.sleep(0.1)
            continue
            
        msg = _connection.recv_match(blocking=True)
        if not msg:
            continue
            
        msg_type = msg.get_type()
        
        if msg_type == 'ATTITUDE':
            _telemetry_state['roll']  = round(msg.roll, 3)
            _telemetry_state['pitch'] = round(msg.pitch, 3)
            _telemetry_state['yaw']   = round(msg.yaw, 3)
            
        elif msg_type == 'GLOBAL_POSITION_INT':
            _telemetry_state['lat'] = msg.lat / 1e7
            _telemetry_state['lon'] = msg.lon / 1e7
            _telemetry_state['alt'] = msg.relative_alt / 1000   # mm → meters
            _telemetry_state['vx']  = msg.vx / 100              # cm/s → m/s
            _telemetry_state['vy']  = msg.vy / 100
            
        elif msg_type == 'SYS_STATUS':
            _telemetry_state['battery_voltage']   = msg.voltage_battery / 1000  # mV → V
            _telemetry_state['battery_remaining'] = msg.battery_remaining        # 0-100%
            
        elif msg_type == 'GPS_RAW_INT':
            _telemetry_state['satellites'] = msg.satellites_visible
            _telemetry_state['gps_fix']    = msg.fix_type
            
        elif msg_type == 'HEARTBEAT':
            _telemetry_state['armed'] = bool(msg.base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED)
            _telemetry_state['flight_mode'] = mavutil.mode_string_v10(msg)

def get_telemetry() -> dict:
    """
    Returns a copy of the latest telemetry instantly without blocking.
    """
    return dict(_telemetry_state)

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