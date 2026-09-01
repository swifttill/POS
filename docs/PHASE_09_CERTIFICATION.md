# Phase 09 certification — Receipts / Billing / Thermal Documents

Phase 09 continues from the exact Phase 08 certified parent recorded in `PHASE_09_PARENT.txt`.

Certified source scope:
- Immutable receipt snapshot model.
- Customer bill, final, partial-payment, duplicate and refund receipt semantics.
- Cash applied amount and change remain distinct.
- 80mm and 58mm deterministic thermal text renderer.
- Duplicate documents retain original-document lineage.
- Post-commit print job model; print failure cannot undo financial state.
- No direct USB transport is claimed in this phase; that remains Phase 11.

Limitations: physical thermal hardware is not available in this environment. A production Next.js build is certified only if dependencies are available; otherwise the limitation is recorded in verification results.
