from flask import Flask, Response, jsonify
from flask_cors import CORS

import threading
import time

from camera import pi_camera
from thermal_stream import generate_thermal_frames

# ─────────────────────────────────────────────────────────────
# OPTIONAL AI IMPORT
# ─────────────────────────────────────────────────────────────

try:
    from ai_core.pipeline.inference_pipeline import InferencePipeline

    HAS_AI = True

except ImportError:

    HAS_AI = False

    print("[WARN] ai_core not found, running without AI inference")

# ─────────────────────────────────────────────────────────────
# FLASK APP
# ─────────────────────────────────────────────────────────────

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────────────────────
# AI STATE
# ─────────────────────────────────────────────────────────────

latest_detections = {
    "mode": "IDLE",
    "detections": [],
    "timestamp": 0
}

pipeline = InferencePipeline() if HAS_AI else None

ai_lock = threading.Lock()

# ─────────────────────────────────────────────────────────────
# AI WORKER
# Targets Pi Camera ONLY
# ─────────────────────────────────────────────────────────────

def ai_worker():

    global latest_detections

    print("[AI] Worker started (Pi Cam 3 inference)")

    while True:

        if not HAS_AI:
            time.sleep(1)
            continue

        if not pi_camera.streaming:
            time.sleep(1)
            continue

        frame = pi_camera.last_frame

        if frame is None:
            time.sleep(0.05)
            continue

        try:

            result = pipeline.run(frame)

            with ai_lock:

                latest_detections = {
                    "mode": result.mode,
                    "detections": result.detections,
                    "timestamp": time.time()
                }

        except Exception as e:

            print(f"[AI] Error: {e}")

        # AI intentionally throttled
        time.sleep(0.3)

# Start AI thread
threading.Thread(
    target=ai_worker,
    daemon=True
).start()

# ─────────────────────────────────────────────────────────────
# STREAM GENERATOR
# ─────────────────────────────────────────────────────────────

def generate_stream(camera_obj):
    """MJPEG stream generator"""

    last_frame = None

    while True:

        frame = camera_obj.get_frame()

        if frame is None or frame == last_frame:
            time.sleep(0.003)
            continue

        last_frame = frame

        yield (
            b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n' +
            frame +
            b'\r\n'
        )

# ─────────────────────────────────────────────────────────────
# ROOT
# ─────────────────────────────────────────────────────────────

@app.route('/')
def index():

    return jsonify({
        "status": "SkyRanger Mission Control Server Active",
        "cameras": {
            "pi": pi_camera.streaming,
            "usb": "MANAGED_BY_RTSP_SERVER"
        },
        "streams": {
            "pi_stream": "/stream/pi",
            "thermal_stream": "/thermal/stream",
            "fpv_stream": "rtsp://0.0.0.0:8554/fpv"
        },
        "ai": {
            "detections": "/camera/detections"
        }
    })

# USB FPV STREAM IS NOW MANAGED BY RTSP_SERVER.PY
# This avoids V4L2 device lock contention on /dev/video8

# ─────────────────────────────────────────────────────────────
# PI CAM STREAM
# AI / Inspection Camera
# ─────────────────────────────────────────────────────────────

@app.route('/stream/pi')

# Legacy compatibility
@app.route('/stream')
def stream_pi():

    return Response(
        generate_stream(pi_camera),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

# ─────────────────────────────────────────────────────────────
# THERMAL STREAM
# MLX90640 Thermal Camera
# ─────────────────────────────────────────────────────────────

from thermal_stream import thermal_stats

@app.route('/thermal/status')
def thermal_api_status():
    return jsonify(thermal_stats)

@app.route('/thermal/stream')
def thermal_stream():

    return Response(
        generate_thermal_frames(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

# ─────────────────────────────────────────────────────────────
# AI DETECTIONS
# ─────────────────────────────────────────────────────────────

@app.route('/camera/detections')
def detections():

    with ai_lock:
        return jsonify(latest_detections)

# ─────────────────────────────────────────────────────────────
# CAMERA CONTROL
# ─────────────────────────────────────────────────────────────

@app.route('/camera/start', methods=['POST'])
def camera_start():

    pi_camera.start(pi_camera.resolution)

    return jsonify({
        "ok": True,
        "streaming": pi_camera.streaming
    })

@app.route('/camera/stop', methods=['POST'])
def camera_stop():

    pi_camera.stop()

    return jsonify({
        "ok": True,
        "streaming": pi_camera.streaming
    })

@app.route('/camera/resolution', methods=['POST'])
def camera_resolution():

    from flask import request

    data = request.get_json() or {}

    res = data.get('resolution', '640x480')

    pi_camera.stop()

    time.sleep(0.5)

    pi_camera.start(res)

    return jsonify({
        "ok": True,
        "resolution": pi_camera.resolution
    })

@app.route('/camera/status')
def status():

    return jsonify({
        "pi": {
            "streaming": pi_camera.streaming,
            "resolution": pi_camera.resolution
        },
        "usb": "DECOUPLED_TO_RTSP"
    })
    
@app.route('/camera/frame')
def camera_frame():

    frame = pi_camera.last_frame

    if frame is None:

        return (
            "No frame available",
            404
        )

    import cv2
    import numpy as np

    # If frame already bytes
    if isinstance(frame, bytes):

        return Response(
            frame,
            mimetype='image/jpeg'
        )

    # If frame is ndarray
    success, buffer = cv2.imencode(
        '.jpg',
        frame
    )

    if not success:

        return (
            "Encoding failed",
            500
        )

    return Response(
        buffer.tobytes(),
        mimetype='image/jpeg'
    )

# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────

if __name__ == '__main__':

    # Pi Cam 3 for AI & Inspection
    # USB webcam (Logitech) is EXCLUSIVELY owned by RTSP_server.py
    # to avoid hardware lock contention on V4L2 device /dev/video8
    pi_camera.start("640x480")

    print("[BOOT] Primary Streams Ready:")
    print("  PI CAM   → /stream/pi")
    print("  THERMAL  → /thermal/stream")
    print("  USB FPV  → RTSP_PORT:8554 (Handled by RTSP_server.py)")

    app.run(
        host='0.0.0.0',
        port=8080,
        threaded=True
    )
    
