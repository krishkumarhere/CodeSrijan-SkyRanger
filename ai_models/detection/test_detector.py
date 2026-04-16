# ai_models/detection/test_detector.py
import cv2
from detector import HumanDetector

detector = HumanDetector(model_path="yolov8n.pt")
detector.load()

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    result = detector.detect(frame)

    cv2.imshow("SkyRanger - AI Detection Test", result["annotated_frame"])
    print(f"Action: {result['action']} | Mode: {result['mode']}")

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
