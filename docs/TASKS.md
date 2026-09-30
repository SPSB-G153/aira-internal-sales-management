# Tasks

## Sprint 1 — Core Engine ⭐ v1 functional
**Goal:** Enter a sale, confirm, see 4 generated documents.
- [x] Migration: `sales` + `documents` tables + seed data
- [x] `lib/data/sales.ts`, `lib/data/documents.ts` — all DB reads/writes here
- [x] Sale entry form (all fields) + validation
- [x] Save draft → Confirm → generate 4 docs via template mapping
- [x] `lib/templates/`: pre-booking, acceptance, hovp, rebate
- [x] Sales list (status badges) + sale detail (4 docs shown)
- [x] Sidebar nav (Sales, Documents, Dashboard) + mobile hamburger
- [x] Empty/loading/error states on all pages

**DoD:** Admin enters a sale, clicks Confirm, sees 4 documents populated with entered data. No login required.

## Sprint 2 — Document Preview & Review
- [x] Formatted letter preview per document type
- [x] Status toggle: pending → generated → reviewed
- [x] Edit draft sale → re-confirm regenerates docs
- [x] Print-friendly CSS per document type
- [x] Cross-sale documents list page

**DoD:** Open any document → see formatted letter → print → mark reviewed.

## Sprint 3 — Dashboard & Export
- [x] Dashboard: counts, recent sales, status breakdown
- [x] Search by customer/project/reference; filter by status
- [x] PDF export (print-to-PDF)
- [x] Activity log (status changes with timestamps)

**DoD:** Dashboard counts correct. Search finds sale. Export produces PDF.

## Sprint 4 — Lock It Down
- [ ] Supabase Auth (login/signup)
- [ ] Set user_id on create; owner-scoped RLS policies
- [ ] Login wall for app; seed data tagged to demo user
- [ ] Two users see only their own sales

**DoD:** Logged-in users see own data only. Unauthenticated → login page.

## Gantt
`S1: Core Engine (v1) | S2: Preview | S3: Dashboard | S4: Lock Down`
