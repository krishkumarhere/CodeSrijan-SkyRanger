# ai_core/pipelines/infrastructure_pipeline.py

import os
import cv2
import json
import time
import requests
from datetime import datetime

from ai_core.integrations.camera_client import CameraClient
from ai_core.detectors.powerline_detector import PowerlineDetector


class PowerlinePipeline:

    def __init__(self):

        print("[INFO] Initializing camera...")

        self.camera = CameraClient()

        print("[INFO] Loading powerline detector...")

        self.detector = PowerlineDetector()

        self.snapshot_dir = (
            "ai_core/data/snapshots/powerline"
        )

        os.makedirs(
            self.snapshot_dir,
            exist_ok=True
        )

        self.ai_state_file = "ai_state.json"

        # Detection state tracking
        self.previous_detection_state = False

        # Prevent continuous burst spam
        self.capture_lock = False

        print("[INFO] Powerline pipeline initialized")

    def save_snapshot(
        self,
        frame
    ):

        timestamp = int(time.time() * 1000)

        filename = (
            f"powerline_{timestamp}.jpg"
        )

        filepath = os.path.join(
            self.snapshot_dir,
            filename
        )

        cv2.imwrite(
            filepath,
            frame
        )

        print(
            f"[SNAPSHOT] Saved: {filename}"
        )

    def capture_burst(
        self,
        frame
    ):

        print(
            "[EVENT] Capturing evidence burst..."
        )

        for i in range(3):

            self.save_snapshot(frame)

            time.sleep(0.5)

        print(
            "[EVENT] Snapshot burst complete"
        )

    def save_ai_state(
        self,
        detections,
        fps,
        snapshot_event=False
    ):

        state = {
            "pipeline": "infrastructure",
            "timestamp": datetime.now().isoformat(),
            "fps": round(fps, 2),
            "detections": detections,
            "snapshot_event": snapshot_event,
            "state": (
                "DETECTION"
                if len(detections) > 0
                else "CLEAR"
            )
        }

        with open(
            self.ai_state_file,
            "w"
        ) as f:

            json.dump(
                state,
                f,
                indent=2
            )

    def infrastructure_enabled(self):

        try:

            response = requests.get(
                "https://demo.skyrangerai.xyz/api/ai/state",
                timeout=5
            )

            data = response.json()

            return data.get(
                "infrastructure_mode",
                False
            )

        except Exception as e:

            print(
                f"[AI STATE ERROR] {e}"
            )

            return False

    def run(self):

        print(
            "[INFO] Powerline pipeline started"
        )

        prev_time = time.time()

        while True:

            # -----------------------------------------
            # CHECK IF AI MODE ENABLED
            # -----------------------------------------

            enabled = self.infrastructure_enabled()

            if not enabled:

                time.sleep(1)

                continue

            # -----------------------------------------
            # GET CAMERA FRAME
            # -----------------------------------------

            frame = self.camera.get_frame()

            if frame is None:

                print(
                    "[WARN] Failed to get frame"
                )

                time.sleep(1)

                continue

            # -----------------------------------------
            # RUN DETECTION
            # -----------------------------------------

            detections = self.detector.detect(
                frame
            )

            # -----------------------------------------
            # FPS CALCULATION
            # -----------------------------------------

            current_time = time.time()

            fps = 1 / (
                current_time - prev_time
            )

            prev_time = current_time

            # -----------------------------------------
            # DRAW DETECTIONS
            # -----------------------------------------

            for detection in detections:

                x1, y1, x2, y2 = (
                    detection["bbox"]
                )

                label = (
                    detection["label"]
                )

                confidence = (
                    detection["confidence"]
                )

                cv2.rectangle(
                    frame,
                    (x1, y1),
                    (x2, y2),
                    (0, 0, 255),
                    2
                )

                cv2.putText(
                    frame,
                    f"{label} {confidence}",
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 0, 255),
                    2
                )

            # -----------------------------------------
            # SMART BURST SNAPSHOT SYSTEM
            # -----------------------------------------

            snapshot_event = False

            current_detection_state = (
                len(detections) > 0
            )

            # Detection appeared first time
            if (
                current_detection_state
                and not self.capture_lock
            ):

                self.capture_burst(frame)

                self.capture_lock = True

                snapshot_event = True

            # Scene clear -> rearm system
            if not current_detection_state:

                self.capture_lock = False

            self.previous_detection_state = (
                current_detection_state
            )

            # -----------------------------------------
            # SAVE AI STATE
            # -----------------------------------------

            self.save_ai_state(
                detections,
                fps,
                snapshot_event
            )

            time.sleep(0.05)

        self.camera.release()