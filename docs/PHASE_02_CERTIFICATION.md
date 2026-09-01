# SwiftTill Phase 02 Certification — Menu Catalogue

## Scope completed
- Category catalogue schema with active/display ordering.
- Menu items with price, availability, favorites, tax flag, image URL, optimistic version field.
- Explicit size/variant pricing.
- Reusable modifier groups/options with required/min/max/duplicate rules.
- Item-to-modifier-group associations.
- Deal definitions and eligible-item associations.
- Dependency-free server-authoritative menu pricing core.
- Real percentage/fixed promotion discount calculation; no fake zero-price deal line.
- Full-screen responsive Menu Catalogue administration preview.
- Phase 00 financial and Phase 01 identity/settings foundations preserved.

## Certification boundaries
The package manager registry is not assumed available. Certification is based on dependency-free Node tests, source/schema verification and archive integrity. A full Next.js/Prisma generated-client production build must be run once dependencies are available. Image persistence schema is ready, while production R2 upload wiring is intentionally deferred until infrastructure integration; no fake upload persistence is claimed.
