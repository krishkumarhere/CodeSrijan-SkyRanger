from fastapi import APIRouter
import app.services.mqtt_service as mqtt_service

router = APIRouter()

@router.get("/latest")
def latest():
    return mqtt_service.get_latest_sensor_data()
