# ai_models/detection/detector.py
import cv2
import time
import platform
import numpy as np
from ultralytics import YOLO

ACTIONS = ["forward", "left", "right", "hover"]

ANIMAL_CLASSES = {14, 15, 16, 17, 18, 19, 20, 21, 22, 23}

def _beep():
    """Cross-platform alert beep."""
    if platform.system() == "Windows":
        import winsound
        winsound.Beep(1000, 400)
    else:
        # Linux/Pi: use system bell or aplay
        import os
        os.system("echo -e '\a'")


class RLNavigator:
    """Simple pattern-based RL navigator."""

    def __init__(self):
        self._step = 0
        self._pattern = [0, 0, 1, 0, 2]  # forward, forward, left, forward, right

    def decide(self, person_detected: bool) -> str:
        if person_detected:
            return ACTIONS[3]  # hover when survivor found
        action = ACTIONS[self._pattern[self._step % len(self._pattern)]]
        self._step += 1
        return action

    def reset(self):
        self._step = 0


class HumanDetector:
    """
    YOLOv8n-based human/animal detector.
    Lazy-loads the model on first call to detect().
    """

    def __init__(self, model_path: str = "ai_models/detection/yolov8n.pt", conf: float = 0.4):
        self.model_path = model_path
        self.conf = conf
        self._model = None
        self._navigator = RLNavigator()
        self._last_beep = 0.0
        self.active = False

    def load(self):
        """Lazy load — call this when user clicks 'Start AI Detection'."""
        if self._model is None:
            print(f"[HumanDetector] Loading model from {self.model_path}...")
            self._model = YOLO(self.model_path)
            print("[HumanDetector] Model ready.")

    def unload(self):
        """Free model from memory when detection is stopped."""
        self._model = None
        self._navigator.reset()
        self.active = False
        print("[HumanDetector] Model unloaded.")

    def detect(self, frame: np.ndarray) -> dict:
        """
        Run inference on a single frame.

        Returns a dict with:
          - annotated_frame: np.ndarray with bounding boxes drawn
          - person_detected: bool
          - animal_detected: bool
          - action: str (RL decision)
          - mode: str ("TARGET" or "SEARCH")
          - detections: list of {class_id, class_name, confidence, bbox}
        """
        if self._model is None:
            raise RuntimeError("Model not loaded. Call load() first.")

        results = self._model(frame, conf=self.conf, verbose=False)
        annotated = results[0].plot()

        detected_classes = []
        detections = []

        if results[0].boxes is not None:
            boxes = results[0].boxes
            detected_classes = boxes.cls.tolist()

            for i, cls_id in enumerate(detected_classes):
                cls_id = int(cls_id)
                conf = float(boxes.conf[i])
                bbox = boxes.xyxy[i].tolist()
                detections.append({
                    "class_id": cls_id,
                    "class_name": results[0].names[cls_id],
                    "confidence": round(conf, 3),
                    "bbox": [round(x, 1) for x in bbox]
                })

        person_detected = any(int(c) == 0 for c in detected_classes)
        animal_detected = any(int(c) in ANIMAL_CLASSES for c in detected_classes)

        action = self._navigator.decide(person_detected)

        # Overlay text on frame
        if person_detected:
            cv2.putText(annotated, "SURVIVOR DETECTED", (20, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)
            # Beep throttled to once per second
            if time.time() - self._last_beep > 1.0:
                _beep()
                self._last_beep = time.time()
        elif animal_detected:
            cv2.putText(annotated, "ANIMAL DETECTED", (20, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 100, 0), 3)

        mode = "TARGET" if person_detected else "SEARCH"
        cv2.putText(annotated, f"Action: {action}", (20, 100),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        cv2.putText(annotated, f"MODE: {mode}", (20, 140),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)

        return {
            "annotated_frame": annotated,
            "person_detected": person_detected,
            "animal_detected": animal_detected,
            "action": action,
            "mode": mode,
            "detections": detections,
        }


if __name__ == "__main__":
    # Test with webcam or image
    import numpy as np

    detector = HumanDetector()
    detector.load()

    # Try webcam first
    cap = cv2.VideoCapture(0)
    if cap.isOpened():
        print("Testing with webcam... Press 'q' to quit")
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            result = detector.detect(frame)
            cv2.imshow("Detection", result["annotated_frame"])

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        cap.release()
        cv2.destroyAllWindows()
    else:
        print("No webcam found, testing with dummy frame...")
        # Create a dummy frame (640x480 RGB)
        dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(dummy_frame, "TEST FRAME", (200, 240), cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 255, 255), 3)

        result = detector.detect(dummy_frame)
        print("Detection test passed!")
        print(f"Person detected: {result['person_detected']}")
        print(f"Animal detected: {result['animal_detected']}")
        print(f"Action: {result['action']}")
        print(f"Mode: {result['mode']}")
        print(f"Detections: {len(result['detections'])}")

    detector.unload()