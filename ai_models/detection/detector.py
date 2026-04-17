# ai_models/detection/detector.py
import cv2
import time
import platform
import numpy as np
from ultralytics import YOLO

ACTIONS = ["forward", "left", "right", "hover"]

ANIMAL_CLASSES = {14, 15, 16, 17, 18, 19, 20, 21, 22, 23}
VEHICLE_CLASSES = {2, 3, 5, 7}  # car, motorcycle, bus, truck

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

    def decide(self, priority_type: str or None, zone: str or None) -> str:
        if priority_type == "person":
            # Turn towards person
            if zone == "left":
                return ACTIONS[1]  # left
            elif zone == "right":
                return ACTIONS[2]  # right
            else:  # center
                return ACTIONS[3]  # hover
        elif priority_type in ["vehicle", "animal"]:
            # Turn away from obstacle
            if zone == "left":
                return ACTIONS[2]  # right
            elif zone == "right":
                return ACTIONS[1]  # left
            else:  # center
                return ACTIONS[1]  # left (arbitrary)
        else:
            # follow search pattern
            action = ACTIONS[self._pattern[self._step % len(self._pattern)]]
            self._step += 1
            return action

    def reset(self):
        self._step = 0


def _simulate_mavlink_command(action: str) -> str:
    """Simulate MAVLink command based on action."""
    if action == "forward":
        return "MAV_CMD_DO_CHANGE_SPEED (vel: 1.0)"
    elif action == "left":
        return "MAV_CMD_CONDITION_YAW (yaw: -90)"
    elif action == "right":
        return "MAV_CMD_CONDITION_YAW (yaw: 90)"
    elif action == "hover":
        return "MAV_CMD_DO_SET_MODE (mode: LOITER)"
    else:
        return "MAV_CMD_DO_SET_MODE (mode: GUIDED)"


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
        self.mission_state = "IDLE"
        self.no_detection_counter = 0
        self.stability_counter = 0
        self.last_zone = None

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
        self.mission_state = "IDLE"
        self.no_detection_counter = 0
        self.stability_counter = 0
        self.last_zone = None
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

        start_time = time.time()

        results = self._model(frame, conf=self.conf, verbose=False)

        inference_time = time.time() - start_time

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
        vehicle_detected = any(int(c) in VEHICLE_CLASSES for c in detected_classes)
        animal_detected = any(int(c) in ANIMAL_CLASSES for c in detected_classes)

        # Determine highest priority detection
        highest_priority = None
        highest_bbox = None
        highest_conf = 0.0
        failure_reason = None
        if person_detected:
            for det in detections:
                if det["class_id"] == 0 and det["confidence"] > highest_conf:
                    highest_conf = det["confidence"]
                    highest_bbox = det["bbox"]
            if highest_conf >= 0.7:
                highest_priority = "person"
            else:
                failure_reason = "Low Confidence Person"
        elif vehicle_detected:
            for det in detections:
                if det["class_id"] in VEHICLE_CLASSES and det["confidence"] > highest_conf:
                    highest_conf = det["confidence"]
                    highest_bbox = det["bbox"]
            if highest_conf >= 0.7:
                highest_priority = "vehicle"
            else:
                failure_reason = "Low Confidence Vehicle"
        elif animal_detected:
            for det in detections:
                if det["class_id"] in ANIMAL_CLASSES and det["confidence"] > highest_conf:
                    highest_conf = det["confidence"]
                    highest_bbox = det["bbox"]
            if highest_conf >= 0.7:
                highest_priority = "animal"
            else:
                failure_reason = "Low Confidence Animal"

        # Determine zone if detection present
        zone = None
        if highest_bbox:
            center_x = (highest_bbox[0] + highest_bbox[2]) / 2
            frame_width = frame.shape[1]
            if center_x < frame_width / 3:
                zone = "left"
            elif center_x > 2 * frame_width / 3:
                zone = "right"
            else:
                zone = "center"

        # Update stability
        if zone == self.last_zone and highest_priority:
            self.stability_counter += 1
        else:
            self.stability_counter = 0
        self.last_zone = zone

        action = self._navigator.decide(highest_priority, zone)

        # Simulate MAVLink command
        mavlink_cmd = self._simulate_mavlink_command(action)

        # Update counters
        if highest_priority:
            self.no_detection_counter = 0
        else:
            self.no_detection_counter += 1
            if self.no_detection_counter > 10:
                failure_reason = "No Detection - Search Mode"

        # Update mission state
        if not self.active:
            self.mission_state = "IDLE"
        elif highest_priority:
            if self.mission_state == "SCANNING":
                self.mission_state = "DETECT"
            else:
                self.mission_state = "TRACK"
        else:
            self.mission_state = "SCANNING"

        # Overlay text on frame
        if highest_priority == "person":
            cv2.putText(annotated, "SURVIVOR DETECTED", (20, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)
            # Beep throttled to once per second
            if time.time() - self._last_beep > 1.0:
                _beep()
                self._last_beep = time.time()
        elif highest_priority == "vehicle":
            cv2.putText(annotated, "VEHICLE DETECTED", (20, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)
        elif highest_priority == "animal":
            cv2.putText(annotated, "ANIMAL DETECTED", (20, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 100, 0), 3)

        mode = "TARGET" if highest_priority else "SEARCH"
        cv2.putText(annotated, f"Action: {action}", (20, 100),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        cv2.putText(annotated, f"MODE: {mode}", (20, 140),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)
        if zone:
            cv2.putText(annotated, f"Zone: {zone.upper()}", (20, 180),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 255), 2)
        cv2.putText(annotated, f"STATE: {self.mission_state}", (20, 220),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        cv2.putText(annotated, f"MAV_CMD: {mavlink_cmd}", (20, 260),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        if failure_reason:
            cv2.putText(annotated, f"ALERT: {failure_reason}", (20, 300),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        total_time = time.time() - start_time
        cv2.putText(annotated, f"Inference: {inference_time*1000:.1f}ms | Total: {total_time*1000:.1f}ms", (20, 340),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 2)
        if self.stability_counter > 1:
            cv2.putText(annotated, "STABLE DETECTION", (20, 380),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        return {
            "annotated_frame": annotated,
            "person_detected": person_detected,
            "vehicle_detected": vehicle_detected,
            "animal_detected": animal_detected,
            "action": action,
            "mode": mode,
            "zone": zone,
            "mission_state": self.mission_state,
            "mavlink_cmd": mavlink_cmd,
            "failure_reason": failure_reason,
            "inference_time_ms": round(inference_time * 1000, 1),
            "total_time_ms": round(total_time * 1000, 1),
            "stability_counter": self.stability_counter,
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