# app/core/mqtt_client.py
import json
import threading
import paho.mqtt.client as mqtt
from app.services import mqtt_service

BROKER = "localhost"     # change if broker is remote
PORT = 1883
TOPIC = "skyranger/sensor/all"

client = mqtt.Client(
    client_id="backend_subscriber",
    callback_api_version=mqtt.CallbackAPIVersion.VERSION1
)



def on_connect(client, userdata, flags, rc):
    print(f"[MQTT] Connected with result code {rc}")
    client.subscribe(TOPIC)
    print(f"[MQTT] Subscribed to topic: {TOPIC}")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        print(f"[MQTT] Message received: {payload}")
        mqtt_service.update_sensor_data(payload)
    except Exception as e:
        print(f"[MQTT] Error parsing message: {e}")

def start_mqtt():
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(BROKER, PORT, 60)
    thread = threading.Thread(target=client.loop_forever, daemon=True)
    thread.start()
    print("[MQTT] Client started in background thread")
