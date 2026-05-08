# camera.py
from picamera2 import Picamera2
import cv2
import threading
import time

RESOLUTIONS = {
    "640x480":   (640, 480),
    "1280x720":  (1280, 720),
    "1920x1080": (1920, 1080),
    "320x240":   (320, 240),
}

class DroneCamera:
    def __init__(self):
        self.cam        = None
        self.streaming  = False
        self.resolution = "320x240"
        self._lock      = threading.Lock()

    def start(self, resolution="320x240"):
        with self._lock:
            # Always fully stop before restarting
            self._stop_camera()
            time.sleep(0.5)  # give hardware time to release

            self.resolution = resolution
            w, h = RESOLUTIONS.get(resolution, (640, 480))
            try:
                self.cam = Picamera2()
                self.cam.configure(
                    self.cam.create_video_configuration(
                        main={"size": (w, h)}
                    )
                )
                self.cam.start()
                time.sleep(0.3)  # let camera warm up
                self.streaming = True
                print(f"[CAM] Started at {resolution}")
            except Exception as e:
                print(f"[CAM] Failed to start: {e}")
                self.streaming = False

    def _stop_camera(self):
        """Internal stop — call only within lock"""
        if self.cam:
            try:
                self.cam.stop()
                self.cam.close()
            except Exception as e:
                print(f"[CAM] Stop error: {e}")
            finally:
                self.cam = None
        self.streaming = False

    def stop(self):
        with self._lock:
            self._stop_camera()
            print("[CAM] Stopped")

    def get_frame(self):
        """Returns JPEG encoded bytes for streaming"""
        frame = self.get_raw_frame()
        if frame is None:
            return None
        try:
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 25])
            return buffer.tobytes()
        except Exception as e:
            print(f"[CAM] JPEG error: {e}")
            return None

    def get_raw_frame(self):
        """Returns raw numpy array for AI inference"""
        if not self.streaming or not self.cam:
            return None
        try:
            return self.cam.capture_array()
        except Exception as e:
            print(f"[CAM] Raw frame error: {e}")
            return None

    def change_resolution(self, resolution):
        if resolution not in RESOLUTIONS:
            return False
        self.start(resolution)  # start handles stop internally
        return True

    @property
    def status(self):
        return {
            "streaming":  self.streaming,
            "resolution": self.resolution,
            "available_resolutions": list(RESOLUTIONS.keys()),
        }

camera = DroneCamera()