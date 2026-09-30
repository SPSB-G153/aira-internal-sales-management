# Test Plan

## Success Scenario (v1)
1. Open app → Sales list → see 4 seeded sales (3 confirmed, 1 draft)
2. Click "New Sale" → form renders with all fields
3. Fill: customer_name "Test Buyer", project_name "Aira Heights", unit_number "E-01-01", purchase_price 500000, booking_fee 5000
4. Click "Save Draft" → sale appears in list with "Draft" badge
5. Open the draft → click "Confirm Sale" → status changes to "Confirmed"
6. Sale detail page shows 4 documents: Pre-Booking, Acceptance, HOVP, Rebate
7. Click each document → preview shows correct entered data
8. Click "Mark Reviewed" → status changes to "Reviewed"

## Empty State
- No sales → "No sales yet. Create your first sale." with CTA button
- Sale with no documents → "No documents generated yet"

## Error Cases
- Submit without customer_name or purchase_price → inline validation errors, no submit
- Confirm with missing optional fields (IC, email) → allowed with warning, docs still generate
- Network error on confirm → "Failed to confirm sale. Please try again." + retry button

## Loading States
- Sales list skeleton while fetching
- Confirm button disabled + spinner while generating

## Seed Data Verification
- 4 sales visible on first load (no login)
- Sale S-2025-001 shows 4 generated documents
- Sale S-2025-003 shows "Draft" status, no documents