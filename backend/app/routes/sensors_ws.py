# app/routes/sensors_ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.sensor_handler import get_sensor_data
import asyncio
import json

router = APIRouter()

@router.websocket("/ws/sensors")
async def sensor_stream(websocket: WebSocket):
    await websocket.accept()
    print("[WS] Sensor client connected")
    try:
        while True:
            data = get_sensor_data()
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(2)  # match DHT11 read rate
    except WebSocketDisconnect:
        print("[WS] Sensor client disconnected")
    except Exception as e:
        print(f"[WS] Sensor error: {e}")
        await websocket.close()