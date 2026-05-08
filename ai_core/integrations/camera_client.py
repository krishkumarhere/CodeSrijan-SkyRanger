# ai_core/integrations/camera_client.py

import cv2

STREAM_URL = "http://127.0.0.1:8080/stream"


class CameraClient:
    def __init__(self):

        print("[CAMERA] Connecting to stream...")

        self.cap = cv2.VideoCapture(
            STREAM_URL,
            cv2.CAP_FFMPEG
        )

        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        print("[CAMERA] Opened:", self.cap.isOpened())

    def get_frame(self):

        if not self.cap.isOpened():
            return None

        ret, frame = self.cap.read()

        if not ret:
            return None

        return frame

    def release(self):
        self.cap.release()