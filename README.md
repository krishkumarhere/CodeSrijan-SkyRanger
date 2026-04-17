# SkyRanger  — Smart Disaster Response Drone System

## Problem Statement

**Statement 5: Smart Disaster Response Robots with AI Navigation**

During natural disasters such as earthquakes, fires, or floods, rescue operations are often risky and time-sensitive. Human responders face dangers in accessing affected areas. This problem aims to develop AI-enabled disaster response robots that can navigate hazardous environments using sensors, computer vision, and reinforcement learning. The robots can locate survivors, map disaster zones, and assist rescue teams, improving response time and saving lives.

---

## Team Details

**Team Name:** SkyRanger
**Participants:** Krish Kumar , Swastika Kumari , Rudra Bishwakarma.
**College:** Jaypee University of Engineering and Technology, Guna 

---

## Overview

SkyRanger - is an AI-powered autonomous drone system designed for real-time disaster response and rescue assistance.

The system integrates computer vision, real-time telemetry, decision-making logic, and mission planning into a unified pipeline that enables autonomous perception-to-action behavior in hazardous environments.

---

## System Pipeline

The system is designed as a complete end-to-end pipeline from perception to control:

1. Data Acquisition

   * Camera feed captured on Raspberry Pi
   * Sensor data (GPS, IMU, system stats) collected in real time

2. Data Transmission

   * Video stream sent from Raspberry Pi to compute node (laptop)
   * Telemetry transmitted to backend via WebSocket

3. Perception Layer

   * YOLO-based object detection runs on laptop
   * Outputs bounding boxes, class labels, and confidence scores

4. Processing and Filtering

   * Detection results filtered based on priority (e.g., person > vehicle)
   * Confidence thresholds applied to remove noise

5. Temporal Tracking

   * Multi-frame validation ensures detection stability
   * Target locking mechanism reduces false positives

6. Decision Layer

   * Zone-based logic determines movement direction
   * System state transitions (IDLE → SCAN → DETECT → TRACK)
   * Failure handling for low-confidence or no-detection cases

7. Command Generation

   * Decisions converted into control commands
   * MAVLink-compatible messages prepared for flight controller

8. Mission Control Integration

   * Waypoints generated or uploaded via Mission Planner UI
   * Backend communicates with Pixhawk using MAVLink protocol

9. Execution Layer

   * Pixhawk receives commands and handles flight control
   * System remains responsive to real-time perception updates

10. Visualization

* Web dashboard displays video, detections, telemetry, and system state
* Mission status and logs presented to operator

---

## Key Features

* Real-time object detection using YOLO
* Priority-based decision making
* Zone-based navigation logic
* Temporal tracking for stable detection
* Mission planning and waypoint upload
* MAVLink-based communication with flight controller
* Live telemetry and system monitoring
* Distributed architecture (edge + compute separation)

---

## System Architecture

Raspberry Pi (Edge Node)

* Camera streaming
* Sensor data acquisition
* Backend services

Laptop (Compute Node)

* YOLO inference
* Detection processing

Pixhawk (Flight Controller)

* Low-level flight execution
* MAVLink communication

Web Interface

* Mission planning
* Visualization
* System monitoring

---

## Tech Stack

Hardware

* Raspberry Pi 5
* Pixhawk Flight Controller
* Camera Module
* LiDAR (optional)

Software

* Python
* FastAPI
* React.js
* OpenCV
* PyTorch / YOLOv8
* MAVLink / pymavlink

---

## Deployment Strategy

The system follows a hybrid deployment approach:

* Frontend deployed on Vercel
* Backend executed on local edge device (Raspberry Pi)
* AI inference performed on laptop
* Backend exposed via local network or secure tunnel (ngrok)

This ensures real-time performance while maintaining accessibility through a deployed interface.

---

## Demo Flow

1. Launch system and verify backend connection
2. Open dashboard and observe live telemetry
3. Start camera feed and AI detection
4. Observe detection, tracking, and decision behavior
5. Navigate to Mission Planner
6. Upload waypoints to system
7. Demonstrate perception-to-control pipeline

---

## Challenges

* Real-time processing under hardware constraints
* Power limitations in drone systems
* MAVLink communication handling
* Synchronization across distributed components

---

## Future Scope

* Reinforcement learning-based navigation
* Multi-drone coordination
* Advanced SLAM and mapping
* Cloud-based mission analytics

## Conclusion

SkyRanger presents a complete autonomous drone intelligence pipeline that integrates perception, decision-making, and control. The system demonstrates how AI-driven robotics can assist in disaster response scenarios by improving situational awareness and enabling faster, safer operations.


