#!/bin/bash

/usr/bin/ffmpeg \
-f v4l2 \
-input_format mjpeg \
-framerate 30 \
-video_size 640x480 \
-i /dev/v4l/by-id/usb-046d_C270_HD_WEBCAM_E570B070-video-index0 \
-c:v libx264 \
-preset ultrafast \
-tune zerolatency \
-pix_fmt yuv420p \
-rtsp_transport tcp \
-f rtsp \
rtsp://127.0.0.1:8555/fpv
