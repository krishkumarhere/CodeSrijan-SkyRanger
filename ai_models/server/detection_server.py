# ai_models/server/detection_server.py
import cv2
import base64
import asyncio
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))
from ai_models.detection.detector import HumanDetector

app = FastAPI(title="SkyRanger AI Detection Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = HumanDetector()


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": detector._model is not None}


@app.post("/detection/start")
def start_detection():
    detector.load()
    detector.active = True
    return {"status": "started"}


@app.post("/detection/stop")
def stop_detection():
    detector.unload()
    return {"status": "stopped"}


@app.websocket("/ws/detection")
async def detection_ws(websocket: WebSocket):
    """
    Receives JPEG frames from Pi (or laptop webcam for testing),
    runs YOLO, sends back:
      - base64 annotated frame
      - detection metadata (JSON)
    """
    await websocket.accept()
    print("[WS] Client connected")

    try:
        while True:
            # Receive raw JPEG bytes from client
            data = await websocket.receive_bytes()

            if not detector.active:
                await websocket.send_json({"error": "Detection not active. POST /detection/start first."})
                continue

            # Decode JPEG → numpy frame
            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is None:
                await websocket.send_json({"error": "Invalid frame"})
                continue

            # Run detection
            result = detector.detect(frame)

            # Encode annotated frame back to JPEG base64
            _, buffer = cv2.imencode(".jpg", result["annotated_frame"], [cv2.IMWRITE_JPEG_QUALITY, 80])
            frame_b64 = base64.b64encode(buffer).decode("utf-8")

            await websocket.send_json({
                "frame": frame_b64,
                "person_detected": result["person_detected"],
                "animal_detected": result["animal_detected"],
                "action": result["action"],
                "mode": result["mode"],
                "detections": result["detections"],
            })

    except WebSocketDisconnect:
        print("[WS] Client disconnected")
    except Exception as e:
        print(f"[WS] Error: {e}")
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("detection_server:app", host="0.0.0.0", port=8001, reload=True)