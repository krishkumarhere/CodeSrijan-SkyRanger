# camera.py
import cv2
import threading
import time
try:
    from picamera2 import Picamera2
    HAS_PICAM = True
except ImportError:
    HAS_PICAM = False
    print("[WARN] picamera2 not found. Pi Cam 3 will be unavailable.")

RESOLUTIONS = {
    "640x480":   (640, 480),
    "1280x720":  (1280, 720),
    "1920x1080": (1920, 1080),
    "320x240":   (320, 240),
}

class USBCamera:
    """Handler for Logitech C270 USB Camera - Optimized for 25+ FPS"""
    def __init__(self):
        self.cam = None
        self.streaming = False
        self.resolution = "640x480"
        self._lock = threading.Lock()
        self.last_jpeg = None # Stores pre-encoded JPEG bytes
        self._stop_event = threading.Event()
        self._thread = None

    def start(self, resolution="640x480"):
        with self._lock:
            if self.streaming: return
            self._stop_event.clear()
            self.resolution = resolution
            w, h = RESOLUTIONS.get(resolution, (640, 480))
            try:
                # Use V4L2 backend for Linux performance
                self.cam = cv2.VideoCapture("/dev/video8", cv2.CAP_V4L2)
                
                # Set hardware MJPEG mode BEFORE resolution for best compatibility
                self.cam.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
                self.cam.set(cv2.CAP_PROP_FRAME_WIDTH, w)
                self.cam.set(cv2.CAP_PROP_FRAME_HEIGHT, h)
                self.cam.set(cv2.CAP_PROP_BUFFERSIZE, 1) # Zero-latency buffer
                
                if not self.cam.isOpened():
                    raise Exception("USB Camera not detected")
                
                self._thread = threading.Thread(target=self._capture_loop, daemon=True)
                self._thread.start()
                self.streaming = True
                print(f"[USB_CAM] Optimized C270 Started: {resolution} @ 30FPS Target")
            except Exception as e:
                print(f"[USB_CAM] Failed: {e}")
                self.streaming = False

    def _capture_loop(self):
        """Background thread: Captures AND Encodes immediately"""
        while not self._stop_event.is_set():
            if self.cam:
                ret, frame = self.cam.read()
                if ret:
                    # Performance: Encode JPEG once in background thread
                    # Quality 60 is the perfect balance for FPV streaming
                    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
                    self.last_jpeg = buffer.tobytes()
                else:
                    time.sleep(0.001) # Short wait if frame drop
            else: break

    def stop(self):
        with self._lock:
            self._stop_event.set()
            if self._thread: self._thread.join(timeout=1.0)
            if self.cam: self.cam.release()
            self.cam = None
            self.streaming = False
            self.last_jpeg = None

    def get_frame(self):
        """Returns pre-encoded bytes - zero CPU cost for caller"""
        return self.last_jpeg

class PiCamera:
    """Handler for Pi Camera 3 (CSI)"""
    def __init__(self):
        self.cam = None
        self.streaming = False
        self.resolution = "640x480"
        self._lock = threading.Lock()
        self.last_frame = None
        self._stop_event = threading.Event()
        self._thread = None

    def start(self, resolution="640x480"):
        if not HAS_PICAM: return
        with self._lock:
            if self.streaming: return
            self._stop_event.clear()
            self.resolution = resolution
            w, h = RESOLUTIONS.get(resolution, (640, 480))
            try:
                self.cam = Picamera2()
                config = self.cam.create_video_configuration(main={"size": (w, h)})
                self.cam.configure(config)
                self.cam.start()
                
                self._thread = threading.Thread(target=self._capture_loop, daemon=True)
                self._thread.start()
                self.streaming = True
                print(f"[PI_CAM] Pi Cam 3 Started at {resolution}")
            except Exception as e:
                print(f"[PI_CAM] Failed: {e}")
                self.streaming = False

    def _capture_loop(self):
        while not self._stop_event.is_set():
            if self.cam:
                try:
                    self.last_frame = self.cam.capture_array()
                except: time.sleep(0.01)
            else: break

    def stop(self):
        with self._lock:
            self._stop_event.set()
            if self._thread: self._thread.join(timeout=1.0)
            if self.cam:
                self.cam.stop()
                self.cam.close()
            self.cam = None
            self.streaming = False
            self.last_frame = None

    def get_frame(self):
        if self.last_frame is None: return None
        try:
            # Picamera2 returns RGB/YUV, cv2 expects BGR for imencode
            frame_bgr = cv2.cvtColor(self.last_frame, cv2.COLOR_RGB2BGR)
            _, buffer = cv2.imencode('.jpg', frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, 40])
            return buffer.tobytes()
        except: return None

# Global instances
usb_camera = USBCamera()
pi_camera = PiCamera()
