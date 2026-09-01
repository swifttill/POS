# Phase 10 Certification — Dashboard, Reports & Exports

Scope: dashboard/report calculation core, category/item/tender/cashier reconciliation, business-date range validation, Excel-compatible SpreadsheetML, printable report document model, thermal report text, report export job schema, responsive admin Dashboard/Reports workspaces.

Certification means source/domain regression verification in this isolated environment. It does **not** claim a Next.js production build when dependencies are unavailable, a deployed database, a binary PDF adapter, or physical printer verification.

Critical regression targets covered: category totals come from category lines rather than whole-order totals; cashier identity is user-ID based; tender reconciliation keeps PAYMENT/REVERSAL/REFUND semantics; open/unpaid operational noise is excluded from sales summary.
