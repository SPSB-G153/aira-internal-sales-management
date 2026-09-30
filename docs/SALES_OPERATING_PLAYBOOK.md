# Aira Sales Operating Playbook

## Purpose

This playbook governs the path from a newly captured property sale to an audit-ready document pack. The sale record is the single source of truth; letters are generated snapshots and must never be maintained as separate data sources.

## Process

| Stage | Accountable role | Entry condition | Exit evidence | Service level |
|---|---|---|---|---|
| Capture | Sales executive | Buyer intends to proceed | Buyer, property, price and salesperson recorded in a draft | Same working day |
| Verify | Sales admin | Draft contains the core commercial facts | Identity, contact, unit, financing and rebate checked | Within 1 working day |
| Confirm | Admin or manager | Verification completed | Sale confirmed and all four document snapshots generated | After verification |
| Review | Sales admin or PA | Four documents exist | Every document opened and marked reviewed | Within 1 working day |
| Complete | Sales admin | Review finished and score is at least 90 | Audit-ready pack with no blocking exception | Before handover |

## Governance controls

1. **Single source:** Correct the sale record first. Regenerate documents from that record rather than retyping values.
2. **Maker-checker:** The person entering the sale should not be its only document reviewer.
3. **Minimum evidence:** Identity, buyer contact, unit, salesperson and sale date are expected before completion.
4. **Financial guardrails:** Loan and rebate values must not exceed the purchase price. Derived percentages must remain plausible.
5. **Document completeness:** Every confirmed sale requires one Pre-Booking Form, Acceptance Letter, HOVP Letter and Rebate Letter.
6. **Exception escalation:** A score below 75, missing document, or financial exception must be corrected or escalated to a manager.

## Scoring model

The application calculates a transparent 100-point score every time a sale is viewed. The score is derived from stored data and document status; it is not an AI prediction.

| Dimension | Weight | What earns points |
|---|---:|---|
| Data quality | 40 | Identity, contact, address, unit, unit type, floor area, salesperson and sale date |
| Financial integrity | 25 | Valid price and SPA value, loan and rebate within price, plausible percentages |
| Document control | 25 | Confirmed status, four unique generated documents, four reviewed documents |
| Governance | 10 | Reference, accountable salesperson, sale date and no financial exception |

### Decision bands

- **90–100 — Strong:** Proceed to final review or archive.
- **75–89 — Watch:** Continue work, but close listed gaps before completion.
- **Below 75 — Escalate:** Do not treat the file as complete; correct or escalate exceptions.

## Daily operating rhythm

1. Open **Process & scoring** and work from the lowest scores upward.
2. Follow the displayed next action for each transaction.
3. Clear financial exceptions before confirming a sale.
4. Review all four documents before declaring the file complete.
5. Managers review the exception queue and unresolved files below 75.

## Audit evidence

The sale reference, assigned salesperson, timestamps, confirmed status, immutable document snapshots, and reviewed statuses form the minimum evidence set. Team membership and role controls determine workspace access; production teams should not use the public demo workspace for real customer data.
