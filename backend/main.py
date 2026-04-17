from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.websocket import router as ws_router
from app.routes.sensors_ws import router as sensor_router
from app.routes.history import router as history_router
from app.core.mavlink_handler import connect
from app.core.sensor_handler import start_sensor_loop
from app.core.database import init_db
from app.routes.system_ws import router as system_router
from app.core.system_handler import start_system_loop
from app.routes.mission import router as mission_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[INIT] SkyRanger GCS Backend starting...")
    init_db()
    try:
        connect()
        print("[INIT] MAVLink connection established")
    except Exception as e:
        print(f"[WARN] MAVLink not available: {e}")
    try:
        start_sensor_loop()
    except Exception as e:
        print(f"[WARN] Sensor loop failed: {e}")
    try:
        start_system_loop()
        print("[INIT] System monitoring started")
    except Exception as e:
        print(f"[WARN] System loop failed: {e}")
    yield
    print("[SHUTDOWN] Server stopping...")

app = FastAPI(title="SkyRanger GCS", version="2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ws_router)
app.include_router(sensor_router)
app.include_router(history_router)
app.include_router(system_router)
app.include_router(mission_router)

@app.get("/health")
def health():
    return {"status": "online", "service": "SkyRanger GCS"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)