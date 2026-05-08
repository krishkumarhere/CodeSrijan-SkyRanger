import cv2
from ultralytics import YOLO

# load model
model = YOLO("ai_core/models/weights/infra_yolov8n.pt")

# load image
#img = cv2.imread("concrete_crack.jpg")
#img = cv2.imread("corrosion.jpg ")
#img = cv2.imread("spalling.jpg ")
img = cv2.imread("cafe_crack.jpeg")
if img is None:
    print("Image not found!")
    exit()

# run detection
results = model(img, conf=0.4)

# show result
annotated = results[0].plot()

cv2.imshow("Image Test", annotated)
cv2.waitKey(0)
cv2.destroyAllWindows()