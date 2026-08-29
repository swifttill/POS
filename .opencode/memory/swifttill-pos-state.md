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

## Active / Pending
- **Typography wrapping** on POS — mostly addressed: Cart uses min-w-0/truncate; MenuItemCard restyled for light theme (removed broken `to-abyss` gradient + illegible light-tint station chips; price now `text-brand`). Cart note color `text-cyan`→`text-muted`. Residual: any other dark-theme token leftovers (`glow-text`/`glow-border`/`border-electric` now map to brand orange via globals, so on-theme).
- **KOT print** on send-to-kitchen — DONE. `app/kot/[id]/page.tsx` server-renders station-grouped ticket (no prices, modifiers + notes), auto-prints via `components/AutoPrint.tsx`. Wired into `sendToKitchen` + `sendUpdate` (window.open /kot/[id]). Verified live: groups GRILL/FRY/COLD, no prices.
- **Dashboard** (eposmatic-style) — DONE (/ , with privacy toggle). 
- **Reports suite** — EXISTS at `/admin/reports` (Analytics: date/tender/category filters, summary, tender split, category & top-item bars). May need Print/PDF/Excel export + X/Z report variants added later.
- **Settings** — org page `/admin/company` exists; profile + searchable optional-feature toggles NOT done.
- **Deals admin** — `admin/deals` page exists; verify image upload wired.
- **Security features** using logo/name — NOT started.
- Admin menu/category management with image upload — DONE (MenuManager + ImageField). Tables — DONE.

## Next Move
Continue per user's "complete process" spec, verifying each via deploy:
1. Fix POS typography wrapping.
2. KOT print on send-to-kitchen.
3. eposmatic-style Dashboard (New Order / Pending / Reports, privacy).
4. Reports suite (print + PDF/Excel export, daily/custom).
5. Settings (profile + searchable optional features).
6. Deals admin + security features.

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
