# Architecture

## Stack
Next.js 15 (App Router) · Supabase (Postgres) · Vercel.

## Build Sequence
**Now:** Sale entry → confirm → auto-generate 4 documents → preview.
**Next:** Dashboard, search/filter, PDF export, edit & re-generate.
**Later:** Auth + per-user isolation, activity log, version history.

## Key Action Flow
1. Admin clicks "New Sale", fills buyer + unit + pricing in one form
2. "Save Draft" → Sale persists as `draft`
3. "Confirm Sale" → status `confirmed`, system creates 4 Document records (one per type) with JSON snapshot of sale fields
4. Sale detail page → 4 documents listed → click to preview formatted letter
5. Mark documents "reviewed" individually

## Responsive Nav
Left sidebar (desktop): Sales, Documents, Dashboard. Hamburger on mobile. Current section highlighted.

## Layers
1. **Data:** `sales`, `documents` tables — source of truth
2. **Logic:** Server actions for confirm + generate (deterministic template mapping)
3. **Smart:** Completeness validation, derived-field calc (later)

Core runs without AI — document generation is pure template mapping.

## Repo Structure
```
app/{sales,documents,dashboard}/
components/{sales,documents,ui}/
lib/{data,actions,templates,ai}/
__tests__/
```

## Module Map
- **sales** — entry, list, confirm. Owns `sales` table. Built 1st.
- **documents** — generate, preview, review. Owns `documents` table. Built 2nd.
- **dashboard** — stats, search, export. Reads both tables. Built 3rd.
- **auth** — login, per-user RLS scoping. Built 4th.