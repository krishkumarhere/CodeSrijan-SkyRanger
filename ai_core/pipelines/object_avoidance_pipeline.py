# ai_core/pipelines/object_avoidance_pipeline.py

import cv2
import time
import logging
import json 
from collections import deque
from enum import Enum, auto

from ai_core.integrations.camera_client import CameraClient
from ai_core.detectors.yolov8_detector import YOLOv8Detector

# ─────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)

log = logging.getLogger("Avoidance")

# ─────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────
CFG = {

    "conf_threshold": 0.35,

    # bbox area % thresholds
    "zone_warn":   0.05,
    "zone_alert":  0.10,
    "zone_danger": 0.18,

    # center region width
    "center_band": 0.25,

    # ignore extreme edges
    "edge_ignore": 0.10,

    # consecutive frame confirmation
    "confirm_frames": 3,

    "dangerous_classes": {
        "person",
        "car",
        "truck",
        "bus",
        "motorcycle",
        "bicycle",
        "chair"
    }
}

# ─────────────────────────────────────────────
# State
# ─────────────────────────────────────────────
class RiskState(Enum):

    CLEAR  = auto()
    WARN   = auto()
    ALERT  = auto()
    DANGER = auto()

# ─────────────────────────────────────────────
# Pipeline
# ─────────────────────────────────────────────
class ObjectAvoidancePipeline:

    def __init__(self):

        log.info("Initializing camera...")
        self.camera = CameraClient()

        log.info("Loading detector...")
        self.detector = YOLOv8Detector()

        self.state = RiskState.CLEAR

        self.zone_buffer = deque(
            maxlen=CFG["confirm_frames"]
        )

        self.fps = 0

        self.last_alert_time = 0

    # ─────────────────────────────────────────
    # Main Loop
    # ─────────────────────────────────────────
    def run(self):
        log.info("Object avoidance pipeline started (Headless Mode)")
        prev_time = time.time()
        
        # Robust path to project root
        import os
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        JSON_PATH = os.path.join(BASE_DIR, "ai_state.json")

        while True:
            try:
                frame = self.camera.get_frame()
                if frame is None:
                    time.sleep(0.01)
                    continue

                h, w = frame.shape[:2]
                detections = self.detector.detect(frame)
                filtered, zone = self.process_detections(detections, w, h)

                self.zone_buffer.append(zone)
                confirmed_zone = self.confirm_zone()
                self.update_state(confirmed_zone)

                # FPS Calculation
                now = time.time()
                self.fps = 1 / max(now - prev_time, 1e-6)
                prev_time = now

                # Prepare Data for Frontend
                ai_data = {
                    "state": self.state.name,
                    "fps": round(self.fps, 1),
                    "detections": [
                        {
                            "label": d["label"],
                            "conf": d["conf"],
                            "zone": d["zone"],
                            "bbox": d["bbox"] # [x1, y1, x2, y2]
                        } for d in filtered
                    ],
                    "resolution": [w, h],
                    "timestamp": now
                }

                # Atomic write to avoid partial reads
                temp_path = JSON_PATH + ".tmp"
                with open(temp_path, "w") as f:
                    json.dump(ai_data, f)
                import os
                os.replace(temp_path, JSON_PATH)

                # Small sleep to yield CPU if necessary
                time.sleep(0.01)

            except Exception as e:
                log.error(f"Pipeline error: {e}")
                time.sleep(1)

    def stop(self):
        self.camera.release()

    # ─────────────────────────────────────────
    # Detection Processing
    # ─────────────────────────────────────────
    def process_detections(self, detections, w, h):

        center_x = w / 2

        edge_left = w * CFG["edge_ignore"]
        edge_right = w * (1 - CFG["edge_ignore"])

        worst_zone = "CLEAR"

        zone_priority = {
            "CLEAR": 0,
            "WARN": 1,
            "ALERT": 2,
            "DANGER": 3
        }

        filtered = []

        for det in detections:

            label = det["label"]
            conf = det["confidence"]

            if label not in CFG["dangerous_classes"]:
                continue

            if conf < CFG["conf_threshold"]:
                continue

            x1, y1, x2, y2 = det["bbox"]

            # Ignore edge detections
            if x2 < edge_left or x1 > edge_right:
                continue

            box_center = (x1 + x2) / 2

            box_area = (x2 - x1) * (y2 - y1)

            frame_area = w * h

            area_ratio = box_area / frame_area

            in_center = abs(
                box_center - center_x
            ) < (w * CFG["center_band"])

            # Risk zones
            if in_center and area_ratio >= CFG["zone_danger"]:
                zone = "DANGER"

            elif in_center and area_ratio >= CFG["zone_alert"]:
                zone = "ALERT"

            elif in_center and area_ratio >= CFG["zone_warn"]:
                zone = "WARN"

            else:
                zone = "CLEAR"

            # Worst zone tracking
            if (
                zone_priority[zone]
                >
                zone_priority[worst_zone]
            ):
                worst_zone = zone

            filtered.append({

                "label": label,
                "conf": round(conf, 2),
                "bbox": (x1, y1, x2, y2),
                "zone": zone,
                "area_ratio": round(area_ratio * 100, 1)
            })

        return filtered, worst_zone

    # ─────────────────────────────────────────
    # Confirmation Buffer
    # ─────────────────────────────────────────
    def confirm_zone(self):

        if not self.zone_buffer:
            return "CLEAR"

        counts = {
            z: self.zone_buffer.count(z)
            for z in [
                "CLEAR",
                "WARN",
                "ALERT",
                "DANGER"
            ]
        }

        if counts["DANGER"] >= CFG["confirm_frames"]:
            return "DANGER"

        if counts["ALERT"] >= CFG["confirm_frames"]:
            return "ALERT"

        if counts["WARN"] >= CFG["confirm_frames"]:
            return "WARN"

        return "CLEAR"

    # ─────────────────────────────────────────
    # State Updates
    # ─────────────────────────────────────────
    def update_state(self, zone):

        zone_map = {

            "CLEAR": RiskState.CLEAR,
            "WARN": RiskState.WARN,
            "ALERT": RiskState.ALERT,
            "DANGER": RiskState.DANGER
        }

        new_state = zone_map[zone]

        if new_state != self.state:

            log.info(
                "[STATE] %s → %s",
                self.state.name,
                new_state.name
            )

            self.state = new_state

            current_time = time.time()

            if (
                self.state != RiskState.CLEAR
                and
                current_time - self.last_alert_time > 2
            ):

                print(
                    f"\n⚠ {self.state.name} obstacle detected\n"
                )

                self.last_alert_time = current_time

    # ─────────────────────────────────────────
    # Overlay Drawing
    # ─────────────────────────────────────────
    def draw_overlay(
        self,
        frame,
        detections,
        w,
        h
    ):

        center_x = w // 2

        # center guide
        cv2.line(
            frame,
            (center_x, 0),
            (center_x, h),
            (255, 0, 0),
            2
        )

        colors = {

            "CLEAR":  (0, 255, 0),
            "WARN":   (0, 255, 255),
            "ALERT":  (0, 165, 255),
            "DANGER": (0, 0, 255)
        }

        for det in detections:

            x1, y1, x2, y2 = det["bbox"]

            zone = det["zone"]

            color = colors[zone]

            cv2.rectangle(
                frame,
                (x1, y1),
                (x2, y2),
                color,
                2
            )

            label = (
                f"{det['label']} "
                f"{det['conf']:.2f} "
                f"[{zone}]"
            )

            cv2.putText(
                frame,
                label,
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                color,
                2
            )

        # Global state banner
        cv2.putText(
            frame,
            f"STATE: {self.state.name}",
            (20, 80),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            colors[self.state.name],
            3
        )