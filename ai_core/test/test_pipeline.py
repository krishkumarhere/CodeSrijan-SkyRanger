import cv2
from ai_core.pipeline.inference_pipeline import InferencePipeline

image_path = r"C:\Users\Krish\Downloads\test.jpg"

frame = cv2.imread(image_path)

if frame is None:
    print("❌ Failed to load image")
    exit()

pipeline = InferencePipeline()

# 🔹 SURVEILLANCE
print("\n--- SURVEILLANCE ---")
result = pipeline.run(frame)
print(result.detections)

# 🔹 SWITCH TO INSPECTION
print("\n--- SWITCH TO INSPECTION ---")
pipeline.set_mode("INSPECTION")
result = pipeline.run(frame)
print(result.detections)

# 🔹 SWITCH TO THERMAL
print("\n--- SWITCH TO THERMAL ---")
pipeline.set_mode("THERMAL")
result = pipeline.run(frame)
print(result.detections)
