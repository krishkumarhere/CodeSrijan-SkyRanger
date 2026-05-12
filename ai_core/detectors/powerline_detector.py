from ultralytics import YOLO
import torch


class PowerlineDetector:

    def __init__(
        self,
        model_path="ai_core/models/weights/powerrail_yolov8s.pt",
        conf_threshold=0.25
    ):

        print("[AI] Loading Powerline Inspection Model...")

        self.device = (
            "cuda"
            if torch.cuda.is_available()
            else "cpu"
        )

        print(
            f"[AI] Using device: {self.device}"
        )

        self.model = YOLO(model_path)

        self.model.to(self.device)

        self.conf_threshold = conf_threshold

        print(
            "[AI] Powerline model loaded"
        )

    def detect(
        self,
        frame
    ):

        results = self.model(
            frame,
            conf=self.conf_threshold,
            verbose=False
        )

        detections = []

        for result in results:

            if result.boxes is None:
                continue

            for box in result.boxes:

                confidence = float(
                    box.conf[0]
                )

                cls_id = int(
                    box.cls[0]
                )

                label = result.names[cls_id]

                x1, y1, x2, y2 = map(
                    int,
                    box.xyxy[0]
                )

                detections.append({

                    "label": label,

                    "confidence": round(
                        confidence,
                        2
                    ),

                    "bbox": [
                        x1,
                        y1,
                        x2,
                        y2
                    ]
                })

        return detections