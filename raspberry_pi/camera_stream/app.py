# app.py
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import time
from camera import usb_camera, pi_camera
from thermal_cam import thermal_camera
import threading

try:
    from ai_core.pipeline.inference_pipeline import InferencePipeline
    HAS_AI = True
except ImportError:
    HAS_AI = False
    print("[WARN] ai_core not found, running without AI inference")

app = Flask(__name__)
CORS(app)

# ── AI Inference State ────────────────────────────────────────────────
latest_detections = {"mode": "IDLE", "detections": [], "timestamp": 0}
pipeline = InferencePipeline() if HAS_AI else None
ai_lock = threading.Lock()

def ai_worker():
    """Background thread for local AI inference - Targeting Pi Cam 3"""
    global latest_detections
    print("[AI] Worker started (Targeting Pi Cam 3)")
    while True:
        if not HAS_AI or not pi_camera.streaming:
            time.sleep(1)
            continue
            
        # AI typically needs the raw frame (numpy array)
        frame = pi_camera.last_frame
        if frame is None:
            time.sleep(0.1)
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
        time.sleep(0.3)

threading.Thread(target=ai_worker, daemon=True).start()

# ── Streaming Generators ──────────────────────────────────────────────

def generate_stream(camera_obj, fps_throttle=0.06):
    """Universal generator for any camera object"""
    while True:
        time.sleep(fps_throttle) 
        frame = camera_obj.get_frame()
        if frame is None:
            continue
        yield (
            b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n'
        )

@app.route('/')
def index():
    return jsonify({
        "status": "SkyRanger Dual-Stream Server Active",
        "cameras": {
            "usb": usb_camera.streaming,
            "pi": pi_camera.streaming
        },
        "endpoints": {
            "usb_stream": "/stream/usb",
            "pi_stream": "/stream/pi",
            "thermal_stream": "/thermal/stream",
            "detections": "/camera/detections"
        }
    })

@app.route('/stream/usb')
def stream_usb():
    return Response(generate_stream(usb_camera),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/stream/pi')
@app.route('/stream') # Legacy support
def stream_pi():
    return Response(generate_stream(pi_camera),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/camera/detections')
def detections():
    with ai_lock:
        return jsonify(latest_detections)

# ── Control API ───────────────────────────────────────────────────────

@app.route('/camera/status')
def status():
    return jsonify({
        "usb": {"streaming": usb_camera.streaming, "res": usb_camera.resolution},
        "pi": {"streaming": pi_camera.streaming, "res": pi_camera.resolution}
    })

# ... Thermal routes remain unchanged ...
@app.route('/thermal/stream')
def thermal_stream():
    if not thermal_camera.streaming:
        return jsonify({"error": "Thermal camera not started"}), 503
    return Response(generate_thermal(), mimetype='multipart/x-mixed-replace; boundary=frame')

def generate_thermal():
    while True:
        frame = thermal_camera.get_frame()
        if frame is None: continue
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

if __name__ == '__main__':
    # Trigger both cameras on startup as requested
    print("[BOOT] Initializing Dual Camera System...")
    usb_camera.start("640x480")
    pi_camera.start("1280x720") # Pi Cam 3 usually higher res
    
    app.run(host='0.0.0.0', port=8080, threaded=True)

# ── Run ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, threaded=True)   