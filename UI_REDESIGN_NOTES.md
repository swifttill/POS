# SwiftTill UI/UX Refresh

This package contains a professional UI refresh built on the existing SwiftTill codebase without changing the product into an ERP or adding kitchen/inventory workflows.

## Main UI improvements
- Reworked admin shell with a premium dark sidebar, active navigation states, improved top bar, mobile navigation and consistent spacing.
- Added a stronger shared visual system in `apps/web/app/globals.css`: cards, inputs, buttons, tables, page headers, status pills, responsive polish and subtler shadows.
- Rebuilt the admin dashboard around real data instead of decorative sample chart values.
- Added live hourly billed-sales data and recent orders to `/api/dashboard/stats` and connected them to the dashboard.
- Rebuilt the Orders screen with professional filters, responsive table styling, status pills, empty/error/loading states and clearer actions.
- Orders “Open” now deep-links to the exact open order in POS using `?orderId=`.
- POS automatically loads that order for editing and restores its service/customer/table metadata.
- POS menu, category tabs, order type selector, table cards, cart and current-bill column received a visual upgrade.
- Reports, Menu, Deals, Company and Settings received consistent professional page headers and spacing.
- Fixed the print-order server component so it no longer contains an invalid server-side click handler; it now uses the existing client `PrintButton`.

## Backend/connectivity improvements
- Dashboard chart and recent activity are now backed by real order data.
- Added session protection to Orders GET/POST and order GET/PATCH endpoints.
- Added report permission enforcement to `/api/reports`.
- Existing authoritative server pricing, table-open-order protection, discount approval and payment caps remain intact.

## Verification note
All changed TS/TSX source files passed a TypeScript syntax/transpile check in the sandbox. A full project `tsc` could not be completed here because the uploaded ZIP contained empty pnpm-linked dependency directories (Next/React/workspace package links were not materialized) and the sandbox has no npm registry network access. On the development machine, run `pnpm install` if needed and then the project's normal TypeScript/build commands before deployment.
