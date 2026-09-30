# Data Model

## sales
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| user_id | uuid | nullable (owner-scoping later) |
| sale_reference | text | unique, e.g. "S-2025-001" |
| customer_name | text | required |
| customer_ic | text | ID/passport no. |
| customer_address | text | |
| customer_phone | text | |
| customer_email | text | |
| project_name | text | e.g. "Aira Heights" |
| unit_number | text | |
| unit_type | text | |
| floor_area | numeric | sq ft |
| purchase_price | numeric | required, RM |
| booking_fee | numeric | RM |
| spa_value | numeric | SPA contract value |
| loan_amount | numeric | RM |
| loan_percentage | numeric | % |
| rebate_amount | numeric | RM |
| rebate_percentage | numeric | % |
| salesperson_name | text | |
| sale_date | date | |
| status | text | `draft` → `confirmed` |
| created_at | timestamptz | default now() |

## documents
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| user_id | uuid | nullable (owner-scoping later) |
| sale_id | uuid | FK→sales |
| document_type | text | `pre_booking_form` / `acceptance_letter` / `hovp_letter` / `rebate_letter` |
| content | jsonb | snapshot of sale fields used to render this letter |
| status | text | `pending` → `generated` → `reviewed` |
| generated_at | timestamptz | |
| created_at | timestamptz | default now() |

## Relationships
- One sale → 4 documents (created on confirm, one per type)
- Unique constraint: (sale_id, document_type) — no duplicate document types per sale

## RLS (v1)
Permissive policies — all reads/writes open for demo. Lock-down sprint replaces with `auth.uid() = user_id` owner policies.

## No AI-Generated Fields in v1
All fields are user-entered. Derived fields (loan_percentage, rebate_percentage) calculated server-side. Later: AI-suggested salesperson, IC format validation — these would add source + confidence + review_status columns.