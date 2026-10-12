import base64
import json
import os
import re
from datetime import datetime
from pathlib import Path

import fitz
import requests
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Private Booking Form Reader")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://aira-internal-sales-management.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["POST", "OPTIONS", "GET"],
    allow_headers=["*"],
)

FIELD_NAMES = [
    "customer_name", "customer_ic", "customer_salutation", "customer_tin",
    "customer_nationality", "customer_sex", "customer_race", "bumi_status",
    "customer_occupation", "contact_person", "customer_phone", "customer_email",
    "customer_address", "customer_name_2", "customer_ic_2", "customer_salutation_2",
    "customer_tin_2", "customer_nationality_2", "customer_sex_2", "customer_race_2",
    "bumi_status_2", "customer_occupation_2", "contact_person_2", "customer_phone_2",
    "customer_email_2", "customer_address_2", "sale_date", "unit_number",
    "storey_number", "unit_type", "floor_area_sqm", "floor_area", "purchase_price",
    "car_parking_bay", "payment_method", "payment_reference", "purchaser_type",
]
SCHEMA = {
    "type": "object",
    "properties": {
        "fields": {
            "type": "object",
            "properties": {name: {"type": "string"} for name in FIELD_NAMES},
            "required": FIELD_NAMES,
        },
        "warnings": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["fields", "warnings"],
}
UNIT_SCHEMA = {
    "type": "object",
    "properties": {"unit_number": {"type": "string"}},
    "required": ["unit_number"],
}
PROMPT = """Read only handwritten or manually entered information from these enlarged, overlapping sections of an Aira Booking Form. The sections are supplied in page order and may repeat content where they overlap. Do not use printed template labels or standard clauses as values. Preserve names, identity numbers, phone numbers, emails, unit numbers and payment references exactly.

For the Purchaser's Particulars appendix, follow the physical table rows carefully:
- The first completed purchaser row is purchaser 1. Map its Contact Person's Name, Mobile No. and Email Address from the first contact row to contact_person, customer_phone and customer_email.
- Populate purchaser 2 fields only when the second purchaser row in section A or B contains an actual purchaser name or identity number. A second contact-person row by itself is not a second purchaser.
- Join all handwritten lines under Correspondence Address into one complete address.
- Read crossed or circled Yes/No Bumi status only when the intended choice is clear.

Cross-check repeated details elsewhere in the form. Use DD/MM/YYYY for clear dates. Return purchase price and areas as digits and decimals only, without RM, commas or units. Return an empty string for every blank or unreadable field. If values appear entered in the wrong labelled boxes, keep each value under the physical label and add a warning. Add a warning for every uncertain reading. Do not extract signatures. Return only the requested JSON."""


@app.middleware("http")
async def private_network_header(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response


@app.get("/health")
def health():
    return {"ok": True, "private": True, "model": os.getenv("BOOKING_OCR_MODEL", "qwen2.5vl:3b")}


def page_png(page, clip=None):
    # Handwriting in the appendix sits inside narrow table cells. Rendering
    # enlarged page sections keeps those entries legible to the local model.
    pixmap = page.get_pixmap(matrix=fitz.Matrix(1.8, 1.8), clip=clip, alpha=False)
    return base64.b64encode(pixmap.tobytes("png")).decode("ascii")


def page_sections(page):
    rect = page.rect
    # Two overlapping vertical sections retain the printed labels beside each
    # handwritten value while avoiding the down-sampling of a whole A4 page.
    upper = fitz.Rect(rect.x0, rect.y0, rect.x1, rect.y0 + rect.height * 0.58)
    lower = fitz.Rect(rect.x0, rect.y0 + rect.height * 0.42, rect.x1, rect.y1)
    return [page_png(page, upper), page_png(page, lower)]


def property_section(page):
    rect = page.rect
    clip = fitz.Rect(
        rect.x0,
        rect.y0 + rect.height * 0.45,
        rect.x1,
        rect.y0 + rect.height * 0.92,
    )
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2.2, 2.2), clip=clip, alpha=False)
    return base64.b64encode(pixmap.tobytes("png")).decode("ascii")


def safe_part(value, fallback):
    cleaned = re.sub(r'[<>:"/\\|?*]', "-", str(value or "")).strip(" .-")
    return cleaned or fallback


def unit_folder(unit_number):
    root = Path(os.getenv("BOOKING_FORM_FOLDER", r"C:\AIRA Booking"))
    folder = root / safe_part(unit_number, f"Unidentified_{datetime.now():%Y%m%d-%H%M%S}")
    folder.mkdir(parents=True, exist_ok=True)
    return folder


@app.post("/save-file")
async def save_file(
    file: UploadFile = File(...),
    unit_number: str = Form(...),
    filename: str = Form(...),
):
    data = await file.read()
    if len(data) > 30_000_000:
        raise HTTPException(status_code=400, detail="The file is larger than 30 MB.")
    folder = unit_folder(unit_number)
    path = folder / safe_part(Path(filename).name, "Document")
    path.write_bytes(data)
    return {"ok": True, "saved_path": str(path)}


@app.post("/extract")
async def extract(file: UploadFile = File(...)):
    is_pdf = file.content_type == "application/pdf" or str(file.filename or "").lower().endswith(".pdf")
    if not is_pdf:
        raise HTTPException(status_code=400, detail="Please select a PDF Booking Form.")
    data = await file.read()
    if len(data) > 20_000_000:
        raise HTTPException(status_code=400, detail="Please upload a PDF smaller than 20 MB.")
    try:
        pdf = fitz.open(stream=data, filetype="pdf")
        if not pdf.page_count:
            raise ValueError("The PDF has no pages.")
        # The detailed purchaser/contact appendix is normally the final page,
        # while unit and payment information appears on the opening pages.
        # Include both and enlarge them in overlapping sections. This also
        # supports older scans where the appendix was moved earlier.
        indexes = list(dict.fromkeys([0, min(1, pdf.page_count - 1), pdf.page_count - 1]))
        images = [image for index in indexes for image in page_sections(pdf[index])]
        payload = {
            "model": os.getenv("BOOKING_OCR_MODEL", "qwen2.5vl:3b"),
            "messages": [{"role": "user", "content": PROMPT, "images": images}],
            "format": SCHEMA,
            "stream": False,
            "keep_alive": "30m",
            "options": {"temperature": 0, "num_ctx": 12288, "num_predict": 1400},
        }
        result = requests.post("http://127.0.0.1:11434/api/chat", json=payload, timeout=900)
        if not result.ok:
            raise RuntimeError(f"Private model error: {result.text}")
        parsed = json.loads(result.json()["message"]["content"])
        source = parsed.get("fields", {})
        fields = {name: str(source.get(name, "") or "").strip() for name in FIELD_NAMES}
        warnings = [str(item) for item in parsed.get("warnings", []) if str(item).strip()]
        if not fields.get("unit_number"):
            # Parcel No. is a small handwritten value inside the Property line
            # on page 1. If the broad form read misses it, retry only that
            # enlarged region with an explicit mapping to unit_number.
            unit_payload = {
                "model": os.getenv("BOOKING_OCR_MODEL", "qwen2.5vl:3b"),
                "messages": [{
                    "role": "user",
                    "content": (
                        "Read the handwritten Parcel No. inside the Property line of this "
                        "Aira Booking Form. Return it exactly as written, including letters "
                        "and hyphens (for example A-15-03). Parcel No. means unit_number. "
                        "Do not return the Tower value or any printed text. If blank or "
                        "unreadable, return an empty string. Return only the requested JSON."
                    ),
                    "images": [property_section(pdf[0])],
                }],
                "format": UNIT_SCHEMA,
                "stream": False,
                "keep_alive": "30m",
                "options": {"temperature": 0, "num_ctx": 3072, "num_predict": 120},
            }
            unit_result = requests.post(
                "http://127.0.0.1:11434/api/chat", json=unit_payload, timeout=300
            )
            if unit_result.ok:
                unit_parsed = json.loads(unit_result.json()["message"]["content"])
                fields["unit_number"] = str(unit_parsed.get("unit_number", "") or "").strip()
        unit = safe_part(fields.get("unit_number", ""), "")
        if not unit:
            unit = f"Unidentified_{datetime.now():%Y%m%d-%H%M%S}"
            warnings.append("Unit number could not be read; the local PDF was saved with an Unidentified filename.")
        output_dir = unit_folder(unit)
        path = output_dir / f"Booking_{unit}.pdf"
        path.write_bytes(data)
        return {"fields": fields, "warnings": warnings, "saved_path": str(path)}
    except requests.ConnectionError as error:
        raise HTTPException(status_code=503, detail="The private handwriting model is not running.") from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"The Booking Form could not be read: {error}") from error
