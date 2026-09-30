# Security

## Secret Handling
- Supabase URL + anon key + service role key in Vercel env vars only
- Service role key server-side only (server actions, never client)
- Anon key safe for client — RLS protects data
- No secrets in frontend code, committed env files, or build output

## Permission Model
- **v1 (demo):** Permissive RLS — all rows readable/writable. No login required. Intentional for demo + development.
- **Lock-down sprint:** Replace with owner-scoped policies:
  - `select using (auth.uid() = user_id)`
  - `insert/update with check (auth.uid() = user_id)`
  - Documents inherit owner from parent sale via join
- All users are internal sales/admin/PA — no external customers

## Approved-Tools Rule
- Agent may only call named tools: `confirmSale`, `generateDocuments`, `markDocumentReviewed`
- Never raw SQL execution, never arbitrary API calls
- Tool list hardcoded in server actions — not dynamically extensible

## Audit Principle
- Every status change persists with a timestamp
- Document content is a JSON snapshot — point-in-time record of each letter
- Later: dedicated audit table capturing actor, action, before/after

## Data Loss Risk
- Deleting a confirmed sale cascades to documents — human-only, no bulk delete in v1
- No soft-delete in v1; plan says: stop and get a human before implementing cascading deletes in production