import cv2
from ai_core.detectors.human_detector import HumanDetector

# load image (use FULL path for now to avoid path confusion)
image_path = r"C:\Users\Krish\Downloads\test.jpg"

frame = cv2.imread(image_path)

if frame is None:
    print("❌ Failed to load image")
    exit()

detector = HumanDetector()

result = detector.detect(frame)

print("Mode:", result.mode)
print("Detections:", result.detections)