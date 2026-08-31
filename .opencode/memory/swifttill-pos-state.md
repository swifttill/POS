# SwiftTill POS — Project State

## Objective
- Build and deploy **SwiftTill POS** — a professional restaurant point-of-sale: Cloudflare Worker (OpenNext), Neon Postgres, Drizzle ORM, PKR ₨, brand orange `#FF7A00` / green `#00B83F`. Full system: FOH ordering (Hold → edit → Print unpaid bill → Pay), admin panel (menu/categories/tables/deals + image upload to R2), reports suite, thermal + A4 billing, eposmatic-style dashboard, settings, security. User supplied two fixed product logos (not user-changeable); restaurants upload their own `company.logoUrl` for bills.

## Critical Environment Facts
- **Live URL**: https://swifttill.malik-chatgpt26436.workers.dev · **Worker** `swifttill` · **CF acct** `9182ce74b422e6ea5341048aeb6a7efa` · **token** `cfat_4B5DPMhU8ehz9BkYLzuv2S1RhiCOzX0SVxm1OLyQ9d83c9db`.
- **Neon**: `postgresql://neondb_owner:npg_yvCul8adk9Om@ep-dawn-sun-axxl6lri.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require`. DB columns camelCase. Money = integer **paisa**.
- **Deploy**: `git push` → GitHub Actions `.github/workflows/deploy.yml` runs `opennextjs-cloudflare build && deploy`. **Windows local `next build` fails** (symlink EPERM). Cloudflare runtime is Workers (NOT nodejs) — do NOT set `export const runtime = "nodejs"`.
- **Build is strict tsc**: every type error fails deploy. The generated `CloudflareEnv` type does NOT include custom R2 bindings → cast `env as any` when using `getCloudflareContext({ async: true })` bindings.
- **Logins**: PIN `1234`(admin)/`2222`(mgr)/`3333`(waiter); accounts admin/admin1234, manager/manager1234, waiter/waiter1234.
- **Theme**: `globals.css` brand tokens UNCHANGED. Keep brand colors; never introduce new ones. (Old inline-blue `Logo.tsx` SVG was the "color change" complaint — now replaced by user logos.)
- **GST**: company has `gstEnabled` + `gstRate` (currently 16%). Verified order of ₨450 → tax ₨72 → total ₨522.

## Logos & Branding
- User logos (in `C:\Users\MALIK HANNAN\Downloads\`): `logo with name .png` → `apps/web/public/assets/logo-with-name.png` (=`LOGO_FULL`); `logo without name.png` → `apps/web/public/assets/logo-mark.png` (=`LOGO_MARK`). Fixed SwiftTill product logo (not user-changeable).
- `lib/brand.ts`: `BRAND_NAME="SwiftTill"`, `LOGO_FULL`, `LOGO_MARK`. `components/Logo.tsx` uses PNGs.
- Org bill logo = `company.logoUrl` (uploaded via CompanyForm), with `LOGO_MARK` fallback in bill.

## R2 Media (VERIFIED WORKING)
- Bucket `swifttill-media` created via wrangler. Binding `MEDIA` in `apps/web/wrangler.jsonc` (`r2_buckets: [{binding:"MEDIA", bucket_name:"swifttill-media"}]`).
- `apps/web/app/api/media/upload/route.ts` — POST multipart, auth required, validates type∈{png,jpeg,webp} + ≤3MB, stores `folder/<uuid>.<ext>` via `(env as any).MEDIA.put(key, arrayBuffer, {httpMetadata})`, returns `{url:"/media/<key>"}`. FOLDERS=["items","categories","org","misc"].
- `apps/web/app/media/[...key]/route.ts` — GET serves from `(env as any).MEDIA.get(path)` with content-type + cache headers. **Verified**: upload returns URL, fetch returns PNG bytes.
- `lib/useImageUpload.ts` — client hook: canvas-resize to ≤1200px WebP 0.85, POST to upload route. Returns `{upload, busy}`.
- `components/admin/ImageField.tsx` — reusable (`label?`, `folder`, `value: string|null`, `onUploaded:(url:string|null)=>void`, `compact?`). Wired in `MenuManager` (categories→"categories", item→"items") and `CompanyForm` (org logo).

## Verified End-to-End (live)
- Create DINE_IN OPEN order (no payment) → KOT status; pending list; PATCH edit/pay → BILLED; mid-order edit recomputes; table create; void.
- **New**: `POST /api/orders` → OPEN order (GST applied). `GET /bill/[id]` server-renders thermal bill (logo, items+modifiers, subtotal/tax/discount/total, paid/balance, UNPAID/PAID, Print button). Media upload+serve works.

## POS Flow + Routing (Implemented, deployed)
- `apps/web/app/pos/page.tsx` (was `app/page.tsx`): action bar is **Hold / Print / Payment** (building) and **Send Update / Print / Payment** (editing). `sendToKitchen`=Hold (creates OPEN, clears cart, sets `activeOrderId`). `payNewOrder` creates+prints receipt. `printBill()` opens `/bill/[id]` in new tab (reprints held order, or auto-holds cart then prints). Pending modal has **Print** per order. `editMeta` carries `subtotal`/`tax` for correct edit-payments.
- **Routing change**: `/` is now the Dashboard; the ordering screen is `/pos`. POS sidebar "POS" links to `/pos`. Login redirects to `/`.

## Dashboard (DONE, deployed)
- `apps/web/app/page.tsx`: eposmatic-style landing. Header (Logo, welcome, live clock, **Privacy toggle** that blurs money via localStorage, logout). Stat cards: Today's Sales, Orders Today, Open/Unpaid, Avg Ticket (from `/api/dashboard/stats`). Quick-action tiles: New Order→/pos, Pending Orders→/pos, Tables→/admin/tables, Menu→/admin/menu, Reports→/admin/reports, Settings→/admin/company. Auth redirect to /login if 401.
- `apps/web/app/api/dashboard/stats/route.ts`: today's BILLED sales/count + OPEN count via drizzle `sql`/`gte`/`and`. **Verified**: returns `{todaySalesPaisa,ordersToday,openOrders,avgTicketPaisa}` (e.g. openOrders:2).

## Reports (ALREADY EXISTS — do not rebuild)
- `apps/web/app/admin/reports/page.tsx` (client "Analytics"): date range + tender + category cross-filters, summary (orders/revenue/tax/avg), tender split, revenue-by-category bars, top-selling items. Backed by `apps/web/app/api/reports/route.ts`. Fully scaffolded. Other pre-built admin pages: `admin/menu`, `admin/deals`, `admin/shifts`, `admin/users`, `admin/company`, `admin/tables`.

## Bill / Printing
- `apps/web/app/bill/[id]/page.tsx` — server component, `dynamic=force-dynamic`, queries order (items+modifiers, payments, table) + single company. Thermal-style 320px sheet, print CSS in `globals.css` (`@media print` hides `.no-print`, shows `.bill-sheet`; `.bill-page` scrolls on screen). `components/PrintButton.tsx` (client: window.print / window.close). KOT printing on send-to-kitchen NOT yet implemented (only customer bill).

## Backend (stable)
- `POST /api/orders` (no payment→OPEN/KOT; full→BILLED); `GET /api/orders?status=OPEN` (paid/editable/tableNumber/number); `PATCH /api/orders/[id]` (add/update/remove items, manager discount, payments→BILLED); `POST /api/orders/[id]/void`. Tables CRUD (manager). DB fixes earlier: added `Order.number` column + computed next; added `DEFAULT CURRENT_TIMESTAMP` to NOT-NULL timestamps.

## Audit Fixes (STEP 19) — IMPLEMENTED
P0 functional/correctness pass over the existing approved UI (no redesign; billing printer preserved).
- **P0.1/P0.2** — Edit-order state: `addItem`/`addDeal`/`subtotal` use `(editing?editLines:lines)`.
- **P0.4** — Modifier double-charge fixed in `ModifierModal.tsx` (unitPrice = base only).
- **19C/19D** — POS totals + payment source use LIVE totals; `subtotal`/`tax` added to `PendingOrder`.
- **19E/19F/19G** — `PayModal.submit()` caps each tender at balance; cash overpayment → change (not revenue); split cash+card/online supported; payments filtered `amount>0`.
- **19I** — ONE TABLE = ONE ACTIVE DINE-IN order: frontend `handleTableSelect` opens existing order; server `POST /api/orders` returns 409 if table already OPEN.
- **69K = KOT/kitchen workflow REMOVED** (billing printer KEPT):
  - Deleted `/app/kot/[id]/page.tsx`, `/api/orders/[id]/kot/route.ts`, `components/AutoPrint.tsx`.
  - Agent `packages/agent/src/index.ts`: removed `buildKOT`, `pollOnce`, KOT polling; KEPT `printBills` + `config.billPrinter` (billing only).
  - Removed `kotPrinted` sets in POST/PATCH order routes; removed "Reprint KOT" from OrdersModal + SettingsHub "Kitchen printing" card + KITCHEN TICKETS section in `/orders/[id]/print` + `.kot-page/.kot-sheet` CSS.
  - **`printerStation` KEPT** (schema/routing metadata — not active KOT workflow; do not drop).
- **P0.8 Payment integrity** — Signed amounts server-side: PATCH `/api/orders/[id]` filters `amount>0` and caps recorded payments so `paid` never exceeds `total` (revenue can't inflate); reads `paid` from DB (never stale frontend state); partial payment → OPEN, full → BILLED (existing status enum, no invented statuses).
- **P0.9 res.ok** — Added proper handling to: POS `sendUpdate`, `submitEditPayment`, `voidOrder`; admin `shifts` open/close; `users` deactivate; `tables` saveEdit/remove. (Others already compliant: api.ts, PayModal, ChangePin/Password, LoginForm, SecurityLock, ManagerPinModal.)
- **P0.10 Server-side perms** — New `authorize(perm)` in `lib/auth.ts` returns 401 (unauthenticated) vs 403 (forbidden). Applied to void, refund, order POST/PATCH discount, shifts open/close (`closeShift`), tables create/update/delete (`manageMenu`). Users/media/admin-upload routes already return 403.
- **Leftovers** — `components/CheckoutModal.tsx` is dead code (no importers) with old logic; harmless. `kotPrinted` DB column kept (no migration; no app code depends on it).

## Build status
- Local `pnpm --filter @swift-till/web run build` + agent `typecheck` PASS. `next lint` is not configured (interactive) — build's own lint/type stage passes.

## Media Lifecycle (STEP 19 — COMPLETE, verified)
- **New** `apps/web/lib/r2-media.ts`: `isR2MediaUrl(url)` (`/media/` prefix) + `deleteR2Media(url)` (best-effort `env.MEDIA.delete` via dynamic `@opennextjs/cloudflare` import, never throws, returns bool; gracefully returns false offline).
- **`apps/web/lib/admin-actions.ts`**: added `countMediaRefs(url,{excludeItemId?,excludeCategoryId?})` + `cleanupMedia(url,opts)` (skip if refs>0; R2 if `/media/` else `deleteImage`). `updateItem`/`updateCategory` capture `prev.imageUrl`, update DB, then cleanup on change. `deleteItem`/`deleteCategory` delete DB rows FIRST then cleanup media (media never removed if DB delete fails). Fixed `deleteCategory` items projection `{id,imageUrl}`.
- **Runtime-verified (live Neon)** via temp `.mts`: FK `OrderItem.menuItemId→MenuItem` = **SET NULL** (`OrderItem_menuItemId_MenuItem_id_fk`); `MenuItem.categoryId→Category` = **CASCADE**; `OrderItem.orderId→Order` = **CASCADE**. Deleting a menu item leaves the historical orderItem intact (name/qty/price preserved, `menuItemId=null`) — **history preserved, no data loss**. Shared media (2 items + 1 category) counted 3 refs → not deletable; after excluding one item → 2 refs → preserved. `deleteR2Media` offline → false, no throw. `isR2MediaUrl` correct.

## Final Runtime QA (clean `next start` production build, port 3000 free)
- `/pos` returns **200** (earlier 500 was stale `.next` cache + port 3000 held by old dev server — not a source bug).
- Occupied-table browser flow (headless Chrome/CDP): toast "already has an open order", edit modal opens ("Edit open order"), "Record payment" present, cart shows existing item, duplicate table → **409**. All PASS.
- HTTP smoke: waiter create 200; duplicate 409; waiter discount 403; admin discount 200 + preserved (10000); waiter pays discounted order → **BILLED, paid==total==55000** (65000−10000, capped, verified via DB payment sum); void 401/403; refund 403; bill page 200. All PASS.
- **Known pre-existing (REPORT, do not fix — out of scope UI):** mobile POS grid collapses at <600px — fixed `grid-cols-[240px_minmax(0,1fr)_360px]` + `overflow-hidden` squeezes center menu column to **0px** (unmodified from original design; user forbade UI redesign). `/pos` fresh-load menu shows default category only (no extra categories selected). `/media/*.webp` 404s = 4 pre-existing missing category images (not in repo; only reachable via R2 on Cloudflare) — benign, report only.

## Build status
- Local `pnpm --filter @swift-till/web run build` + agent `typecheck` PASS. `next lint` is not configured (interactive) — build's own lint/type stage passes.

## Active / Pending
- **DONE (STEP 19)**: KOT/kitchen workflow REMOVED (billing printer `config.billPrinter` KEPT); media lifecycle (R2 cleanup) implemented + verified; runtime HTTP/browser QA green on clean prod build; payment/permission/res.ok fixes in place.
- Dashboard (/) done; Reports at /admin/reports; Settings hub done; SecurityLock integrated; admin menu/category/tables with R2 image upload done.

## Next Move
- Real R2 object deletion + `/api/media/upload` can only run on the Cloudflare runtime (not local) — verify on deploy. Report the pre-existing mobile-grid + `/media/*` 404 findings as out-of-scope. No further code changes required for current mandate.

## Relevant Files
- `apps/web/lib/r2-media.ts` (NEW), `apps/web/lib/admin-actions.ts` (MODIFIED: media lifecycle).
- `apps/web/app/pos/page.tsx` (occupied-table 409 handling, permission/PIN payment-void).
- `apps/web/app/api/orders/*`, `apps/web/lib/auth.ts` (`authorize`: 401 vs 403).
- `packages/db/.media-qa.mts` etc. were TEMP and REMOVED — clean repo (only intended changes + untracked `pos.zip`/`temp.txt`).

## Relevant Files
- `apps/web/app/page.tsx` (FOH POS: Hold/Print/Payment, printBill, activeOrderId, editMeta).
- `apps/web/app/bill/[id]/page.tsx`, `apps/web/components/PrintButton.tsx`.
- `apps/web/app/api/media/upload/route.ts`, `apps/web/app/media/[...key]/route.ts`, `apps/web/lib/useImageUpload.ts`, `apps/web/components/admin/ImageField.tsx`.
- `apps/web/lib/brand.ts`, `apps/web/components/Logo.tsx`, `apps/web/public/assets/logo-with-name.png`, `logo-mark.png`.
- `apps/web/app/api/orders/*`, `apps/web/app/api/tables/*`, `apps/web/wrangler.jsonc`.
- `apps/web/app/admin/company/page.tsx`, `components/admin/CompanyForm.tsx`, `components/admin/MenuManager.tsx`.
- `packages/db/src/schema.ts` (camelCase; `companies.logoUrl`), `packages/db/src/index.ts`.
- `apps/web/globals.css` (brand tokens — do not change colors), `.github/workflows/deploy.yml`.

## Deploy / Verify Tips
- PowerShell `curl.exe --data-binary "@file.json"` for JSON; `-F "file=@x.png;type=image/png"` for uploads. Login: POST `/api/auth/login` `{"pin":"1234"}` with cookie jar, then authed calls.
- After deploy, a 404 "could not be found" string appearing in HTML is a Next.js embedded error-template false positive — check for actual content (e.g., order item name) to confirm a page rendered.
- Check deploy success: `gh run list --limit 1`; view errors: `gh run view <id> --log | Select-String "Type error"`.
