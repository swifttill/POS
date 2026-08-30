# SwiftTill UI Refactor

## Changed
- Rebuilt `/pos` into a focused restaurant cashier workstation.
- Replaced oversized/boxy POS layout with fixed left context rail, central menu workspace and dedicated billing panel.
- Added consistent spacing, compact controls, menu tiles and clearer hierarchy.
- Kept SwiftTill orange/neutral visual identity and preserved uploaded image colors.
- Removed KOT/kitchen action from the POS hold workflow; Hold now saves an open order only.
- Added cleaner open-order modal with Receipt/Edit/Pay/Void actions.
- Reworked `/admin` shell into a separate back-office application with sidebar navigation.
- Rebuilt `/admin` dashboard with real `/api/dashboard/stats` integration and operational quick actions.
- Changed `/` to role-based routing: WAITER -> `/pos`, ADMIN/MANAGER -> `/admin`.
- Added `DESIGN_HANDOFF.md` for backend integration and scope boundaries.
- Added `PosIcon` for consistent UI icons without introducing another dependency.

## Intentionally not added
KDS, kitchen management, KOT workflows, inventory, stock, suppliers, purchasing, CRM, expenses, multi-branch, online ordering.

## Validation
The changed TSX files were parsed successfully with the installed TypeScript compiler using `transpileModule`. A full Next.js build could not be run in this environment because the uploaded archive contains broken/incomplete `node_modules` links and the environment cannot reach the npm registry. OpenCode should run `pnpm install --frozen-lockfile && pnpm build` before deployment.
