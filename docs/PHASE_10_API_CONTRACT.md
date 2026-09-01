# Phase 10 API contract — Dashboard & Reports

All dates are **business dates in Company.timezone**, never browser-local ad-hoc boundaries.

- `GET /api/dashboard?businessDate=YYYY-MM-DD` — net sales, closed order count, average order, refunds, tender reconciliation and trend.
- `GET /api/reports/:type?from=&to=&orderType=&tender=&cashierId=&shiftId=` — paged/aggregated authoritative report.
- `POST /api/reports/exports` — requests EXCEL_XML, PRINTABLE_PDF or THERMAL output for the exact filter snapshot.
- `GET /api/reports/exports/:id` — export job state/download metadata.

Rules:
1. Category and item reports aggregate `OrderItem` line snapshots; never multiply the full order total into each category.
2. Tender reports aggregate immutable `PaymentTransaction` rows and distinguish PAYMENT, REVERSAL and REFUND.
3. Cashier reports use authenticated user IDs / payment actors, never editable waiter-name text.
4. Sales use closed financial orders and immutable historical totals; reports do not re-price menu items.
5. A reconciliation difference is returned explicitly and never forced to zero.
6. Excel export is SpreadsheetML (Excel-compatible XML) without a proprietary dependency. Printable PDF uses a print-safe document adapter; binary PDF generation is an infrastructure adapter, not falsely claimed in source-only certification.
7. Thermal reports are text-layout documents; physical USB transport remains Phase 11.
