# Access + Enterprise Reporting Expansion Certification

Parent: SwiftTill-Final-Source-Release-Candidate.zip
Parent SHA-256: afa495fef9502f213b255c27a2555b7a3c76661805b636bade09bd0b2fb631b6

## Audit finding before expansion
The final RC already contained security primitives, Role/Permission/UserRole/Session database models and granular server permission helpers. However, it did NOT contain a dedicated `/login` page or `/admin/access` users/roles management page. Phase 10 had Item Sales calculation and a basic report list, but did NOT contain a full custom report builder or the broad report library requested here.

## Added
- `/login` secure sign-in UI contract.
- `/admin/access` Users, Roles & Permissions workspace.
- granular report permissions: item/custom/audit.
- expanded `/admin/reports` report library.
- `/admin/reports/custom` custom builder UI.
- `@swifttill/reporting-advanced-core` dimensions/metrics/filter/sort aggregation engine.
- Item-wise/PMIX preset and item-level analytics.
- SavedReportDefinition and ReportRunAudit database models/migration.
- CSV export helper in addition to prior Excel-compatible SpreadsheetML/PDF adapter/thermal output.
- official-POS benchmark research document.

## Boundary
These are source contracts and UI/application foundations. The current isolated environment still lacks installed Next.js dependencies, so no claim is made that the web app has completed a production Next build or live PostgreSQL integration test.
