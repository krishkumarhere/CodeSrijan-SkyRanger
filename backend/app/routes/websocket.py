# app/routes/websocket.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.mavlink_handler import get_telemetry
from config import TELEMETRY_RATE
import asyncio
import json

router = APIRouter()

@router.websocket("/ws/telemetry")
async def telemetry_stream(websocket: WebSocket):
    await websocket.accept()
    print("[WS] GCS client connected")

    try:
        while True:
            telemetry = get_telemetry()
            await websocket.send_text(json.dumps(telemetry))
            await asyncio.sleep(TELEMETRY_RATE)

    except WebSocketDisconnect:
        print("[WS] GCS client disconnected")

    except Exception as e:
        print(f"[WS] Unexpected error: {e}")
        await websocket.close()