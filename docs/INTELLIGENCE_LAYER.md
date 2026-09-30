# Intelligence Layer

## Messy Inputs
Sales admin enters buyer details, unit info, and pricing by hand from a physical booking form. Fields may be incomplete (missing IC, missing loan amount).

## Auto-Structure
On save, system validates required fields and calculates derived values:
```json
{
  "completeness": { "value": 85, "source": "rule", "confidence": 1.0, "review_status": "unreviewed" },
  "missing_fields": ["customer_email", "floor_area"],
  "derived": {
    "loan_percentage": { "value": 80, "source": "calc:loan_amount/purchase_price*100", "confidence": 1.0 },
    "rebate_percentage": { "value": 5, "source": "calc:rebate_amount/purchase_price*100", "confidence": 1.0 }
  }
}
```

## Events to Track
- `sale_created` — draft saved
- `sale_confirmed` — status → confirmed, 4 docs generated
- `document_generated` — per document type
- `document_reviewed` — admin marks reviewed

## Scoring Rules (v1, rule-based)
- **Completeness %** = filled required fields ÷ total required × 100
- **Consistency flag** = loan_percentage ≠ round(loan_amount/purchase_price × 100) → flag
- **Document readiness** = all 4 documents status `generated` → sale is ready

## What Gets Ranked
- Sales list: drafts first (needs action), then confirmed by sale_date desc
- Documents within a sale: ordered Pre-Booking → Acceptance → HOVP → Rebate

## v1 vs Later
**v1:** Rule-based validation + derived field calculation + completeness %. All deterministic.
**Later:** IC format validation, auto-suggest salesperson from history, pricing anomaly detection.