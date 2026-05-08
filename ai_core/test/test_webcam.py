import cv2
from ai_core.pipeline.inference_pipeline import InferencePipeline

# start webcam
cap = cv2.VideoCapture(0)

pipeline = InferencePipeline(initial_mode="INSPECTION")

while True:
    ret, frame = cap.read()
    if not ret:
        print("Camera not working")
        break

    result = pipeline.run(frame)

    # draw detections
    for d in result.detections:
        if "bbox" not in d:
            continue

        x1, y1, x2, y2 = map(int, d["bbox"])

        label = f"{d.get('severity','')} {d['confidence']:.2f}"

        # draw box
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)

        # draw label
        cv2.putText(
            frame,
            label,
            (x1, y1 - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 0, 255),
            2
        )

    # show frame
    cv2.imshow("Inspection Live", frame)

    # press ESC to exit
    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()