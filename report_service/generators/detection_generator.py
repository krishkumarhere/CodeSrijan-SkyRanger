import random

DEFECT_TYPES = {
    "corrosion": {
        "severity": ["MEDIUM", "HIGH"],
        "confidence_range": (78, 93)
    },

    "spalling": {
        "severity": ["MEDIUM", "HIGH"],
        "confidence_range": (75, 92)
    },

    "peeling": {
        "severity": ["LOW", "MEDIUM"],
        "confidence_range": (70, 88)
    },

    "water_leakage": {
        "severity": ["MEDIUM", "HIGH"],
        "confidence_range": (72, 90)
    }
}


def generate_detections():

    detections = []

    defect_keys = list(DEFECT_TYPES.keys())

    # RANDOMLY DECIDE:
    # 0 to all defects

    count = random.randint(0, len(defect_keys))

    if count == 0:
        return detections

    selected = random.sample(
        defect_keys,
        k=count
    )

    for defect in selected:

        config = DEFECT_TYPES[defect]

        confidence = random.randint(
            config["confidence_range"][0],
            config["confidence_range"][1]
        )

        detections.append({

            "type": defect.replace("_", " ").title(),

            "confidence": confidence,

            "severity": random.choice(
                config["severity"]
            ),

            "location":
                f"Waypoint-{random.randint(1,15):02}",

            "folder_name": defect
        })

    return detections