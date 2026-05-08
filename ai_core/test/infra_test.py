import cv2
from ultralytics import YOLO

# 🔹 load trained infra model
model = YOLO("ai_core/models/weights/infra_yolov8n.pt")

# 🔹 allowed classes (keep tight)
ALLOWED_CLASSES = ["crack", "water_leakage", "corrosion"]

# 🔹 start webcam
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("Camera not working")
    exit()

print("Press ESC to exit")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame_h, frame_w = frame.shape[:2]
    frame_area = frame_h * frame_w

    # 🔹 run detection with confidence threshold
    results = model(frame, conf=0.6)

    # 🔹 manual drawing (controlled)
    for r in results:
        for box in r.boxes:

            conf = float(box.conf)
            cls = int(box.cls)
            label = r.names[cls]

            # 🔥 filter classes
            if label not in ALLOWED_CLASSES:
                continue

            # 🔥 merge corrosion classes
            if label in ["corrosion", "corrosion_mild", "corrosion_severe"]:
                label = "rust"

            x1, y1, x2, y2 = map(int, box.xyxy[0])

            # 🔥 filter very large boxes (false positives)
            area = (x2 - x1) * (y2 - y1)
            if area > 0.6 * frame_area:
                continue

            # 🔹 draw box
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

            # 🔹 label text
            text = f"{label} {conf:.2f}"

            cv2.putText(
                frame,
                text,
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2
            )

    # 🔹 show frame
    cv2.imshow("Infra Test", frame)

    # 🔹 exit on ESC
    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()