import cv2

from ai_core.detectors.infrastructure_detector import InfrastructureDetector

detector = InfrastructureDetector()

image = cv2.imread("concrete_crack.jpg")

detections = detector.detect(image)

print(detections)