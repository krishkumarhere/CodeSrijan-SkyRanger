# ai_core/integrations/camera_client.py

import cv2
import numpy as np
import requests


FRAME_URL = "https://demo.skyrangerai.xyz/camera/frame"


class CameraClient:

    def __init__(self):

        print("[CAMERA] Connecting to frame endpoint...")

    def get_frame(self):

        try:

            response = requests.get(
                FRAME_URL,
                timeout=5
            )

            if response.status_code != 200:
                return None

            img_array = np.frombuffer(
                response.content,
                dtype=np.uint8
            )

            frame = cv2.imdecode(
                img_array,
                cv2.IMREAD_COLOR
            )

            return frame

        except Exception as e:

            print(f"[CAMERA] Error: {e}")

            return None

    def release(self):
        pass