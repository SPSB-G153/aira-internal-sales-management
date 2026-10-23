import base64
import hashlib
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
    "salesperson_name", "salesperson_designation", "salesperson_mobile", "salesperson_email",
    "agent_company", "agent_name", "agent_designation", "agent_mobile", "agent_email", "agent_address",
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
DIRECTOR_SCHEMA = {
    "type": "object",
    "properties": {
        "director_name": {"type": "string"},
        "director_nationality": {"type": "string"},
        "director_sex": {"type": "string"},
    },
    "required": ["director_name", "director_nationality", "director_sex"],
}
UNIT_SCHEMA = {
    "type": "object",
    "properties": {"unit_number": {"type": "string"}},
    "required": ["unit_number"],
}
PRICE_SCHEMA = {
    "type": "object",
    "properties": {
        "is_filled": {"type": "boolean"},
        "purchase_price": {"type": "string"},
    },
    "required": ["is_filled", "purchase_price"],
}
BOOKING_FEE_SCHEMA = {
    "type": "object",
    "properties": {
        "booking_fee": {"type": "string"},
        "booking_fee_text": {"type": "string"},
        "sale_date": {"type": "string"},
        "payment_method": {"type": "string"},
        "payment_reference": {"type": "string"},
        "cheque_amounts": {"type": "string"},
        "cheque_amount_words": {"type": "string"},
        "cheque_dates": {"type": "string"},
        "cheque_references": {"type": "string"},
    },
    "required": ["booking_fee", "booking_fee_text", "sale_date", "payment_method", "payment_reference", "cheque_amounts", "cheque_amount_words", "cheque_dates", "cheque_references"],
}
SINGLE_CHEQUE_SCHEMA = {
    "type": "object",
    "properties": {
        "amount": {"type": "string"},
        "amount_words": {"type": "string"},
        "date": {"type": "string"},
        "reference": {"type": "string"},
    },
    "required": ["amount", "amount_words", "date", "reference"],
}
POP_ADMIN_FIELDS = [
    "customer_name", "purchaser_type", "project_name", "unit_number", "purchase_price", "sale_date",
    "sale_reference", "salesperson_name", "salesperson_designation",
    "salesperson_mobile", "salesperson_email", "agent_company", "agent_address",
]
POP_ADMIN_SCHEMA = {
    "type": "object",
    "properties": {name: {"type": "string"} for name in POP_ADMIN_FIELDS},
    "required": POP_ADMIN_FIELDS,
}
AGENT_CARD_FIELDS = ["agent_company", "agent_name", "agent_designation", "agent_mobile", "agent_email", "agent_address"]
AGENT_CARD_SCHEMA = {
    "type": "object",
    "properties": {name: {"type": "string"} for name in AGENT_CARD_FIELDS},
    "required": AGENT_CARD_FIELDS,
}
PROMPT = """Read only handwritten or manually entered information from these enlarged sections of an Aira Booking Form. For the approved five-page form, the images show the completed first page, the Property Details table on page 5, and the Purchaser's Particulars table on page 5. Cross-check repeated values and prefer the clearest or most complete occurrence. Do not use printed template labels or standard clauses as values. Preserve names, identity numbers, phone numbers, emails, unit numbers and payment references exactly.

For the Purchaser's Particulars appendix, follow the physical table rows carefully:
- The first completed purchaser row is purchaser 1. Map its Contact Person's Name, Mobile No. and Email Address from the first contact row to contact_person, customer_phone and customer_email.
- When purchaser 1 is a company and the next line in the same purchaser-name cell identifies a director, keep the company as customer_name, set customer_occupation to Company Director and purchaser_type to company. Do not treat the director as purchaser 2.
- Set purchaser_type to company when the purchaser is a registered entity (including names ending in Sdn. Bhd., S/B, Berhad, Ltd., LLP or similar); otherwise set it to individual.
- Populate purchaser 2 fields only when the second purchaser row in section A or B contains an actual purchaser name or identity number. A second contact-person row by itself is not a second purchaser.
- Join all handwritten lines under Correspondence Address into one complete address.
- Read crossed or circled Yes/No Bumi status only when the intended choice is clear.

The Property Details table maps Parcel No. to unit_number, Storey No. to storey_number, Type to unit_type, the left Area value to floor_area_sqm, the right Area value to floor_area, Purchase Price to purchase_price, and Car Parking Bay to car_parking_bay. Convert values such as RM 10,000,000 to 10000000 and 5,943 square feet to 5943. Use DD/MM/YYYY for clear dates. Return purchase price and areas as digits and decimals only, without RM, commas or units. Return an empty string for every blank or unreadable field. If values appear entered in the wrong labelled boxes, keep each value under the physical label and add a warning. Add a warning for every uncertain reading. Do not extract signatures.

If the Booking Form states an external agent, agency, realty company or introducer, extract the agency/company into agent_company and any printed agent contact details into agent_name, agent_designation, agent_mobile, agent_email and agent_address. Extract the internal Selangor Properties team member separately into the salesperson fields. Never use the purchaser as the agent or agency. Return empty agent fields when no external agent is stated. Return only the requested JSON."""
CACHE_VERSION = "booking-reader-2026-10-22-v8-price-verification"


@app.middleware("http")
async def private_network_header(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response


@app.get("/health")
def health():
    return {"ok": True, "private": True, "model": os.getenv("BOOKING_OCR_MODEL", "qwen2.5vl:3b")}


def structured_model_response(payload, timeout, retry_num_predict=None):
    """Return complete structured JSON, retrying once when Ollama truncates it."""
    response = requests.post("http://127.0.0.1:11434/api/chat", json=payload, timeout=timeout)
    if not response.ok:
        raise RuntimeError(f"Private model error: {response.text}")
    content = response.json()["message"]["content"]
    try:
        return json.loads(content)
    except json.JSONDecodeError as first_error:
        if not retry_num_predict:
            raise RuntimeError("The private model returned an incomplete response. Please retry the upload.") from first_error
        retry_payload = dict(payload)
        retry_payload["options"] = {**payload.get("options", {}), "num_predict": retry_num_predict}
        retry = requests.post("http://127.0.0.1:11434/api/chat", json=retry_payload, timeout=timeout)
        if not retry.ok:
            raise RuntimeError(f"Private model retry error: {retry.text}")
        try:
            return json.loads(retry.json()["message"]["content"])
        except json.JSONDecodeError as retry_error:
            raise RuntimeError("The private model returned an incomplete response twice. Please retry the upload.") from retry_error


def normalize_booking_fee(amount, displayed_text):
    raw = str(displayed_text or "").strip()
    compact = re.sub(r"[\s,]", "", raw)
    thousands = re.search(r"(?:RM)?(\d+(?:\.\d+)?)K\b", compact, re.IGNORECASE)
    if thousands:
        value = float(thousands.group(1)) * 1000
        return str(int(value)) if value.is_integer() else str(value)
    comma_amount = re.search(r"\d{1,3}(?:,\d{3})+(?:\.\d+)?", raw)
    if comma_amount:
        return comma_amount.group(0).replace(",", "")
    normalized = re.sub(r"[^0-9.]", "", str(amount or ""))
    return normalized


def amount_from_words(value):
    small = {"zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90}
    current = total = 0
    found = False
    for word in re.findall(r"[a-z]+", str(value or "").lower()):
        if word in small:
            current += small[word]
            found = True
        elif word == "hundred":
            current = max(current, 1) * 100
            found = True
        elif word == "thousand":
            total += max(current, 1) * 1000
            current = 0
            found = True
        elif word == "million":
            total += max(current, 1) * 1_000_000
            current = 0
            found = True
    return total + current if found else None


def normalize_payment_date(value):
    raw = str(value or "").strip()
    for pattern in ("%Y-%m-%d", "%d/%m/%Y", "%d/%m/%y", "%d-%m-%Y", "%d-%m-%y"):
        try:
            return datetime.strptime(raw, pattern).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return ""


def normalize_cheque_reference(value, payment_date, filename):
    digits = re.sub(r"\D", "", str(value or ""))
    date_digits = ""
    try:
        date_digits = datetime.strptime(payment_date, "%Y-%m-%d").strftime("%d%m%y")
    except ValueError:
        pass
    if len(digits) == 6 and digits != date_digits:
        return digits
    # Many internal cheque filenames include the cheque number. Use it only
    # when the visual model returned no valid MICR number or repeated the date.
    candidates = re.findall(r"(?<!\d)(\d{6})(?!\d)", Path(filename or "").stem)
    for candidate in candidates:
        if candidate != date_digits:
            return candidate
    return ""


def page_png(page, clip=None, zoom=1.8):
    # Handwriting in the appendix sits inside narrow table cells. Rendering
    # enlarged page sections keeps those entries legible to the local model.
    pixmap = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=clip, alpha=False)
    return base64.b64encode(pixmap.tobytes("png")).decode("ascii")


def page_png_rotated(page, rotation, zoom=2.0):
    matrix = fitz.Matrix(zoom, zoom).prerotate(rotation)
    pixmap = page.get_pixmap(matrix=matrix, alpha=False)
    return base64.b64encode(pixmap.tobytes("png")).decode("ascii")


def cheque_sections(page):
    rect = page.rect
    # Scanner PDFs can contain two cheques stacked on one portrait page. Give
    # the model one full-width half-page image per possible cheque so a small
    # cheque is not lost beside a much larger one. The model is instructed to
    # ignore a half when it contains no cheque.
    halves = [
        fitz.Rect(rect.x0, rect.y0, rect.x1, rect.y0 + rect.height * 0.5),
        fitz.Rect(rect.x0, rect.y0 + rect.height * 0.5, rect.x1, rect.y1),
    ]
    return [page_png(page, clip, zoom=2.5) for clip in halves]


def page_sections(page, zoom=1.8):
    rect = page.rect
    # Two overlapping vertical sections retain the printed labels beside each
    # handwritten value while avoiding the down-sampling of a whole A4 page.
    upper = fitz.Rect(rect.x0, rect.y0, rect.x1, rect.y0 + rect.height * 0.58)
    lower = fitz.Rect(rect.x0, rect.y0 + rect.height * 0.42, rect.x1, rect.y1)
    return [page_png(page, upper, zoom), page_png(page, lower, zoom)]


def booking_cover_section(page):
    rect = page.rect
    clip = fitz.Rect(rect.x0, rect.y0 + rect.height * 0.18, rect.x1, rect.y0 + rect.height * 0.94)
    return page_png(page, clip, zoom=2.0)


def appendix_property_section(page):
    rect = page.rect
    clip = fitz.Rect(rect.x0, rect.y0 + rect.height * 0.04, rect.x1, rect.y0 + rect.height * 0.34)
    return page_png(page, clip, zoom=2.6)


def appendix_purchaser_section(page):
    rect = page.rect
    clip = fitz.Rect(rect.x0, rect.y0 + rect.height * 0.27, rect.x1, rect.y0 + rect.height * 0.96)
    return page_png(page, clip, zoom=2.0)


def pop_admin_section(page):
    rect = page.rect
    # POP administration details, including the introducer and agency/company,
    # are in the top section. Enlarging only that section avoids shrinking the
    # printed company name when the full A4 page is sent to the private model.
    upper = fitz.Rect(rect.x0, rect.y0, rect.x1, rect.y0 + rect.height * 0.46)
    return page_png(page, upper, zoom=2.4)


def normalize_agent_company(value):
    raw = str(value or "").strip()
    if not raw:
        return ""
    parts = [part.strip(" ,-;") for part in raw.split(",") if part.strip(" ,-;")]
    company_words = re.compile(
        r"\b(?:agency|company|iqi|property|properties|realty|sdn\.?|bhd\.?)\b",
        re.IGNORECASE,
    )
    for part in reversed(parts):
        if company_words.search(part):
            return part
    return raw


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


def apply_inferred_salutations(fields):
    for suffix in ("", "_2"):
        salutation_key = f"customer_salutation{suffix}"
        sex_key = f"customer_sex{suffix}"
        if str(fields.get(salutation_key, "") or "").strip():
            continue
        sex = str(fields.get(sex_key, "") or "").strip().upper()
        if sex in {"M", "MALE"}:
            fields[salutation_key] = "Mr"
        elif sex in {"F", "FEMALE"}:
            fields[salutation_key] = "Ms"
    return fields


def unit_folder(unit_number):
    root = Path(os.getenv("BOOKING_FORM_FOLDER", r"C:\AIRA Booking"))
    folder = root / safe_part(unit_number, f"Unidentified_{datetime.now():%Y%m%d-%H%M%S}")
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def cache_path(data):
    root = Path(os.getenv("BOOKING_FORM_FOLDER", r"C:\AIRA Booking")) / ".reader-cache"
    root.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256(CACHE_VERSION.encode("utf-8") + data).hexdigest()
    return root / f"{digest}.json"


def cached_extraction(data):
    path = cache_path(data)
    if not path.exists():
        return None
    try:
        cached = json.loads(path.read_text(encoding="utf-8"))
        fields = cached.get("fields", {})
        if not isinstance(fields, dict):
            return None
        normalized_fields = {
            name: str(fields.get(name, "") or "").strip() for name in FIELD_NAMES
        }
        return {
            "fields": apply_inferred_salutations(normalized_fields),
            "warnings": [str(item) for item in cached.get("warnings", []) if str(item).strip()],
        }
    except (OSError, ValueError, TypeError):
        return None


def save_cached_extraction(data, fields, warnings):
    path = cache_path(data)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(
        json.dumps({"fields": fields, "warnings": warnings}, ensure_ascii=False),
        encoding="utf-8",
    )
    temporary.replace(path)


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


@app.post("/extract-booking-fee")
async def extract_booking_fee(
    file: UploadFile = File(...),
    unit_number: str = Form(""),
):
    data = await file.read()
    if len(data) > 20_000_000:
        raise HTTPException(status_code=400, detail="Please upload a receipt smaller than 20 MB.")
    filename = str(file.filename or "").lower()
    is_pdf = file.content_type == "application/pdf" or filename.endswith(".pdf")
    is_image = str(file.content_type or "").startswith("image/") or filename.endswith(
        (".png", ".jpg", ".jpeg", ".webp")
    )
    if not is_pdf and not is_image:
        raise HTTPException(status_code=400, detail="Please select a PDF, PNG, JPG or WebP receipt.")
    try:
        if is_pdf:
            receipt = fitz.open(stream=data, filetype="pdf")
            if not receipt.page_count:
                raise ValueError("The receipt PDF has no pages.")
            images = [
                image
                for page_number in range(receipt.page_count)
                for image in cheque_sections(receipt[page_number])
            ]
        else:
            images = [base64.b64encode(data).decode("ascii")]
        if is_pdf:
            individual = []
            for image in images:
                single_payload = {
                    "model": os.getenv("BOOKING_OCR_MODEL", "qwen2.5vl:3b"),
                    "messages": [{
                        "role": "user",
                        "content": (
                            "This image contains at most one cheque. If present, read the numeric RM amount, "
                            "the written amount-in-words line, the boxed DATE as DD/MM/YY, and the six-digit "
                            "MICR cheque number. Return empty strings if no cheque is present. Do not add a zero."
                        ),
                        "images": [image],
                    }],
                    "format": SINGLE_CHEQUE_SCHEMA,
                    "stream": False,
                    "keep_alive": "30m",
                    "options": {"temperature": 0, "num_ctx": 4096, "num_predict": 250},
                }
                single_result = requests.post("http://127.0.0.1:11434/api/chat", json=single_payload, timeout=600)
                if not single_result.ok:
                    raise RuntimeError(f"Private model error: {single_result.text}")
                cheque = json.loads(single_result.json()["message"]["content"])
                if str(cheque.get("amount", "")).strip() or str(cheque.get("amount_words", "")).strip():
                    individual.append(cheque)
            parsed = {
                "booking_fee": "",
                "booking_fee_text": "",
                "sale_date": "",
                "payment_method": "cheque",
                "payment_reference": "",
                "cheque_amounts": ",".join(str(item.get("amount", "")) for item in individual),
                "cheque_amount_words": "|".join(str(item.get("amount_words", "")) for item in individual),
                "cheque_dates": ",".join(str(item.get("date", "")) for item in individual),
                "cheque_references": ",".join(str(item.get("reference", "")) for item in individual),
            }
        else:
            payload = {
            "model": os.getenv("BOOKING_OCR_MODEL", "qwen2.5vl:3b"),
            "messages": [{
                "role": "user",
                "content": (
                    "Read every supplied page of this booking-fee payment file privately. The file may "
                    "contain more than one cheque, including two cheques stacked on a single page. Treat "
                    "each supplied image as a possible separate cheque and ignore blank images. Return every "
                    "distinct numeric cheque amount in cheque_amounts separated by commas, the corresponding "
                    "written amount-in-words line in cheque_amount_words separated by vertical bars, every boxed cheque "
                    "date in cheque_dates separated by commas, and every six-digit MICR number in "
                    "cheque_references separated by commas, in matching order. Do not omit a smaller cheque because another cheque "
                    "has a much larger amount. Add all distinct cheque amounts together and return the total "
                    "amount actually paid as booking_fee (digits and decimals only, without "
                    "currency symbols or commas), and also copy the exact printed or written "
                    "amount into booking_fee_text including all commas, decimals, and any K suffix. "
                    "For example, MYR 200,000.00 must be booking_fee 200000.00. K means thousand: "
                    "RM200K or 200 K must be returned as booking_fee 200000, never 200. "
                    "For a cheque, read the date only from the small boxes explicitly labelled DATE "
                    "on the cheque. Convert a two-digit year such as 26 to 2026 and return YYYY-MM-DD. "
                    "Never derive the date from an account number, company registration number, MICR "
                    "line, cheque number, or filename. payment_method must be exactly cheque. Read the "
                    "six-digit cheque number from each MICR line as payment_reference, preserving leading "
                    "zeroes and separating multiple cheque numbers with commas. If all cheques show the "
                    "same date, return that date. For a non-cheque receipt, use its explicitly labelled transaction date, "
                    "payment_method as exactly bank_transfer, and its transaction/receipt number as "
                    "payment_reference. Do not use the property purchase price, account balance or unrelated amounts. Return an empty "
                    "string for anything not clearly shown. Return only the requested JSON."
                ),
                "images": images,
            }],
            "format": BOOKING_FEE_SCHEMA,
            "stream": False,
            "keep_alive": "30m",
            "options": {"temperature": 0, "num_ctx": 6144, "num_predict": 900},
        }
            result = requests.post("http://127.0.0.1:11434/api/chat", json=payload, timeout=600)
            if not result.ok:
                raise RuntimeError(f"Private model error: {result.text}")
            parsed = json.loads(result.json()["message"]["content"])
        fields = {
            name: str(parsed.get(name, "") or "").strip()
            for name in ("booking_fee", "sale_date", "payment_method", "payment_reference")
        }
        cheque_amount_values = [part.strip() for part in re.split(r"[,;|]", str(parsed.get("cheque_amounts", ""))) if part.strip()]
        cheque_word_values = [part.strip() for part in str(parsed.get("cheque_amount_words", "")).split("|") if part.strip()]
        cheque_date_values = [part.strip() for part in re.split(r"[,;|]", str(parsed.get("cheque_dates", ""))) if part.strip()]
        cheque_reference_values = [part.strip() for part in re.split(r"[,;|]", str(parsed.get("cheque_references", ""))) if part.strip()]
        cheque_amounts = []
        cheque_dates = []
        cheque_references = []
        word_amounts = [amount_from_words(value) for value in cheque_word_values]
        word_amounts = [float(value) for value in word_amounts if value is not None]
        if len(word_amounts) > len(images):
            word_amounts = list(dict.fromkeys(word_amounts))
        for index, value in enumerate(cheque_amount_values):
            normalized_amount = normalize_booking_fee(value, value)
            try:
                numeric_amount = float(normalized_amount)
                words_amount = amount_from_words(cheque_word_values[index]) if index < len(cheque_word_values) else None
                cheque_amounts.append(float(words_amount) if words_amount and abs(words_amount - numeric_amount) > 0.009 else numeric_amount)
            except (TypeError, ValueError):
                pass
        # Written words are the safer source when the scan clearly contains
        # multiple cheques: handwriting OCR can add a zero to a boxed amount.
        if word_amounts and (len(word_amounts) == len(cheque_amount_values) or len(word_amounts) >= 2):
            cheque_amounts = word_amounts
        for value in cheque_date_values:
            normalized_date = normalize_payment_date(value)
            if normalized_date:
                cheque_dates.append(normalized_date)
        for index, value in enumerate(cheque_reference_values):
            normalized_reference = normalize_cheque_reference(
                value, cheque_dates[index] if index < len(cheque_dates) else "", ""
            )
            if normalized_reference and normalized_reference not in cheque_references:
                cheque_references.append(normalized_reference)
        if cheque_amounts:
            fields["booking_fee"] = f"{sum(cheque_amounts):.2f}"
            fields["payment_method"] = "cheque"
            fields["sale_date"] = max(cheque_dates) if cheque_dates else ""
            fields["payment_reference"] = ", ".join(cheque_references)
        else:
            fields["booking_fee"] = normalize_booking_fee(
                fields["booking_fee"], parsed.get("booking_fee_text", "")
            )
            fields["sale_date"] = normalize_payment_date(fields["sale_date"])
        if fields["payment_method"].strip().lower() == "cheque" and not cheque_amounts:
            fields["payment_method"] = "cheque"
            fields["payment_reference"] = normalize_cheque_reference(
                fields["payment_reference"], fields["sale_date"], file.filename or ""
            )
        folder = unit_folder(unit_number)
        suffix = Path(file.filename or "receipt.pdf").suffix or ".pdf"
        path = folder / f"Booking_Fee_{safe_part(unit_number, 'Unidentified')}{suffix}"
        path.write_bytes(data)
        return {"fields": fields, "warnings": [], "saved_path": str(path)}
    except requests.ConnectionError as error:
        raise HTTPException(status_code=503, detail="The private handwriting model is not running.") from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"The booking-fee receipt could not be read: {error}") from error


@app.post("/extract-pop-admin")
async def extract_pop_admin(
    file: UploadFile = File(...),
    unit_number: str = Form(""),
):
    data = await file.read()
    if len(data) > 20_000_000:
        raise HTTPException(status_code=400, detail="Please upload a POP Form smaller than 20 MB.")
    filename = str(file.filename or "").lower()
    is_pdf = file.content_type == "application/pdf" or filename.endswith(".pdf")
    is_image = str(file.content_type or "").startswith("image/") or filename.endswith(
        (".png", ".jpg", ".jpeg", ".webp")
    )
    if not is_pdf and not is_image:
        raise HTTPException(status_code=400, detail="Please select a PDF, PNG, JPG or WebP POP Form.")
    try:
        if is_pdf:
            pop = fitz.open(stream=data, filetype="pdf")
            if not pop.page_count:
                raise ValueError("The POP Form PDF has no pages.")
            page_indexes = [0] if pop.page_count == 1 else [0, pop.page_count - 1]
            images = [pop_admin_section(pop[index]) for index in page_indexes]
        else:
            images = [base64.b64encode(data).decode("ascii")]
        payload = {
            "model": os.getenv("BOOKING_OCR_MODEL", "qwen2.5vl:3b"),
            "messages": [{
                "role": "user",
                "content": (
                    "Read this AIRA Prospect Offer Proposal (POP) Form privately. Extract the purchaser name, purchaser type, project, unit or parcel number, purchase or SPA price, proposal date, "
                    "the POP or proposal reference as sale_reference; the sales personnel or "
                    "salesperson name; designation; mobile or telephone number; email; and sales "
                    "agency or company. The value beside the printed label 'Team Member Assisting' "
                    "is always salesperson_name. Do not use the person shown in the 'Introduction "
                    "By: AGENT' row as salesperson_name; that row is the external introducer. When "
                    "the AGENT row contains a person followed by a company, use only the company "
                    "portion as agent_company. If the AGENT row is blank, look elsewhere on the "
                    "form for an explicitly printed sales agency, realty or company name and use "
                    "that as agent_company. Extract a clearly printed agency/company mailing address "
                    "as agent_address. Never infer a company or address from an email domain, logo style "
                    "or person's name. Preserve spelling, numbers and email exactly. Do not "
                    "use purchaser details as salesperson details. Return purchase_price as digits only without RM or commas, use DD/MM/YYYY for sale_date, and preserve the unit number in uppercase. Return an empty string for any "
                    "field that is not clearly shown. Return only the requested JSON."
                ),
                "images": images,
            }],
            "format": POP_ADMIN_SCHEMA,
            "stream": False,
            "keep_alive": "30m",
            "options": {"temperature": 0, "num_ctx": 4096, "num_predict": 300},
        }
        response = requests.post("http://127.0.0.1:11434/api/chat", json=payload, timeout=600)
        if not response.ok:
            raise RuntimeError(f"Private model error: {response.text}")
        parsed = json.loads(response.json()["message"]["content"])
        fields = {name: str(parsed.get(name, "") or "").strip() for name in POP_ADMIN_FIELDS}
        fields["agent_company"] = normalize_agent_company(fields["agent_company"])
        folder = unit_folder(unit_number)
        suffix = Path(file.filename or "pop-form.pdf").suffix or ".pdf"
        path = folder / f"POP_Form_{safe_part(unit_number, 'Unidentified')}{suffix}"
        path.write_bytes(data)
        return {"fields": fields, "warnings": [], "saved_path": str(path)}
    except requests.ConnectionError as error:
        raise HTTPException(status_code=503, detail="The private handwriting model is not running.") from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"The POP Form could not be read: {error}") from error


@app.post("/extract-namecard-admin")
async def extract_namecard_admin(
    file: UploadFile = File(...),
    unit_number: str = Form(""),
    expected_company: str = Form(""),
):
    data = await file.read()
    if len(data) > 20_000_000:
        raise HTTPException(status_code=400, detail="Please upload a namecard smaller than 20 MB.")
    filename = str(file.filename or "").lower()
    is_pdf = file.content_type == "application/pdf" or filename.endswith(".pdf")
    is_image = str(file.content_type or "").startswith("image/") or filename.endswith(
        (".png", ".jpg", ".jpeg", ".webp")
    )
    if not is_pdf and not is_image:
        raise HTTPException(status_code=400, detail="Please select a PDF, PNG, JPG or WebP namecard.")
    try:
        if is_pdf:
            card = fitz.open(stream=data, filetype="pdf")
            if not card.page_count:
                raise ValueError("The namecard PDF has no pages.")
            images = [page_png(card[0], zoom=2.0)]
        else:
            images = [base64.b64encode(data).decode("ascii")]
        company_rule = (
            f'The POP states the agency/company as "{expected_company}". '
            "If the image contains several namecards, select ONLY the single card whose printed "
            "company matches that agency/company (including a clear abbreviation). Never combine a "
            "person from one card with the company or address from another card. If no matching card "
            "is visible, return empty strings for every field. "
            if expected_company.strip() else
            "If the image contains several namecards, extract only one internally consistent card and "
            "never combine a person from one card with the company or address from another card. "
        )
        payload = {
            "model": os.getenv("BOOKING_OCR_MODEL", "qwen2.5vl:3b"),
            "messages": [{
                "role": "user",
                "content": (
                    "Read this real-estate agent namecard privately. " + company_rule +
                    "Extract the person's name as "
                    "agent_name, job title as agent_designation, mobile or telephone "
                    "number as agent_mobile, email as agent_email, and the printed "
                    "agency or company name as agent_company and its printed mailing address as "
                    "agent_address. Only return agent_company or agent_address when that detail is "
                    "visibly printed on the card; do not infer it from the "
                    "email domain, logo style, person's name, or other context. Leave "
                    "Preserve spelling, capitalization, phone numbers and "
                    "email exactly. Return an empty string for anything not clearly shown. Return "
                    "only the requested JSON."
                ),
                "images": images,
            }],
            "format": AGENT_CARD_SCHEMA,
            "stream": False,
            "keep_alive": "30m",
            "options": {"temperature": 0, "num_ctx": 4096, "num_predict": 300},
        }
        response = requests.post("http://127.0.0.1:11434/api/chat", json=payload, timeout=600)
        if not response.ok:
            raise RuntimeError(f"Private model error: {response.text}")
        parsed = json.loads(response.json()["message"]["content"])
        fields = {name: str(parsed.get(name, "") or "").strip() for name in AGENT_CARD_FIELDS}
        folder = unit_folder(unit_number)
        suffix = Path(file.filename or "namecard.jpg").suffix or ".jpg"
        path = folder / f"Namecard_{safe_part(unit_number, 'Unidentified')}{suffix}"
        path.write_bytes(data)
        return {"fields": fields, "warnings": [], "saved_path": str(path)}
    except requests.ConnectionError as error:
        raise HTTPException(status_code=503, detail="The private handwriting model is not running.") from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"The namecard could not be read: {error}") from error


@app.post("/extract")
async def extract(file: UploadFile = File(...)):
    is_pdf = file.content_type == "application/pdf" or str(file.filename or "").lower().endswith(".pdf")
    if not is_pdf:
        raise HTTPException(status_code=400, detail="Please select a PDF Booking Form.")
    data = await file.read()
    if len(data) > 20_000_000:
        raise HTTPException(status_code=400, detail="Please upload a PDF smaller than 20 MB.")
    try:
        cached = cached_extraction(data)
        if cached:
            fields = cached["fields"]
            warnings = cached["warnings"]
            unit = safe_part(fields.get("unit_number", ""), "") or f"Unidentified_{datetime.now():%Y%m%d-%H%M%S}"
            output_dir = unit_folder(unit)
            saved = output_dir / f"Booking_{unit}.pdf"
            saved.write_bytes(data)
            return {"fields": fields, "warnings": warnings, "saved_path": str(saved), "cached": True}
        pdf = fitz.open(stream=data, filetype="pdf")
        if not pdf.page_count:
            raise ValueError("The PDF has no pages.")
        # The approved Booking Form appendix is page 5. Supporting documents,
        # such as parking plans and acknowledgements, may be appended after it.
        # Reading the physical final PDF page would therefore miss every
        # purchaser and property field in those combined files. Shorter legacy
        # forms still fall back to their final page.
        appendix_index = 4 if pdf.page_count >= 5 else pdf.page_count - 1
        if pdf.page_count >= 5:
            images = [
                booking_cover_section(pdf[0]),
                appendix_property_section(pdf[appendix_index]),
                appendix_purchaser_section(pdf[appendix_index]),
            ]
        else:
            images = page_sections(pdf[appendix_index], 1.7)
        payload = {
            "model": os.getenv("BOOKING_OCR_MODEL", "qwen2.5vl:3b"),
            "messages": [{"role": "user", "content": PROMPT, "images": images}],
            "format": SCHEMA,
            "stream": False,
            "keep_alive": "30m",
            "options": {"temperature": 0, "num_ctx": 6144, "num_predict": 1800},
        }
        parsed = structured_model_response(payload, timeout=900, retry_num_predict=2600)
        source = parsed.get("fields", {})
        fields = {name: str(source.get(name, "") or "").strip() for name in FIELD_NAMES}
        warnings = [str(item) for item in parsed.get("warnings", []) if str(item).strip()]
        # Price is too important to accept from the broad whole-form reading.
        # Verify only the actual Purchase Price row. A blank box must remain
        # blank; it must never inherit a previous sale or a model guess.
        if pdf.page_count >= 5:
            broad_price = fields.get("purchase_price", "")
            price_payload = {
                "model": os.getenv("BOOKING_OCR_MODEL", "qwen2.5vl:3b"),
                "messages": [{
                    "role": "user",
                    "content": (
                        "Inspect only the handwritten entry box beside the printed label "
                        "'Purchase Price' in this Property Details table. Set is_filled to true "
                        "only when digits are visibly written inside that exact box. If the box "
                        "is blank, crossed out, unreadable, or the number appears elsewhere, set "
                        "is_filled to false and purchase_price to an empty string. Do not infer, "
                        "calculate, copy a prior example, or use printed text. When filled, return "
                        "digits only without RM or commas. Return only the requested JSON."
                    ),
                    "images": [appendix_property_section(pdf[appendix_index])],
                }],
                "format": PRICE_SCHEMA,
                "stream": False,
                "keep_alive": "30m",
                "options": {"temperature": 0, "num_ctx": 3072, "num_predict": 100},
            }
            price_result = requests.post(
                "http://127.0.0.1:11434/api/chat", json=price_payload, timeout=300
            )
            verified_price = ""
            if price_result.ok:
                try:
                    price_check = json.loads(price_result.json()["message"]["content"])
                    if price_check.get("is_filled") is True:
                        verified_price = re.sub(
                            r"[^0-9.]", "", str(price_check.get("purchase_price", "") or "")
                        )
                except (KeyError, TypeError, ValueError):
                    verified_price = ""
            fields["purchase_price"] = verified_price
            if broad_price and not verified_price:
                warnings.append("Purchase Price was left blank because no value was verified in its labelled box.")
        if pdf.page_count >= 5 and fields.get("purchaser_type", "").strip().lower() == "company":
            director_payload = {
                "model": os.getenv("BOOKING_OCR_MODEL", "qwen2.5vl:3b"),
                "messages": [{
                    "role": "user",
                    "content": (
                        "Read only the handwritten company director line in this Purchaser's "
                        "Particulars table. It begins with DIRECTOR or DIRECTOR'S in the purchaser "
                        "name column. Return the complete person's name after that label as "
                        "director_name, plus the nationality and sex written across the same row. "
                        "Do not use the company name or the shorter Contact Person row. Return an "
                        "empty string only if the director line itself is absent. Return only JSON."
                    ),
                    "images": [appendix_purchaser_section(pdf[appendix_index])],
                }],
                "format": DIRECTOR_SCHEMA,
                "stream": False,
                "keep_alive": "30m",
                "options": {"temperature": 0, "num_ctx": 3072, "num_predict": 180},
            }
            director_result = requests.post(
                "http://127.0.0.1:11434/api/chat", json=director_payload, timeout=300
            )
            if director_result.ok:
                try:
                    director = json.loads(director_result.json()["message"]["content"])
                    director_name = str(director.get("director_name", "") or "").strip()
                    if director_name:
                        fields["contact_person"] = director_name
                    director_nationality = str(director.get("director_nationality", "") or "").strip()
                    director_sex = str(director.get("director_sex", "") or "").strip()
                    if director_nationality:
                        fields["customer_nationality"] = director_nationality
                    if director_sex:
                        fields["customer_sex"] = director_sex
                    fields["customer_occupation"] = "Company Director"
                except (KeyError, TypeError, ValueError):
                    warnings.append("The company director line could not be read automatically; review the director/contact fields.")
        fields = apply_inferred_salutations(fields)
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
        save_cached_extraction(data, fields, warnings)
        return {"fields": fields, "warnings": warnings, "saved_path": str(path), "cached": False}
    except requests.ConnectionError as error:
        raise HTTPException(status_code=503, detail="The private handwriting model is not running.") from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"The Booking Form could not be read: {error}") from error
