# app/routes/system_ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.system_handler import get_system_data
import asyncio
import json

router = APIRouter()

@router.websocket("/ws/system")
async def system_stream(websocket: WebSocket):
    await websocket.accept()
    print("[WS] System client connected")
    try:
        while True:
            data = get_system_data()
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        print("[WS] System client disconnected")
    except Exception as e:
        print(f"[WS] System error: {e}")
        await websocket.close()

@router.get("/system/status")
def system_status():
    return get_system_data()