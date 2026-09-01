# SwiftTill Enterprise Reporting Research — 2026-09-01

## Benchmark findings
Research used official product/support material from Toast, Square, Lightspeed Restaurant and TouchBistro.

### Toast patterns worth matching
- PMIX/item reporting: menu > group > item > modifier/special request hierarchy; quantity, average price, gross, discount, net; filters by date, sales category, employee, order source/item tags; period comparison; Excel/CSV export.
- Sales: summary, analytics/trends, sales breakdown, orders, paid-in-total/deposit timing, service/dining option/payment dimensions.
- Control/loss: voided orders, removed items, discounts, refunds, voided payments, cash activity, drawer history, unpaid orders, tax exempt, offline payments, end-of-day.
- Permissions: report categories have distinct permissions; access is role/job based with granular employee overrides.

### Square patterns worth matching
- Item/category/modifier reports with date, location/source/grouping filters and CSV/Excel export.
- Custom Report Builder selects metrics, groupings and filters, can start from presets, and saves custom views.
- Multi-block custom reports combine sales summary, payment methods, item/category/team/discount/modifier/tax blocks.
- Team permission sets control what staff can see/do across POS and Dashboard.

### Lightspeed Restaurant patterns worth matching
- Advanced Reporting supports saved custom reports from templates or scratch, visual tables/graphs, PDF/Excel/CSV export, filters including tables/users/shifts, and drag/reorder report sections.
- Standard reporting includes revenue, product, shift and summary reporting.

### TouchBistro patterns worth matching
- Large real-time report library (advertises 50+ reports), staff performance, sales/customer patterns, remote access, automated daily-sales sharing and exports.

## SwiftTill scope decision
SwiftTill remains restaurant POS, not ERP. Therefore reporting will be deep for sales/menu/payments/tax/discount/void/refund/shift/cashier/waiter/table/audit, but will NOT add inventory, purchasing, payroll, CRM or kitchen/KDS reports unless those product modules are separately unlocked.

## SwiftTill report library
### Sales
Sales Summary; Sales by Date; Sales by Hour; Sales by Day of Week; Sales Trend/period comparison; Order Type; Table/Section; Order Count; Average Order Value; Guest/Pax Analysis; Recent/Order Detail.

### Menu / item-wise
Item-wise Sales (PMIX); Item Detail; Category Sales; Variant/Size Sales; Modifier Sales; Deal Performance; Discount by Item; Top Sellers; Bottom Sellers; item by cashier/waiter; item by order type; item by hour/day; item refund/void impact.

### Payments / finance
Tender Summary; Cash/Card/Online; Split Tender; Tax/GST; Refunds; Payment Reversals; Payment Corrections; Reconciliation; Cash Drawer; Shift settlement; X; Z.

### People / loss control
Cashier Performance; Waiter Sales; Discounts/Comps; Voids/Removed Items; Manager Approvals; Audit Activity; shift activity.

## Custom Report Builder contract
Dimensions: business date, hour, order type, item, category, variant, modifier, cashier, waiter, table, tender, shift, discount, tax rate, order status.
Metrics: quantity, order count, guest count, gross sales, discounts, net-before-tax, tax, net sales, average order, average item price, refunds, voids, cash/card/online payments.
Filters are applied before aggregation. Up to 4 grouping dimensions and 12 metrics. Saved definitions store configuration only; financial results are recomputed from authoritative transaction history. Compare modes: previous period and previous year. Sort, row limit, favorites and private/shared saved views are supported at the model/contract level.

## Data integrity rules
- Item/category reports aggregate immutable order-item snapshots, not current menu prices/names.
- Refunds/reversals remain separate ledger effects.
- Cash change is never revenue.
- Report actor dimensions use authenticated user IDs.
- Report access requires server-side permissions.
- Saved custom report configuration cannot rewrite historical facts.
- Every export/run can be audit logged.
