# Research Master

**Owner:** Product team  
**Last updated:** April 2026  
**Key source files:** `docs/product/` folder — all product strategy, PRD, and market research docs

---

## Purpose

Single canonical research document that combines all active research streams.

This file is the primary place for cross-domain research synthesis, priorities,
and decision context. Supporting research files remain as domain appendices.

## What Is Combined Here

- Product and market strategy research
- User pain-point and competitor analysis
- Domain-platform architecture and product composition strategy
- Invoice and GST compliance research
- Inventory and retail operations research
- Mobile parity and store readiness research
- Production and launch readiness research

## Combined Research Snapshot

### Product and Market

- Billing speed, low-friction UX, and reliability are the strongest adoption drivers.
- Network instability risk remains high for broad SME coverage and retention.
- Differentiation is strongest where voice workflow, operational trust, and parity converge.
- Architecture direction is now anchored on a domain-first modular platform with products composed by configuration rather than feature-sprawl modules.
- Retail billing research adds strong demand for party-wise pricing, retail/wholesale pricing, bulk item operations, multi-device sync, and mobile-first operator access.

### Invoice and GST

- Core compliance base exists, but advanced parity and edge-case handling remain active.
- Invoice UX standardization and operator clarity are recurring high-value requirements.
- External research now confirms e-invoicing needs distinct workflow handling for IRP submission, IRN, QR, eligibility, cancellation window, and audit traceability.

### Inventory and Retail

- Competitor research maps directly to sprint plans for inventory workflow quality.
- Bulk operations, discoverability, and scale behavior are critical for real shop usage.
- Inventory research also confirms the need for reservations, transfer-ledger thinking, multi-store operations, and role-specific stock workflows.
- Retail billing research also reinforces barcode-first checkout, low-stock automation, catalog bulk maintenance, and hardware-linked store workflows.

### OCR and Procurement Automation

- OCR is best treated as a staged purchase and expense ingestion workflow, not as a generic utility.
- Review/correction before posting and document attachment after posting are essential workflow requirements.

### Mobile and Parity

- Mobile implementation progress is strong, but final parity and release hardening continue.
- Store compliance work is mostly procedural, with clear pre-submit checklists.
- Retail positioning in the market assumes real-time access to billing, inventory, and expense visibility from mobile as a default operator workflow.

### Production and Launch

- Launch and readiness documents identify fixed blockers and remaining hardening tasks.
- Production strategy emphasizes low-risk rollout and explicit rollback patterns.

### Swipe Benchmark (External)

- Public Swipe positioning emphasizes very fast GST invoice creation, template variety, and payment collection via WhatsApp and other channels.
- Strongly marketed capabilities include inventory, reports, e-invoice, e-way bill, batch and expiry, barcode flows, and integrations.
- Pricing and packaging communicate feature gates clearly across plans, including advanced capabilities (warehouses, integrations, multi-branch, recurring).
- Public app listing highlights breadth (billing, inventory, reports, GST operations) and also surfaces support-quality sensitivity in user reviews.

## Consolidated Research Domains

| Domain            | Primary Docs                                                                                                                              | Combined Outcome                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Product strategy  | PRODUCT_STRATEGY_2026.md, STRATEGY_2026.md, PRODUCT_REQUIREMENTS.md                                                                       | Market fit priorities + built/pending alignment |
| Invoice/GST       | INVOICE_GST_COMPLIANCE_AUDIT.md, INVOICE_REQUIREMENTS.md                                                                                  | Compliance gaps + implementation queue          |
| Inventory/retail  | INVENTORY_STOCK_RESEARCH.md, INVENTORY_SPRINT_PLAN.md, KIRANA_RETAIL_AUDIT.md                                                             | Retail workflow roadmap and readiness           |
| Mobile parity     | MOBILE_APP_PLAN.md, REACT_NATIVE_SPRINT_PLAN.md, MOBILE_WEB_PARITY_SPRINT.md, MOBILE_STORE_COMPLIANCE.md                                  | Parity closure + app-store readiness            |
| Operations/launch | PRODUCTION_READINESS_SOP.md, production/PRODUCTION_STRATEGY.md, LAUNCH_CHECKLIST.md, MONITORING_DASHBOARD_PLAN.md, PAGES_COMPLETE_PLAN.md | Go-live controls + reliability posture          |

## Unified Priority Queue

1. Close mobile-web parity items still marked partial or pending.
2. Complete pending invoice and GST checklist items from compliance docs.
3. Finish production hardening controls before broad rollout.
4. Validate critical assumptions through structured merchant feedback.
5. Track Swipe parity items in billing, inventory, and GST workflows where your strategy docs mark competitive gaps.

## Documentation Reduction Model

- This file is canonical for research-level decisions and priorities.
- Related research files are retained as detailed appendices.
- New cross-domain planning updates must be written here first.
- Appendix docs should not duplicate master summaries.

## Maintenance Workflow

1. Update appendix source doc where detailed change is made.
2. Update the related domain section in this master file.
3. Sync task status into TASKS_COMPLETED.md or TASKS_PENDING.md.

## Active Appendix Sources

- INVENTORY_STOCK_RESEARCH.md
- INVENTORY_SPRINT_PLAN.md
- INVOICE_GST_COMPLIANCE_AUDIT.md
- INVOICE_REQUIREMENTS.md
- KIRANA_RETAIL_AUDIT.md
- PRODUCT_REQUIREMENTS.md
- DOMAIN_PLATFORM_PRD.md
- PRODUCT_STRATEGY_2026.md
- STRATEGY_2026.md
- MOBILE_APP_PLAN.md
- REACT_NATIVE_SPRINT_PLAN.md
- MOBILE_WEB_PARITY_SPRINT.md
- MOBILE_STORE_COMPLIANCE.md
- PRODUCTION_READINESS_SOP.md
- production/PRODUCTION_STRATEGY.md
- LAUNCH_CHECKLIST.md
- MONITORING_DASHBOARD_PLAN.md
- PAGES_COMPLETE_PLAN.md

## External Reference Sources (Read)

- https://getswipe.in/
- https://getswipe.in/pricing
- https://play.google.com/store/apps/details?id=in.swipe.app
- https://www.trustpilot.com/review/getswipe.in
- https://vyaparapp.in/
- https://vyaparapp.in/free/small-business-accounting-software
- https://vyaparapp.in/free/inventory-management-software
- https://vyaparapp.in/free/invoicing-software
- https://vyaparapp.in/free/pos-billing-software
- https://vyaparapp.in/free/invoicing-software/e-invoicing
- https://vyaparapp.in/ocr-scanner-software
- https://vyaparapp.in/free/billing-software-for-retail-shop
