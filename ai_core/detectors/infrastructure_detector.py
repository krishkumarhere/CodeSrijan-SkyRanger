from ultralytics import YOLO
import torch


class InfrastructureDetector:

    def __init__(
        self,
        model_path="ai_core/models/weights/infra_yolov8n.pt",
        conf_threshold=0.2
    ):

        print("[AI] Loading Infrastructure Inspection Model...")

        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        print(f"[AI] Using device: {self.device}")

        self.model = YOLO(model_path)

        self.model.to(self.device)

        self.conf_threshold = conf_threshold

        self.allowed_classes = [
            "crack",
            "water_leakage",
            "corrosion",
            "corrosion_mild",
            "corrosion_severe"
        ]

        print("[AI] Infrastructure model loaded")

    def detect(self, frame):

        frame_h, frame_w = frame.shape[:2]
        frame_area = frame_h * frame_w

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

                confidence = float(box.conf[0])

                cls_id = int(box.cls[0])

                label = result.names[cls_id]

                # Allowed classes only
                if label not in self.allowed_classes:
                    continue

                # Merge corrosion labels
                if label in [
                    "corrosion",
                    "corrosion_mild",
                    "corrosion_severe"
                ]:
                    label = "rust"

                x1, y1, x2, y2 = map(
                    int,
                    box.xyxy[0]
                )

                # Reject giant false-positive boxes
                area = (x2 - x1) * (y2 - y1)

                #if area > 0.6 * frame_area:
                 #   continue

                detections.append({
                    "label": label,
                    "confidence": round(confidence, 2),
                    "bbox": [x1, y1, x2, y2]
                })

        return detections