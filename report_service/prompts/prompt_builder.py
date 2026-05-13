def build_prompt(mission_data, detections):

    # ============================================
    # DETECTION SUMMARY
    # ============================================

    if not detections:

        detection_summary = (
            "No critical structural defects detected "
            "during inspection."
        )

    else:

        detection_summary = ""

        for detection in detections:

            detection_summary += (
                f"- {detection['type']} detected "
                f"with {detection['confidence']}% confidence "
                f"({detection['severity']}) "
                f"at {detection['location']}\n"
            )

    # ============================================
    # FINAL PROMPT
    # ============================================

    prompt = f"""
You are IRIS, an autonomous drone inspection reporting system.

Generate ONLY these sections:

1. EXECUTIVE SUMMARY
2. RISK ASSESSMENT
3. MAINTENANCE RECOMMENDATIONS
4. INSPECTION CONCLUSION

Rules:
- Technical engineering tone
- Concise and operational
- Active voice
- No conversational text
- No markdown
- Maximum 80 words per section
- If risk level is HIGH or CRITICAL, clearly state immediate maintenance action required
- If no defects are detected, state infrastructure condition appears stable

MISSION DATA:
- Mission ID: {mission_data['mission_id']}
- Inspection Type: {mission_data['inspection_type']}
- Mission Duration: {mission_data['mission_duration']}
- Operator: {mission_data['operator_name']}
- AI Model: {mission_data['model_used']}
- Pipeline Status: {mission_data['pipeline_status']}
- Average FPS: {mission_data['fps']}
- Snapshots Captured: {mission_data['snapshot_count']}
- GPS Status: {mission_data['gps_status']}
- Battery Used: {mission_data['battery_used']}
- Max Altitude: {mission_data['max_altitude']}
- Average Thrust: {mission_data['average_thrust']}
- Overall Risk Level: {mission_data['risk_level']}

DETECTION SUMMARY:
{detection_summary}

Generate final engineering inspection report now.
"""

    return prompt