# app.py
# Flask camera server with start/stop/resolution control API

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from camera import camera
from thermal_cam import thermal_camera

app = Flask(__name__)
CORS(app)  # allow React frontend to call these endpoints

# ── Stream ────────────────────────────────────────────────────────────

def generate():
    while True:
        frame = camera.get_frame()
        if frame is None:
            break
        yield (
            b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n'
        )

@app.route('/stream')
def stream():
    if not camera.streaming:
        return jsonify({"error": "Camera not started"}), 503
    return Response(
        generate(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
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
@app.route('/thermal/start', methods=['POST'])
def thermal_start():
    thermal_camera.start()
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
# ── Run ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    # Auto-start camera at default resolution
    camera.start('640x480')
    app.run(host='0.0.0.0', port=8080, threaded=True)