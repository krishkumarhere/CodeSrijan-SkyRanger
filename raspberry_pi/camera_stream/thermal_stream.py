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

# Global state for thermal telemetry
thermal_stats = {
    "max_temp": 0.0,
    "min_temp": 0.0,
    "avg_temp": 0.0,
    "hotspots": 0
}

def generate_thermal_frames():
    global thermal_stats
    while True:
        try:
            # Read thermal frame
            mlx.getFrame(frame_buffer)
            temp = np.array(frame_buffer)
            
            # Calculate real telemetry
            thermal_stats["max_temp"] = float(np.max(temp))
            thermal_stats["min_temp"] = float(np.min(temp))
            thermal_stats["avg_temp"] = float(np.mean(temp))
            # Count pixels significantly hotter than average (mock detection logic)
            thermal_stats["hotspots"] = int(np.sum(temp > 38.0))

            # Process for display
            temp_reshaped = temp.reshape((24, 32))
            normalized = cv2.normalize(temp_reshaped, None, 0, 255, cv2.NORM_MINMAX)
            normalized = np.uint8(normalized)
            resized = cv2.resize(normalized, (640, 480), interpolation=cv2.INTER_CUBIC)
            heatmap = cv2.applyColorMap(resized, cv2.COLORMAP_JET)

            success, buffer = cv2.imencode('.jpg', heatmap, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if not success: continue
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            
            time.sleep(0.1) # 10 FPS is plenty for thermal

        except Exception as e:
            print(f"[THERMAL ERROR] {e}")
            time.sleep(1)