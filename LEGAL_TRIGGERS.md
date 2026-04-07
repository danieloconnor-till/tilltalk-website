# TillTalk — Legal Change Triggers
## Any time one of these things changes, the T&Cs at src/app/terms/page.tsx and Privacy Policy at src/app/privacy/page.tsx must be reviewed and updated before the next deploy.

## Current T&Cs version: 4.1 | Last updated: April 2026
## Location: src/app/terms/page.tsx and src/app/privacy/page.tsx
## Solicitor review required before: major structural changes, new data categories, new sub-processors

---

### Trigger → Clauses affected

| What changed | Clauses to update |
|---|---|
| Pricing (amounts, plans, intervals) | Clause 11 — Trial and Billing |
| New POS integration added (e.g. Epos Now, Lightspeed) | Clause 6 — Third-Party Services + Clause 15 DPA sub-processors table |
| New sub-processor added (hosting, email, AI, payments, etc.) | Clause 15 DPA sub-processors table |
| Sub-processor removed or replaced | Clause 15 DPA sub-processors table |
| Company address changes | Header + Clause 17 |
| Company name, CRO, or VAT number changes | Header + Clause 1.1 + Clause 17 |
| New data collected or stored | Clause 14 — Data Retention + Clause 15 DPA categories |
| Data no longer collected or stored | Clause 14 + Clause 15 DPA categories |
| WhatsApp / Twilio policy changes | Clause 6 — Third-Party Services |
| New feature that affects data processing | Clause 10 (aggregated data) + Clause 15 DPA |
| AI model changed (e.g. away from Anthropic Claude) | Clause 3 — AI disclaimer + Clause 15 DPA sub-processors |
| Trial period length changes | Clause 11 — Trial and Billing |
| Cancellation/refund policy changes | Clause 11 — Trial and Billing |
| New geographic market (outside Ireland/EU) | Clause 15 international transfers + Clause 17 governing law |
| Insurance or legal structure changes | Clause 1 — Limitation of Liability |

---

### End of session checklist
At the end of every Claude Code session, check:
- Did any of the above triggers apply to work done this session?
- If yes: update src/app/terms/page.tsx and src/app/privacy/page.tsx accordingly
- Bump the version number and Last updated date in the T&Cs header
- Note the change in the Session Log in CLAUDE.md
