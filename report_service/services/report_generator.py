from jinja2 import Environment, FileSystemLoader
from xhtml2pdf import pisa

import uuid
import os


def generate_pdf_report(
    mission_data,
    detections,
    analysis_text
):

    BASE_DIR = os.path.dirname(
        os.path.abspath(__file__)
    )

    PROJECT_ROOT = os.path.join(
        BASE_DIR,
        ".."
    )

    TEMPLATE_DIR = os.path.join(
        PROJECT_ROOT,
        "templates"
    )

    REPORT_DIR = os.path.join(
        PROJECT_ROOT,
        "reports"
    )

    os.makedirs(REPORT_DIR, exist_ok=True)

    env = Environment(
        loader=FileSystemLoader(TEMPLATE_DIR)
    )

    template = env.get_template(
        "report_template.html"
    )

    rendered_html = template.render(
        mission=mission_data,
        detections=detections,
        analysis=analysis_text
    )

    filename = f"{uuid.uuid4()}.pdf"

    filepath = os.path.join(
        REPORT_DIR,
        filename
    )

    with open(filepath, "w+b") as pdf_file:

        pisa.CreatePDF(
            rendered_html,
            dest=pdf_file
        )

    return filename