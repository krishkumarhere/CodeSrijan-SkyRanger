# app.py

from flask import Flask, Response, jsonify
from flask_cors import CORS
from thermal_stream import generate_thermal_frames

import threading
import time

from camera import usb_camera, pi_camera
from thermal_cam import thermal_camera

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
    """High-performance generator for MJPEG streaming"""
    last_frame = None
    while True:
        # Fetch the pre-encoded JPEG bytes from the background thread
        frame = camera_obj.get_frame()
        
        if frame is None or frame == last_frame:
            # Sleep very briefly to avoid pegging the CPU while waiting for HW
            time.sleep(0.003) 
            continue
            
        last_frame = frame
        yield (
            b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n'
        )

# ─────────────────────────────────────────────────────────────
# ROOT
# ─────────────────────────────────────────────────────────────

@app.route('/')
def index():

    return jsonify({

        "status": "SkyRanger Dual Camera Server Active",

        "cameras": {
            "usb": usb_camera.streaming,
            "pi": pi_camera.streaming
        },

        "streams": {
            "usb_stream": "/stream/usb",
            "pi_stream": "/stream/pi",
            "thermal_stream": "/thermal/stream"
        },

        "ai": {
            "detections": "/camera/detections"
        }
    })

# ─────────────────────────────────────────────────────────────
# USB FPV STREAM
# Logitech C270
# ─────────────────────────────────────────────────────────────

@app.route('/stream/usb')
def stream_usb():

    return Response(
        generate_stream(usb_camera),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

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
# THERMAL CAM STREAM
# MLX90640 Thermal Camera
# ─────────────────────────────────────────────────────────────

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
    return jsonify({"ok": True, "streaming": pi_camera.streaming})

@app.route('/camera/stop', methods=['POST'])
def camera_stop():
    pi_camera.stop()
    return jsonify({"ok": True, "streaming": pi_camera.streaming})

@app.route('/camera/resolution', methods=['POST'])
def camera_resolution():
    from flask import request
    data = request.get_json() or {}
    res = data.get('resolution', '640x480')
    pi_camera.stop()
    time.sleep(0.5)
    pi_camera.start(res)
    return jsonify({"ok": True, "resolution": pi_camera.resolution})

@app.route('/camera/status')
def status():

    return jsonify({

        "usb": {
            "streaming": usb_camera.streaming,
            "resolution": usb_camera.resolution
        },

        "pi": {
            "streaming": pi_camera.streaming,
            "resolution": pi_camera.resolution
        }
    })

# ─────────────────────────────────────────────────────────────
# THERMAL STREAM
# ─────────────────────────────────────────────────────────────

@app.route('/thermal/stream')
def thermal_stream():

    if not thermal_camera.streaming:

        return jsonify({
            "error": "Thermal camera not started"
        }), 503

    return Response(
        generate_thermal(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

def generate_thermal():

    while True:

        frame = thermal_camera.get_frame()

        if frame is None:
            time.sleep(0.05)
            continue

        yield (
            b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n' +
            frame +
            b'\r\n'
        )

# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────

if __name__ == '__main__':

    print("[BOOT] Initializing Dual Camera System...")

    # Logitech FPV Camera
    usb_camera.start("1280x720")

    # Pi Cam 3 for AI
    pi_camera.start("640x480")

    print("[BOOT] Streams Ready:")
    print("  USB FPV  → /stream/usb")
    print("  PI CAM   → /stream/pi")
    print("  THERMAL  → /thermal/stream")

    app.run(
        host='0.0.0.0',
        port=8080,
        threaded=True
    )