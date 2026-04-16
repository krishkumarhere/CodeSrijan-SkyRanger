<<<<<<< HEAD
import json
import threading
import paho.mqtt.client as mqtt

BROKER_IP = "localhost"  # or your Pi's IP if backend runs elsewhere
PORT = 1883
TOPIC = "skyranger/telemetry"

latest_data = {}

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("[MQTT] Connected to broker.")
        client.subscribe(TOPIC)
        print(f"[MQTT] Subscribed to topic: {TOPIC}")
    else:
        print(f"[MQTT] Connection failed with code {rc}")

def on_message(client, userdata, msg):
    global latest_data
    try:
        payload = msg.payload.decode()          
        data = json.loads(payload)
        latest_data = data
        print(f"[MQTT] Received telemetry: {data}")
    except Exception as e:
        print(f"[MQTT] Message handling error: {e}")

def get_latest_data():
    """Return the most recent telemetry."""
    return latest_data if latest_data else {"status": "no data yet"}

def start_mqtt_client():
    """Run MQTT listener in a background thread."""
    client = mqtt.Client(client_id="FastAPI_Backend")
    client.on_connect = on_connect
    client.on_message = on_message

    client.connect(BROKER_IP, PORT, 60)

    thread = threading.Thread(target=client.loop_forever)
    thread.daemon = True
    thread.start()

    print("[MQTT] Client started in background thread.")
=======
# app/services/mqtt_service.py
from datetime import datetime

latest_data = {
    "temperature": None,
    "humidity": None,
    "motion": None,
    "vibration": None,
    "timestamp": None
}

def update_sensor_data(payload: dict):
    """Called whenever MQTT message arrives"""
    try:
        dht = payload.get("dht11", {})
        pir = payload.get("pir", {})
        vib = payload.get("vibration", {})

        latest_data["temperature"] = dht.get("temperature")
        latest_data["humidity"] = dht.get("humidity")
        latest_data["motion"] = pir.get("motion")
        latest_data["vibration"] = vib.get("vibration")
        latest_data["timestamp"] = datetime.now().isoformat()

        print("[MQTT_SERVICE] Updated:", latest_data)

    except Exception as e:
        print(f"[MQTT_SERVICE] Failed to update data: {e}")


def get_latest_sensor_data():
    return latest_data
>>>>>>> Rpi
