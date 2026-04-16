from fastapi import FastAPI
<<<<<<< HEAD
from fastapi.middleware.cors import CORSMiddleware
from app.services.mqtt_service import start_mqtt_client # Import MQTT background service
from app.routes import telemetry #import more routers (telemetry, ai, sensors, etc.)

app = FastAPI(title="SkyRanger Backend", version="1.0")

# --- CORS setup  ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # replace with your frontend URL later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Startup event: launch background MQTT listener ---
@app.on_event("startup")
def startup_event():
    print("[INIT] Starting MQTT client...")
    start_mqtt_client()
    print("[INIT] MQTT service running")

app.include_router(telemetry.router)


@app.get("/")
def root():
    return {"status": "ok", "message": "SkyRanger backend running"}

# --- Uncomment when telemetry route is ready ---
# app.include_router(telemetry.router)

# --- Run only if executed directly (not when imported) ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
=======
from app.core.mqtt_client import start_mqtt
from app.services import mqtt_service

app = FastAPI(title="SkyRanger Backend (MQTT Enabled)")

# Start MQTT on launch
start_mqtt()

@app.get("/")
def root():
    return {"message": "Backend running with MQTT 🚀"}

@app.get("/api/sensor/latest")
def get_latest_sensor():
    """Return latest data stored by MQTT service"""
    return mqtt_service.get_latest_sensor_data()
>>>>>>> Rpi
