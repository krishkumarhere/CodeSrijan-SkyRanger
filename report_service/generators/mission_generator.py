import random


OPERATORS = [
    "Operator-A1",
    "Operator-B2",
    "Operator-C3"
]

INSPECTION_TYPES = [
    "Bridge Inspection",
    "Building Facade Inspection",
    "Concrete Structure Inspection",
    "Powerline Inspection"
]

MODELS = [
    "SkyNet-v2",
    "InfraInspect-YOLO",
    "PowerLineNet"
]

GPS_STATUSES = [
    "3D FIX",
    "DGPS",
    "RTK LOCK"
]


def generate_mission_data():

    return {

        "mission_id": f"SR-{random.randint(1000,9999)}",

        "inspection_type": random.choice(
            INSPECTION_TYPES
        ),

        "mission_duration":
            f"{random.randint(8,25)} min",

        "operator_name":
            random.choice(OPERATORS),

        "model_used":
            random.choice(MODELS),

        "pipeline_status":
            "ACTIVE",

        "fps":
            random.randint(18,32),

        "snapshot_count":
            random.randint(3,12),

        "risk_level":
            random.choice([
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL"
            ]),

        "gps_status":
            random.choice(GPS_STATUSES),

        "battery_used":
            f"{random.randint(18,60)}%",

        "max_altitude":
            f"{random.randint(20,65)} m",

        "average_thrust":
            f"{random.randint(30,58)}%"
    }