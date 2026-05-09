import time
import board
import busio
import numpy as np
import cv2
import adafruit_mlx90640

# =========================
# MLX90640 INITIALIZATION
# =========================

i2c = busio.I2C(board.SCL, board.SDA)

mlx = adafruit_mlx90640.MLX90640(i2c)

# Stable refresh rate
mlx.refresh_rate = adafruit_mlx90640.RefreshRate.REFRESH_4_HZ

# Frame buffer
frame_buffer = [0] * 768

print("[THERMAL] MLX90640 initialized")


# =========================
# THERMAL FRAME GENERATOR
# =========================

def generate_thermal_frames():

    while True:
        try:
            # Read thermal frame
            mlx.getFrame(frame_buffer)

            # Convert to numpy array
            temp = np.array(frame_buffer)

            # Reshape to 24x32
            temp = temp.reshape((24, 32))

            # Normalize values
            normalized = cv2.normalize(
                temp,
                None,
                0,
                255,
                cv2.NORM_MINMAX
            )

            normalized = np.uint8(normalized)

            # Resize for frontend
            resized = cv2.resize(
                normalized,
                (640, 480),
                interpolation=cv2.INTER_CUBIC
            )

            # Apply heatmap
            heatmap = cv2.applyColorMap(
                resized,
                cv2.COLORMAP_JET
            )

            # Encode JPEG
            success, buffer = cv2.imencode(
                '.jpg',
                heatmap,
                [cv2.IMWRITE_JPEG_QUALITY, 70]
            )

            if not success:
                continue

            frame = buffer.tobytes()

            # MJPEG stream format
            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' +
                frame +
                b'\r\n'
            )

            # Stability delay
            time.sleep(0.05)

        except RuntimeError:
            print("[THERMAL] Frame read failed")
            continue

        except Exception as e:
            print(f"[THERMAL ERROR] {e}")
            continue