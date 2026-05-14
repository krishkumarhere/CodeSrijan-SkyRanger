from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import FileResponse
import os
import sys

# ============================================
# IMPORT BACKEND MODULES
# ============================================

sys.path.append(
    os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            '..',
            'backend'
        )
    )
)

# ============================================
# TEMPORARILY DISABLED AUTH FOR HACKATHON DEMO
# ============================================

# from fastapi import Depends
# from app.auth.deps import require_role, block_report_when_flying

# ============================================
# INTERNAL MODULES
# ============================================

from generators.mission_generator import generate_mission_data
from generators.detection_generator import generate_detections
from generators.image_selector import select_image

from prompts.prompt_builder import build_prompt

from services.ollama_client import generate_report
from services.report_generator import generate_pdf_report

# ============================================
# FASTAPI APP
# ============================================

app = FastAPI(
    title="SkyRanger AI Report Service",
    version="1.0"
)

# ============================================
# REQUEST MODEL
# ============================================

class ReportRequest(BaseModel):
    prompt: str = "generate"

# ============================================
# GENERATE REPORT ENDPOINT
# ============================================

# TEMPORARY:
# AUTH + FLIGHT LOCK DISABLED
# FOR HACKATHON DEMO STABILITY

@app.post("/generate-report")
def generate_ai_report(request: ReportRequest):

    # ============================================
    # GENERATE MOCK MISSION DATA
    # ============================================

    mission_data = generate_mission_data()

    detections = generate_detections()

    # ============================================
    # ATTACH SAMPLE IMAGES
    # ============================================

    for detection in detections:

        detection["image"] = select_image(
            detection["folder_name"]
        )

    # ============================================
    # COMPUTE RISK LEVEL
    # ============================================

    if not detections:

        mission_data["risk_level"] = "LOW"

    elif any(
        d["severity"] == "CRITICAL"
        for d in detections
    ):

        mission_data["risk_level"] = "CRITICAL"

    elif any(
        d["severity"] == "HIGH"
        for d in detections
    ):

        mission_data["risk_level"] = "HIGH"

    elif any(
        d["severity"] == "MEDIUM"
        for d in detections
    ):

        mission_data["risk_level"] = "MEDIUM"

    else:

        mission_data["risk_level"] = "LOW"

    # ============================================
    # BUILD AI PROMPT
    # ============================================

    prompt = build_prompt(
        mission_data,
        detections
    )

    # ============================================
    # GENERATE AI ANALYSIS USING OLLAMA
    # ============================================

    analysis = generate_report(prompt)

    # ============================================
    # GENERATE PDF REPORT
    # ============================================

    filename = generate_pdf_report(
        mission_data,
        detections,
        analysis
    )

    # ============================================
    # RESPONSE
    # ============================================

    return {

        "success": True,

        "mission_id":
            mission_data["mission_id"],

        "risk_level":
            mission_data["risk_level"],

        "detections":
            len(detections),

        "download_url":
            f"/download/{filename}"
    }

# ============================================
# DOWNLOAD GENERATED REPORT
# ============================================

@app.get("/download/{filename}")
def download_file(filename: str):

    filepath = os.path.join(
        "reports",
        filename
    )

    if not os.path.exists(filepath):

        return {
            "error": "File not found"
        }

    return FileResponse(
        path=filepath,
        media_type="application/pdf",
        filename=filename
    )

# ============================================
# HEALTH CHECK
# ============================================

@app.get("/")
def root():

    return {
        "service": "SkyRanger AI Report Service",
        "status": "online"
    }