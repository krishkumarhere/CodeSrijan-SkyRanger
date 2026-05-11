# app/core/mavlink_handler.py
# Responsible for ONE thing only: talking to Pixhawk via MAVLink
# Follows Single Responsibility Principle — this file never touches HTTP or WebSocket

from pymavlink import mavutil
from config import MAVLINK_CONNECTION, MAVLINK_BAUD
import threading
import time

import math

# Module-level variable — one connection shared across the entire app
_connection = None
# Global state dictionary updated continuously by the background thread
_telemetry_state = {
    'armed': False, 'flight_mode': "DISCONNECTED",
    'roll': 0, 'pitch': 0, 'yaw': 0,
    'lat': 0, 'lon': 0, 'alt': 0,
    'heading': 0, 'speed': 0,
    'battery_voltage': 0, 'battery_remaining': 0,
    'satellites': 0, 'fix_type': 0, 'gps_fix': False
}

_mission_state = []
_active_wp = -1

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
    global _telemetry_state, _active_wp
    
    while True:
        if _connection is None:
            time.sleep(0.1)
            continue
            
        msg = _connection.recv_match(blocking=True)
        if not msg:
            continue
            
        msg_type = msg.get_type()
        
        if msg_type == 'ATTITUDE':
            _telemetry_state['roll']  = round(math.degrees(msg.roll), 1)
            _telemetry_state['pitch'] = round(math.degrees(msg.pitch), 1)
            _telemetry_state['yaw']   = round(math.degrees(msg.yaw), 1)
            
        elif msg_type == 'GLOBAL_POSITION_INT':
            _telemetry_state['lat'] = msg.lat / 1e7
            _telemetry_state['lon'] = msg.lon / 1e7
            _telemetry_state['alt'] = msg.relative_alt / 1000.0   # mm → meters
            _telemetry_state['heading'] = msg.hdg / 100.0         # cdeg → deg
            # Ground speed from vx, vy (cm/s → m/s)
            _telemetry_state['speed'] = round(math.sqrt(msg.vx**2 + msg.vy**2) / 100.0, 2)
            
        elif msg_type == 'SYS_STATUS':
            _telemetry_state['battery_voltage']   = msg.voltage_battery / 1000.0  # mV → V
            _telemetry_state['battery_remaining'] = msg.battery_remaining          # 0-100%
            
        elif msg_type == 'GPS_RAW_INT':
            _telemetry_state['fix_type']   = msg.fix_type
            _telemetry_state['satellites'] = msg.satellites_visible
            # Only treat GPS as valid if fix_type >= 3 (3D Fix)
            _telemetry_state['gps_fix']    = msg.fix_type >= 3
            
        elif msg_type == 'HEARTBEAT':
            _telemetry_state['armed'] = bool(msg.base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED)
            _telemetry_state['flight_mode'] = mavutil.mode_string_v10(msg)

        elif msg_type == 'MISSION_CURRENT':
            _active_wp = msg.seq

def get_telemetry() -> dict:
    """
    Returns a copy of the latest telemetry instantly without blocking.
    """
    return dict(_telemetry_state)

def fetch_mission():
    """
    Downloads mission from Pixhawk.
    """
    global _mission_state
    conn = get_connection()
    if conn is None: return []

    print("[MISSION] Requesting mission list...")
    conn.mav.mission_request_list_send(conn.target_system, conn.target_component)
    
    msg = conn.recv_match(type=['MISSION_COUNT'], blocking=True, timeout=3)
    if not msg:
        print("[MISSION] Timeout waiting for MISSION_COUNT")
        return _mission_state

    count = msg.count
    print(f"[MISSION] Found {count} mission items. Downloading...")
    
    new_mission = []
    for i in range(count):
        conn.mav.mission_request_int_send(conn.target_system, conn.target_component, i)
        item = conn.recv_match(type=['MISSION_ITEM_INT'], blocking=True, timeout=2)
        if not item:
            print(f"[MISSION] Timeout waiting for item {i}")
            break
        
        new_mission.append({
            "seq": item.seq,
            "lat": item.x / 1e7,
            "lon": item.y / 1e7,
            "alt": item.z,
            "command": item.command,
            "frame": item.frame,
            "param1": item.param1,
            "param2": item.param2,
            "param3": item.param3,
            "param4": item.param4
        })

    _mission_state = new_mission
    return _mission_state

def get_mission_status():
    """
    Returns current mission progress.
    """
    return {
        "total_wps": len(_mission_state),
        "active_wp": _active_wp,
        "is_autonomous": _telemetry_state['flight_mode'] in ["AUTO", "MISSION", "GUIDED"]
    }

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
    fetch_mission() # Sync back

    return {"status": "success", "waypoints": count}