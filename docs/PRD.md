# Aira Internal Sales Management — PRD

## Problem
Sales team re-enters the same buyer and unit data into 4 separate Word/Excel documents for every confirmed sale. This causes repetitive entry, inconsistent information across documents, and errors that delay administration.

## Target User
Sales executives, sales admin, and PA at Aira who record confirmed property sales and prepare the required documentation.

## Core Objects
- **Sale** — one confirmed property transaction with all buyer, unit, pricing, loan, and rebate details entered once.
- **Document** — one of 4 standardized letter types (Pre-Booking Form, Acceptance Letter, HOVP Letter, Rebate Letter) auto-populated from a confirmed Sale.

## MVP (v1) — Must-Haves
- [ ] Sale entry form: capture buyer, unit, pricing, loan, rebate, salesperson, date in one screen
- [ ] Save sale as draft; confirm sale (draft → confirmed)
- [ ] On confirm: auto-generate 4 Document records from Sale data — no re-entry
- [ ] Document preview: render each letter type with formatted layout from stored Sale snapshot
- [ ] Sales list: view all sales with status badge (draft/confirmed)
- [ ] Per-sale document list: see all 4 generated documents, mark as reviewed
- [ ] Seed demo data so the app renders instantly without login

## Non-Goals (v1)
- Authentication / login wall (later sprint)
- Email sending or e-signature
- CRM pipeline or lead management
- Customer-facing portal
- PDF export via library (browser print-to-PDF works in v1)

## Success Criteria
A sales admin opens the app, clicks "New Sale", fills in buyer Tan Wei Ming's details and unit A-12-03 at Aira Heights with purchase price RM 850,000, clicks "Confirm Sale". The system immediately shows 4 documents — Pre-Booking Form, Acceptance Letter, HOVP Letter, Rebate Letter — each pre-filled with the exact same verified data, ready to review and print. No manual copy-paste between documents.