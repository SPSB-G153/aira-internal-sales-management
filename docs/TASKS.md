# Tasks

## Sprint 1 — Core Engine ⭐ v1 functional
**Goal:** Enter a sale, confirm, see 4 generated documents.
- [ ] Migration: `sales` + `documents` tables + seed data
- [ ] `lib/data/sales.ts`, `lib/data/documents.ts` — all DB reads/writes here
- [ ] Sale entry form (all fields) + validation
- [ ] Save draft → Confirm → generate 4 docs via template mapping
- [ ] `lib/templates/`: pre-booking, acceptance, hovp, rebate
- [ ] Sales list (status badges) + sale detail (4 docs shown)
- [ ] Sidebar nav (Sales, Documents, Dashboard) + mobile hamburger
- [ ] Empty/loading/error states on all pages

**DoD:** Admin enters a sale, clicks Confirm, sees 4 documents populated with entered data. No login required.

## Sprint 2 — Document Preview & Review
- [ ] Formatted letter preview per document type
- [ ] Status toggle: pending → generated → reviewed
- [ ] Edit draft sale → re-confirm regenerates docs
- [ ] Print-friendly CSS per document type
- [ ] Cross-sale documents list page

**DoD:** Open any document → see formatted letter → print → mark reviewed.

## Sprint 3 — Dashboard & Export
- [ ] Dashboard: counts, recent sales, status breakdown
- [ ] Search by customer/project/reference; filter by status
- [ ] PDF export (print-to-PDF)
- [ ] Activity log (status changes with timestamps)

**DoD:** Dashboard counts correct. Search finds sale. Export produces PDF.

## Sprint 4 — Lock It Down
- [ ] Supabase Auth (login/signup)
- [ ] Set user_id on create; owner-scoped RLS policies
- [ ] Login wall for app; seed data tagged to demo user
- [ ] Two users see only their own sales

**DoD:** Logged-in users see own data only. Unauthenticated → login page.

## Gantt
`S1: Core Engine (v1) | S2: Preview | S3: Dashboard | S4: Lock Down`