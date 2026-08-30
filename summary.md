## Objective
- Finish the POS UI refinement/redesign requested after the build/deploy was fixed: refine POS layout (button margins, tax overlap, alignment), square table buttons with live elapsed time for occupied tables, equal-size redesigned order-type tabs, direct print without preview, edit-bill with menu + "hold again" (no KOT re-send on update), and receipt-style report printing (itemwise/overall/summary formats).
- Push every verified change to `https://github.com/swifttill/POS` (confirmed correct repo), trigger CI deploy, verify Cloudflare worker + Neon connection live.

## Important Details
- **Repo confirmed by user**: keep `swifttill/POS`. Push only via token URL `https://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@github.com/swifttill/POS.git`. Plain `git push origin main` fails.
- **GitHub API facts**: PAT owner = account `swifttill` (id 320272783), which owns `swifttill/POS` (User type, push=True). `gh` CLI is logged in as `officialathoo` which gets 404 on that repo (not used).
- **Live URL**: `https://swifttill.malik-chatgpt26436.workers.dev` — currently serves the NEW build. Live BUILD_ID `EyS2IfcbKGfnNW5eD9rfM`; worker Version ID `5bb24008-a3c0-43b9-9a14-85091856fe46`; served chunks `9ff3e1f8-2b523f0b41c26c8e.js` / `3836-7d98d73d0dd0d3ed.js` match the new build. If user reports "old", it is browser cache → hard refresh (Ctrl+Shift+R) or incognito.
- **Neon**: `DATABASE_URL=postgresql://neondb_owner:npg_yvCul8adk9Om@ep-dawn-sun-axxl6lri.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require` (in `.env`); DB tables: Category, Company, Deal, DealItem, MenuItem, Modifier, ModifierGroup, Order, OrderItem, OrderItemModifier, Payment, RestaurantTable, Session, Shift, User (NO Customer table; Order has `kotPrinted` column).
- **CI workflow** (`.github/workflows/deploy.yml`): node 22, `pnpm run deploy`, env `NEXT_PUBLIC_BASE_URL=https://swifttill.malik-chatgpt26436.workers.dev`; secrets present: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, DATABASE_URL. Secret step now: `printf '%s' "$DATABASE_URL" | pnpm --filter @swift-till/web exec wrangler secret put DATABASE_URL` (must run from apps/web where wrangler is installed).
- **Root package.json** now has `"deploy": "pnpm --filter @swift-till/web run deploy"` (never `pnpm deploy` = pnpm builtin → `ERR_PNPM_INVALID_DEPLOY_TARGET`).
- **Local shell**: Windows PowerShell (no `head`/`grep`/`tail`/`&&`; use `Select-String`, node scripts, full paths). Also `pos.zip` 50MB artifact is ignored (not in git).
- **User design directives**: occupied tables must show elapsed-time clock (no manual entry); table buttons square-shaped; Dine-In/Takeaway/Delivery tabs same size; print must go DIRECTLY to printer (no preview/new tab) — real silent printing is a browser limitation (`window.print()` always shows dialog), plan is iframe-triggered print + auto-print/auto-close pages; edit screen must show the menu to add items and have "Hold again" (no KOT re-print on plain update — user said "we don't need multiple printers"); admin "Application error" (digest 1374539769) cause was worker lacking DATABASE_URL secret during the failed-secret window (now resolved); reports must print like a receipt/bill, not whole page.
- **Permission gates now enforced**: admin pages require manager+ (`manageMenu`, `manageDeals`, `manageCompany`). Company/Deals/Menu nav links hidden when permission missing. All admin server actions gate with `requirePermission`. Media upload routes (`/api/media/upload`, `/api/admin/upload`) now check `manageMenu` / `manageDeals` / `manageCompany` before accepting uploads.
- **Reproduced & fixed**: /admin server-side exception root cause was worker missing DATABASE_URL secret during the window when deploy succeeded but secret step failed (run `b885149`). Final deploy sets the secret → admin works now (hard refresh).

## Work State
### Completed
- Root cause of line-800 JSX error: outer `<>` was opened in FOHPage return (line 429) and never closed; `</>` + `<SecurityLock/>` were misplaced at the end of PendingModal. Fixed by wrapping POS content in `<SecurityLock timeoutMinutes={5}>` (component requires children) and removing the orphaned SecurityLock/`</>` from PendingModal.
- Fixed `apps/web/app/globals.css`: restored missing `}` closing the second `@media print` block (commit `b7964fa` had truncated the file end).
- Cleaned `packages/db/src/schema.ts`: removed ~16 bogus `relations` added by `b7964fa` referencing non-existent tables (recipes, ingredients, stockMovements, purchases, suppliers, customers, deliveries, riders, loyaltyEntries, feedback, notifications, auditLogs, branchOffices, inventorySnapshots, settings, modulePermissions, roles) incl. `recipes`/`ingredients` in menuItemsRelations and `modifierOptions` in orderItemsRelations; restored `kotPrinted: boolean("kotPrinted").notNull().default(false)` (column exists in Neon "Order").
- Removed dead customer API routes `apps/web/app/api/customers/route.ts` + `apps/web/app/api/customers/[id]/route.ts` (no Customer table in Neon; routes unused).
- Fixed mojibake in `apps/web/app/pos/page.tsx`: `ΓÇö`→`—`, `ΓÇª`→`…`, `≡ƒöÆ`/`≡ƒöô`→`🔒`/`🔓`, `ΓåÉ`→`←`, `┬╖`→`·`, `├ù`→`×`; repo-wide mojibake scan reports CLEAN.
- Commits pushed to `swifttill/POS` (HEAD `63b5b72`): `4d7a7b3` (build fixes), `04cefd5` (root deploy script v1), `b885149` (deploy script v2 `... run deploy`), `0bd627d` (CI secret fix). `pnpm run build` green; CI deploy SUCCEEDED; live verified: `/api/menu`, `/api/tables`, `/api/orders?status=OPEN` return real Neon data (GST 16% visible: 45000 subtotal → 7200 tax), `/api/auth/me`→401, `/admin`·`/admin/reports`→307, `/pos`→200.
- Admin error root cause confirmed: during run `b885149` deploy succeeded but `Set DATABASE_URL secret` failed (`Command "wrangler" not found`) → worker had no DB secret → /admin server exception. Local repro of admin count queries via tsx works (COUNTS: 4 6 1 5 5). Final deploy sets the secret → admin works now; user needs hard refresh.
- Explored components for redesign: `TableMap.tsx` (grid cards, `occupiedIds` prop, T{number} + seats), `OrderTypeTabs.tsx` (flex gap-2 unequal buttons: `px-4 py-2`), `PrintButton.tsx` (`window.print()`), `AutoPrint.tsx` (auto print 400ms + Print/Close buttons), `bill/[id]/page.tsx` (uses PrintButton), `kot/[id]/page.tsx` (uses AutoPrint), `orders/[id]/print/page.tsx` (station-grouped KOT print), `app/api/reports/route.ts` + `lib/reports.ts` (buildReport returns summary/topItems/byCategory/range), `admin/layout.tsx` (exists; sidebar likely outside `.reports-shell` so it prints → needs `no-print`).
- **New: category & menu image on create** — `ImageField` added to CategoryModal and ItemModal; `createCategory` and `createItem` admin-actions accept `imageUrl`; images upload to R2 with client resize and appear instantly in POS.
- **New: separate category & item creation options** — Admin Menu screen is now master-detail: left sidebar categories panel with image thumbnails, add/edit/move up/down/delete; right grid shows items of selected category with search, live toggle, edit/delete/customize.
- **New: filters via category type in admin** — Category sidebar IS the filter; clicking a category filters right-side items. Search box also filters item names/descriptions. Availability live toggle shows/hides items.
- **New: deals redesign** — DealsManager now has professional builder modal with: type select (BUNDLE/BOGO/PERCENT), value field (context-aware: Rs for BUNDLE, percent for PERCENT, nothing for BOGO), date range (startsAt/endsAt from DB `startsAt`/`endsAt` columns), item picker with quantity steppers per item, active toggle, delete deal. Deal cards display proper labels (e.g., "Buy 1 Get 1", "% off order", "Package Rs"). Old deal items with quantity replaced via schema `DealItem.quantity`; new deals store quantity per item. Deal membership editable after creation; delete deal supported.
- **New: permission enforcement** — Admin layout now restricts entry to ADMIN/MANAGER only (WAITER redirected to /pos). Nav links respect permissions (manageMenu/manageDeals/manageCompany). All admin server actions (`createCategory`, `updateItem`, `addModifierGroup`, `createDeal`, `updateDeal`, `deleteDeal`, `upload`) now require the appropriate permission (`manageMenu`, `manageDeals`, `manageCompany`). Media upload (`/api/media/upload`, `/api/admin/upload`) gates to users with `manageMenu`/`manageDeals`/`manageCompany` permission. Updated `DEFAULT_PERMISSIONS` accordingly.
- **POS addDeal type-aware charging**: BUNDLE → unitPrice = deal.value (paisa package price); BOGO → unitPrice = max item price (pay 1 get N); PERCENT → unitPrice = 0 informational line ("X% off order"). DealCard displays per-type value label (e.g., "10% off", "Buy 1 Get 1", "Rs 999").

### Active
- Implementing POS redesign per user request; re-reading `apps/web/app/pos/page.tsx` (~lines 428–460 header/sidebar area) to edit the layout (todos: square tables with occupied elapsed-time clock, equal-size tabs, spacing/tax fixes, direct print, edit-bill menu + hold again, reports: receipt-style print all still pending).

### Blocked
- (none) — build and deploy are green; remaining work is implementation.

## Next Move
1. Finish reading the current POS page layout, then implement in order: (a) `TableMap` square buttons + elapsed-time clock (pass `occupiedAt` map from pending orders by tableNumber; interval state ~30s), (b) `OrderTypeTabs` equal-size `grid grid-cols-3` buttons, (c) POS spacing/tax-overlap/alignment fixes, (d) direct print via same-origin hidden iframe `contentWindow.print()` + `?auto=1` auto-print/auto-close on bill/kot print pages, (e) edit-bill center menu visible during editing + "Hold Again" button (sendUpdate without auto KOT open; hold-again reprints KOT once), (f) reports print-as-receipt + add full itemwise list to `buildReport`.
2. Add `no-print` to admin layout sidebar so report print only prints the receipt-area (already done — admin/layout now has permission gates + nav link filtering; done in this pass).
3. Build (`pnpm run build`), commit, push to `swifttill/POS` via token URL, watch CI until success, then verify live endpoints + report to user.

## Relevant Files
- `apps/web/app/pos/page.tsx` — POS page; all redesign edits here.
- `apps/web/components/TableMap.tsx` — square tables + occupied elapsed time (change `occupiedIds` prop to occupied-with-time map).
- `apps/web/components/OrderTypeTabs.tsx` — equal-size order-type buttons.
- `apps/web/components/Cart.tsx` — cart lines (spacing/tax rows live in POS right column).
- `apps/web/components/PrintButton.tsx` / `AutoPrint.tsx` — auto-print + auto-close + `?auto=1` behavior.
- `apps/web/app/bill/[id]/page.tsx`, `apps/web/app/kot/[id]/page.tsx`, `apps/web/app/orders/[id]/print/page.tsx` — receipt pages to make direct-print friendly.
- `apps/web/app/admin/page.tsx` — admin dashboard (works now; secret restored).
- `apps/web/app/admin/reports/page.tsx` + `apps/web/app/api/reports/route.ts` + `apps/web/lib/reports.ts` — report formats + receipt-style print (add full `items` list).
- `apps/web/app/admin/layout.tsx` — add `no-print` to sidebar/nav for report printing (already updated with permission-gated nav).
- `apps/web/app/globals.css` — print CSS (`@media print` blocks now closed; may need report receipt styling + admin nav no-print).
- `package.json` — root `deploy` script (fixed).
- `.github/workflows/deploy.yml` — CI deploy workflow (fixed secret step).
- `packages/db/src/schema.ts` — cleaned relations + restored `kotPrinted`.
- `apps/web/lib/admin-actions.ts` — extended CRUD with imageUrl, category/item reorder, permission guards, %/paisa semantics for deals, quantity on dealItems, reorder helpers.
- `apps/web/lib/types.ts` — `DealDTO.items` now includes `quantity?: number`.
- `apps/web/lib/menu.ts` — `getMenuPayload` maps deal items with `quantity` and price for POS.
- `apps/web/components/DealCard.tsx` — value display per type (BUNDLE/BOGO/PERCENT).
- `apps/web/app/pos/page.tsx` `addDeal` — per-type unitPrice logic + quantity expansion.
- `apps/web/components/admin/MenuManager.tsx` — master-detail admin menu with category sidebar, image upload on create/edit, item form with image, reorder up/down, and separate modals for category/item creation.
- `apps/web/components/admin/DealsManager.tsx` — full deal builder modal with type/value/date/item-picker+qty/active, edit/delete, card list with quantities.
- `apps/web/app/admin/deals/page.tsx` — richer DTO (type, value, active, startsAt/endsAt, items with quantity).
- `apps/web/lib/menu.ts` — includes `quantity` in deal items payload.
- `apps/web/lib/types.ts` — `DealDTO.items` includes `quantity?: number`.
- `apps/web/components/admin/ImageField.tsx` — reusable upload component (40/56px preview, replace/clear).
- `apps/web/lib/useImageUpload.ts` — client hook that resizes to 1200px, re-encodes WebP 0.85, POSTs to `/api/media/upload`.
- `apps/web/lib/permissions.ts` — role/permission model; `DEFAULT_PERMISSIONS` updated; `resolvePermissions` unchanged.
- `apps/web/lib/admin-actions.ts` — added `guard(perm)` helper + guard calls on all admin mutations + media upload gate.