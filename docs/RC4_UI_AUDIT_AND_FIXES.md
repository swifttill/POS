# SwiftTill rc.4 — UI audit and fixes

Parent: SwiftTill v1.0.0-rc.3 Custom Role Access certified source.

## UI issues found and corrected

1. Back-office pages had no single persistent navigation shell. A shared responsive back-office navigation layout now covers Dashboard, Reports, Menu, Access, Shifts and Printers, with a return-to-POS action.
2. Several classes used by newer pages had no CSS definitions (`ops-header`, `primary-action`, `ops-workspace`, `ops-toolbar`, `ops-list`, `ops-detail`, `adminPage`, `pageHeader`, `settingsCard`, `detail-actions`). These caused visibly inconsistent or effectively unstyled screens. They now use one cohesive workstation visual system.
3. Advanced report filters declared grid columns while the inherited component remained `display:flex`; the columns therefore had no effect. It now uses an actual responsive CSS grid.
4. Empty-cart PAY was an anchor with a `disabled` class, but only the CSS `:disabled` pseudo-class was styled. It could therefore look active while having no destination. The disabled anchor state is now visually and interactively disabled.
5. POS tablet widths could wrap the top bar while retaining a fixed workspace height based on the old 64px bar, producing clipping/overflow. Tablet layouts now switch the shell/workspace to auto height and scrolling.
6. The mobile category rail could stick at the top behind the wrapped POS header. Its mobile sticky offset now accounts for the wrapped top bar.
7. F2 was shown but not implemented in the POS keyboard listener. F9 was also shown but not wired. F2 now has a dirty-order confirmation guard; F9 navigates only when a payable cart exists.
8. POS shortcuts could fire while a user typed in inputs. Function shortcuts now ignore INPUT, TEXTAREA, SELECT and contenteditable targets, while Ctrl/Cmd+K remains an intentional search shortcut.
9. The Pax control used a `label` containing buttons. It is now a semantic button group with accessible names and a live count.
10. The root route still contained the old Phase 02 sample catalogue and a separate obsolete admin sidebar. Root now routes to secure login, and Menu has its own `/admin/menu` page under the shared admin shell with no demonstration products/prices.
11. Role permission rows/checkboxes received larger touch targets and consistent focus behavior.
12. Confirmation/destructive states received consistent modal/action styling, including a clearly destructive discard action.

## Verification boundary

The source-level UI contract and all existing regression suites are checked. This environment still lacks installed Next.js dependencies, so a real Next production build and browser-rendered visual regression suite are not certified here. Those are required when dependencies/runtime are available.
