import cv2
import threading
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ai_core.detectors.infrastructure_detector import InfrastructureDetector

#PI_STREAM_URL = "http://10.39.201.80/stream/pi"
PI_STREAM_URL = 0

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = InfrastructureDetector()

latest_detections = []
latest_frame_time = 0


def inference_loop():

    global latest_detections
    global latest_frame_time

    print("[AI] Connecting to Pi Camera Stream...")

    cap = cv2.VideoCapture(
        PI_STREAM_URL,
        cv2.CAP_FFMPEG
    )

    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    print("[AI] Stream connected:", cap.isOpened())

    while True:

        try:

            ret, frame = cap.read()

            if not ret:
                print("[AI] Failed to read frame")
                time.sleep(1)
                continue

            detections = detector.detect(frame)

            latest_detections = detections

            latest_frame_time = time.time()

        except Exception as e:

            print("[AI ERROR]", e)

            time.sleep(1)


@app.get("/detections")
def get_detections():

    return {
        "timestamp": latest_frame_time,
        "detections": latest_detections
    }


if __name__ == "__main__":

    thread = threading.Thread(
        target=inference_loop,
        daemon=True
    )

    thread.start()

    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=9000
    )