# Aira document workflow

The generated sales pack follows this order:

1. **Aira Booking Form** — captures the purchaser offer, property particulars, pricing and consent.
2. **Notice of Acceptance** — records Selangor Properties' acceptance and the 14-day signing action.
3. **Rebate Letter** — confirms the approved rebate and how it is offset after signing and deposit payment.

## Source mapping

| Source document | Application template | Main mapped information |
| --- | --- | --- |
| `6.9.2026 - Aira Booking Form.docx` | Aira Booking Form | Purchasers, TIN, nationality, sex/race, Bumiputera status, occupation, contacts, parcel/storey/type/area, parking, price and deposits |
| `A-01-01 AIRA - Notice of Acceptance.docx` | Notice of Acceptance | Project/property, vendor, proprietor, purchaser, price, agent, balance deposit, signing deadline, signatory and solicitor copy |
| `A-01-01 AIRA - Rebate Letter 08.01.24.docx` | Rebate Letter | Unit, purchaser, approved rebate, offset conditions and authorised signatory |

The application uses only the uploaded source documents for structure and wording. Sample purchaser names, identity numbers, addresses and signatures are not copied into the database. Every generated document is populated from the team's verified sale record, stored as a point-in-time snapshot, and has a Print / Save PDF action.
