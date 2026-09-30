# Agentic Layer

## Low (auto) — v1
- **Generate documents:** On sale confirm, system auto-creates 4 Document records from template mapping. Deterministic, no approval needed.
- **Calculate derived fields:** loan_percentage, rebate_percentage computed on save.

## Medium (light approval) — v1
- **Confirm sale:** Admin clicks "Confirm Sale" — changes draft → confirmed and triggers document generation. Requires explicit user action.
- **Mark document reviewed:** Admin marks individual documents as reviewed. Single click.

## High (approval required) — Next
- **Re-generate documents:** After editing a confirmed sale, all 4 documents regenerate. Requires admin confirmation to overwrite.

## Critical (human-only) — Always
- **Delete sale:** Permanently removes sale + documents. Human-only, no automation.
- **Delete document:** Permanently removes a document record. Human-only.

## Named Tools (v1)
- `generateDocuments(saleId)` — reads sale, maps fields to 4 templates, inserts document records
- `confirmSale(saleId)` — sets status confirmed, calls generateDocuments
- `markDocumentReviewed(docId)` — sets document status reviewed

## Audit Log (v1)
Status fields + timestamps: `created_at`, `generated_at`, `status`. Later: dedicated `audit_logs` table with action, actor, before/after JSON.

## v1 vs Later
**v1:** Confirm → generate (low), mark reviewed (medium). No scheduled or background actions.
**Later:** Email document links, scheduled reminders for unreviewed documents.