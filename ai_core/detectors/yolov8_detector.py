# ai_core/detectors/yolov8_detector.py

from ultralytics import YOLO

class YOLOv8Detector:
    def __init__(self, model_path="models/weights/yolov8n.pt"):
        print("[AI] Loading YOLOv8n...")
        self.model = YOLO(model_path)
        print("[AI] Model loaded")

    def detect(self, frame):
        results = self.model(frame, verbose=False)

        detections = []

        for result in results:
            boxes = result.boxes

            for box in boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])

                x1, y1, x2, y2 = map(int, box.xyxy[0])

                label = self.model.names[cls_id]

                detections.append({
                    "label": label,
                    "confidence": conf,
                    "bbox": [x1, y1, x2, y2]
                })

        return detections