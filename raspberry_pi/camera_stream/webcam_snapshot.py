# webcam_snapshot.py

import cv2
import os
import time

# ============================================
# RTSP STREAM URL
# ============================================

RTSP_URL = "rtsp://127.0.0.1:8554/fpv"

# ============================================
# SAVE DIRECTORY
# ============================================

SAVE_DIR = os.path.join(
    os.getcwd(),
    "captured_frames",
    "webcam"
)

os.makedirs(
    SAVE_DIR,
    exist_ok=True
)

# ============================================
# CONNECT TO RTSP STREAM
# ============================================

print(f"[INFO] Connecting to RTSP stream:\n{RTSP_URL}")

cap = cv2.VideoCapture(RTSP_URL)

if not cap.isOpened():

    print("[ERROR] Failed to connect to webcam RTSP stream")

    exit()

print("[INFO] Webcam snapshot service started")

# ============================================
# SNAPSHOT SETTINGS
# ============================================

SNAPSHOT_INTERVAL = 2
last_snapshot = 0

# ============================================
# MAIN LOOP
# ============================================

while True:

    ret, frame = cap.read()

    if not ret:

        print("[WARN] Failed to read webcam frame")

        time.sleep(1)

        continue

    current_time = time.time()

    # ========================================
    # SAVE SNAPSHOT EVERY 2 SECONDS
    # ========================================

    if current_time - last_snapshot > SNAPSHOT_INTERVAL:

        filename = os.path.join(
            SAVE_DIR,
            f"{int(current_time)}.jpg"
        )

        cv2.imwrite(
            filename,
            frame
        )

        print(f"[WEBCAM SNAPSHOT] Saved {filename}")

        last_snapshot = current_time

    time.sleep(0.05)