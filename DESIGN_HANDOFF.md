# SwiftTill UI/UX Handoff

This package is a UI/UX refactor of the existing SwiftTill POS application. The goal is to give the backend implementation a clean, stable product shell without changing the SwiftTill brand identity.

## Product direction

SwiftTill is a restaurant POS and billing application. It is **not** an ERP and **not** an e-commerce storefront.

Keep the product focused on:

- Dashboard
- POS / billing
- Open orders
- Tables
- Customers
- Menu, categories, modifiers and images
- Discounts
- Staff / users / permissions
- Reports
- Shifts
- Billing/customer receipt printing
- Business, POS, payment, receipt and printer settings
- Platform Super Admin

Explicitly out of scope:

- KDS
- Kitchen management
- KOT workflows / multiple KOT
- Inventory
- Stock
- Suppliers
- Purchasing
- CRM
- Expenses
- Multi-branch
- Online ordering

## UI architecture

- `/pos` is the cashier workstation.
- `/admin` is the restaurant back-office dashboard.
- `/admin/*` contains management modules.
- `/` now redirects users to `/pos` or `/admin` based on role.

## POS layout

The POS uses a fixed desktop workstation structure:

1. Left rail (~240px): order type, table/customer context and cashier context.
2. Center workspace: menu search, category rail and compact menu tiles.
3. Right bill panel (~360px): current bill, totals and payment actions.

The layout is designed for 1366x768, 1440x900 and 1920x1080 first, with responsive collapse below desktop widths.

## POS workflow

Order type -> context -> menu item -> modifiers -> current bill -> hold or payment -> receipt -> order/report data.

Holding an order creates an open/unpaid order. It does not launch a kitchen/KOT screen.

Successful payment opens the existing billing receipt route (`/bill/[id]`).

## Visual system

- White application surfaces on a very light neutral background.
- SwiftTill orange remains the primary action color.
- Dark ink is used for navigation and high-contrast text.
- Borders are subtle and consistent.
- 8-14px control/card radii; avoid oversized bubbly cards.
- Compact operational controls; avoid excessive vertical padding.
- Use one spacing system and consistent alignment.
- Uploaded logos and menu images must display without color filters or recoloring.

## Backend wiring still expected

OpenCode/backend work should connect the UI to real data and preserve the visual system. In particular:

- Replace any placeholder chart values with `/api/dashboard/stats` and report data.
- Make menu/category/product/modifier CRUD persistent.
- Make uploaded images persistent and served from the existing media routes.
- Make payment totals, tax, discounts and change calculations authoritative on the server.
- Make receipt printing use the existing billing printer/ESC-POS agent only.
- Do not reintroduce kitchen/KOT/inventory/etc. UI modules.
- Enforce role/permission checks on the server, not only in the UI.
- Keep `/admin` free from server-side exceptions when data is empty or unavailable.

## Important implementation note

The previous POS had duplicate/misaligned header/main markup and a prototype-like three-column layout. The POS page has been rewritten around one clean shell while retaining the existing API endpoints and core order/payment components.
