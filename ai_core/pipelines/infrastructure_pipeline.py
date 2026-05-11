# ai_core/pipelines/infrastructure_pipeline.py

import os
import cv2
import json
import time
import logging

from ai_core.integrations.camera_client import CameraClient
from ai_core.detectors.infrastructure_detector import InfrastructureDetector


# ─────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)

log = logging.getLogger("Infrastructure")


# ─────────────────────────────────────────────
# Pipeline
# ─────────────────────────────────────────────

class InfrastructurePipeline:

    def __init__(self):

        log.info("Initializing camera...")
        self.camera = CameraClient()

        log.info("Loading infrastructure detector...")
        self.detector = InfrastructureDetector()

        self.fps = 0

        self.last_snapshot_time = 0

        self.snapshot_cooldown = 3

        # Project root
        self.BASE_DIR = os.path.dirname(
            os.path.dirname(
                os.path.dirname(
                    os.path.abspath(__file__)
                )
            )
        )

        # JSON output path
        self.JSON_PATH = os.path.join(
            self.BASE_DIR,
            "ai_state.json"
        )

        # Snapshot directory
        self.SNAPSHOT_DIR = os.path.join(
            self.BASE_DIR,
            "ai_core",
            "data",
            "snapshots",
            "infrastructure"
        )

        os.makedirs(
            self.SNAPSHOT_DIR,
            exist_ok=True
        )

        log.info("Infrastructure pipeline initialized")

    # ─────────────────────────────────────────
    # Main Loop
    # ─────────────────────────────────────────

    def run(self):

        log.info("Infrastructure pipeline started")

        prev_time = time.time()

        while True:

            try:

                frame = self.camera.get_frame()

                if frame is None:
                    time.sleep(0.01)
                    continue

                h, w = frame.shape[:2]

                # Run inference
                detections = self.detector.detect(frame)

                # Draw overlays
                self.draw_overlay(
                    frame,
                    detections
                )

                # FPS
                now = time.time()

                self.fps = 1 / max(
                    now - prev_time,
                    1e-6
                )

                prev_time = now

                # Snapshot capture
                snapshot_path = None

                if (
                    len(detections) > 0
                    and
                    now - self.last_snapshot_time
                    > self.snapshot_cooldown
                ):

                    filename = (
                        f"infra_{int(now)}.jpg"
                    )

                    snapshot_path = os.path.join(
                        self.SNAPSHOT_DIR,
                        filename
                    )

                    cv2.imwrite(
                        snapshot_path,
                        frame
                    )

                    self.last_snapshot_time = now

                    log.info(
                        f"[SNAPSHOT] Saved: {filename}"
                    )

                # Prepare frontend data
                ai_data = {

                    "pipeline": "infrastructure",

                    "fps": round(
                        self.fps,
                        1
                    ),

                    "detections": [

                        {
                            "label": d["label"],
                            "confidence": d["confidence"],
                            "bbox": d["bbox"]
                        }

                        for d in detections
                    ],

                    "snapshot": (
                        snapshot_path
                        if snapshot_path
                        else None
                    ),

                    "resolution": [w, h],

                    "timestamp": now
                }

                # Atomic write
                temp_path = self.JSON_PATH + ".tmp"

                with open(
                    temp_path,
                    "w"
                ) as f:

                    json.dump(
                        ai_data,
                        f
                    )

                os.replace(
                    temp_path,
                    self.JSON_PATH
                )

                # Small sleep
                time.sleep(0.01)

            except Exception as e:

                log.error(
                    f"Pipeline error: {e}"
                )

                time.sleep(1)

    # ─────────────────────────────────────────
    # Stop
    # ─────────────────────────────────────────

    def stop(self):

        self.camera.release()

    # ─────────────────────────────────────────
    # Overlay Drawing
    # ─────────────────────────────────────────

    def draw_overlay(
        self,
        frame,
        detections
    ):

        for det in detections:

            x1, y1, x2, y2 = det["bbox"]

            label = det["label"]

            confidence = det["confidence"]

            color = (0, 0, 255)

            # Bounding box
            cv2.rectangle(
                frame,
                (x1, y1),
                (x2, y2),
                color,
                2
            )

            # Label
            text = (
                f"{label} "
                f"{confidence:.2f}"
            )

            cv2.putText(
                frame,
                text,
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                color,
                2
            )