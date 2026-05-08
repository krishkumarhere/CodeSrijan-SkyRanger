# app.py
# Flask camera server with start/stop/resolution control API

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import time
from camera import camera
from thermal_cam import thermal_camera
import threading
try:
    from ai_core.pipeline.inference_pipeline import InferencePipeline
    HAS_AI = True
except ImportError:
    HAS_AI = False
    print("[WARN] ai_core not found, running without AI inference")

app = Flask(__name__)
CORS(app)  # allow React frontend to call these endpoints

# ── AI Inference State ────────────────────────────────────────────────
latest_detections = {"mode": "IDLE", "detections": [], "timestamp": 0}
pipeline = InferencePipeline() if HAS_AI else None
ai_lock = threading.Lock()

def ai_worker():
    """Background thread for local AI inference"""
    global latest_detections
    print("[AI] Worker started")
    while True:
        if not HAS_AI or not camera.streaming:
            time.sleep(1)
            continue
            
        frame = camera.get_raw_frame()
        if frame is None:
            time.sleep(0.1)
            continue
            
        try:
            # Run inference on raw frame
            result = pipeline.run(frame)
            
            with ai_lock:
                latest_detections = {
                    "mode": result.mode,
                    "detections": result.detections,
                    "timestamp": time.time()
                }
        except Exception as e:
            print(f"[AI] Error: {e}")
            
        # Throttling AI to ~2-3 FPS to save Pi CPU
        time.sleep(0.3)

# Start AI thread
threading.Thread(target=ai_worker, daemon=True).start()

# ── Stream ────────────────────────────────────────────────────────────

def generate():
    frame_count = 0
    while True:
        # 1. Throttling: Sleep to cap FPS
        time.sleep(0.08)  # Target ~12 FPS capture, ~6 FPS stream after skipping
        
        frame = camera.get_frame()
        if frame is None:
            break
            
        # 2. Frame Skipping: Send every 2nd frame to further reduce bandwidth
        frame_count += 1
        if frame_count % 2 != 0:
            continue

        yield (
            b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n'
        )

@app.route('/')
def index():
    return jsonify({
        "message": "SkyRanger Pi camera server",
        "routes": {
            "stream": "/stream",
            "camera_status": "/camera/status",
            "camera_start": "/camera/start",
            "camera_stop": "/camera/stop",
            "camera_resolution": "/camera/resolution",
            "thermal_stream": "/thermal/stream",
        }
    })


@app.route('/stream')
def stream():
    if not camera.streaming:
        camera.start(camera.resolution)
        if not camera.streaming:
            return jsonify({"error": "Camera not started"}), 503

    return Response(
        generate(),
        mimetype='multipart/x-mixed-replace; boundary=frame',
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@app.route('/thermal/stream')
def thermal_stream():
    if not thermal_camera.streaming:
        return jsonify({"error": "Thermal camera not started"}), 503
    return Response(
        generate_thermal(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )


def generate_thermal():
    while True:
        frame = thermal_camera.get_frame()
        if frame is None:
            continue
        yield (
            b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n'
        )
# ── Control API ───────────────────────────────────────────────────────

@app.route('/camera/start', methods=['POST'])
def start():
    data       = request.get_json() or {}
    resolution = data.get('resolution', '640x480')
    camera.start(resolution)
    return jsonify({"ok": True, "status": camera.status})

@app.route('/camera/stop', methods=['POST'])
def stop():
    camera.stop()
    return jsonify({"ok": True, "status": camera.status})

@app.route('/camera/resolution', methods=['POST'])
def change_resolution():
    data       = request.get_json() or {}
    resolution = data.get('resolution')
    if not resolution:
        return jsonify({"error": "resolution required"}), 400
    ok = camera.change_resolution(resolution)
    if not ok:
        return jsonify({"error": "Invalid resolution"}), 400
    return jsonify({"ok": True, "status": camera.status})

@app.route('/camera/status')
def status():
    return jsonify(camera.status)

@app.route('/camera/detections')
def detections():
    """Returns latest detections from local AI"""
    with ai_lock:
        return jsonify(latest_detections)
@app.route('/thermal/start', methods=['POST'])
def thermal_start():
    print("[FLASK] /thermal/start called")
    thermal_camera.start()
    print(f"[FLASK] Thermal start status: {thermal_camera.status}")
    if not thermal_camera.streaming:
        return jsonify({"ok": False, "error": thermal_camera.error or "Failed to start thermal camera"}), 500
    return jsonify({"ok": True, "status": thermal_camera.status})

@app.route('/thermal/stop', methods=['POST'])
def thermal_stop():
    thermal_camera.stop()
    return jsonify({"ok": True, "status": thermal_camera.status})

@app.route('/thermal/status')
def thermal_status():
    return jsonify(thermal_camera.status)

@app.route('/thermal/ping')
def thermal_ping():
    return jsonify({"thermal_loaded": True, "status": thermal_camera.status})

@app.route('/thermal/test')
def thermal_test():
    print("[FLASK] Thermal test called")
    try:
        print("[FLASK] Starting thermal camera...")
        thermal_camera.start()
        print("[FLASK] Thermal camera started")
        return jsonify({"status": thermal_camera.status})
    except Exception as e:
        print(f"[FLASK] Thermal test error: {e}")
        return jsonify({"error": str(e)})

# ── Run ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, threaded=True)   