import threading
import time

import cv2
import numpy as np

try:
    import board
    import busio
    import adafruit_mlx90640
except ImportError:
    board = None
    busio = None
    adafruit_mlx90640 = None


class ThermalCamera:
    def __init__(self):
        self.sensor = None
        self.streaming = False
        self._lock = threading.Lock()
        self._frame = [0] * 768
        self.error = None
        self.refresh_rate = "4Hz"

    def start(self):
        with self._lock:
            self.stop()
            if adafruit_mlx90640 is None or board is None or busio is None:
                self.error = "Missing MLX90640 dependencies"
                self.streaming = False
                return

            try:
                i2c = busio.I2C(board.SCL, board.SDA)
                self.sensor = adafruit_mlx90640.MLX90640(i2c)
                self.sensor.refresh_rate = adafruit_mlx90640.RefreshRate.REFRESH_4_HZ
                self.streaming = True
                self.error = None
                self.refresh_rate = "4Hz"
                time.sleep(0.2)
            except Exception as e:
                self.error = str(e)
                self.streaming = False
                self.sensor = None

    def stop(self):
        with self._lock:
            self.streaming = False
            self.sensor = None

    def get_frame(self):
        if not self.streaming or self.sensor is None:
            return None

        try:
            self.sensor.getFrame(self._frame)
            temp = np.array(self._frame, dtype=np.float32).reshape((24, 32))
            normalized = cv2.normalize(temp, None, 0, 255, cv2.NORM_MINMAX)
            normalized = np.uint8(normalized)
            resized = cv2.resize(normalized, (640, 480), interpolation=cv2.INTER_CUBIC)
            heatmap = cv2.applyColorMap(resized, cv2.COLORMAP_JET)
            _, buffer = cv2.imencode('.jpg', heatmap)
            return buffer.tobytes()
        except RuntimeError:
            return None
        except Exception as e:
            print(f"[THERMAL] Frame error: {e}")
            return None

    @property
    def status(self):
        return {
            "streaming": self.streaming,
            "sensor": "MLX90640",
            "refresh_rate": self.refresh_rate,
            "error": self.error,
        }
