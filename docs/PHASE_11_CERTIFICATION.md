# Phase 11 Certification — Windows Direct USB Thermal Printing

Scope: Windows-first localhost print-service boundary, ESC/POS receipt/report encoding, RAW Windows spooler bridge, printer discovery, cash-drawer pulse, retry/failure semantics, device/dispatch persistence, and printer configuration UI.

Certification is source/domain verification in this isolated Linux environment. It does **not** claim physical USB printer/cash-drawer verification, Windows service installation verification, Windows driver compatibility, or a Next.js production build when dependencies are unavailable.

Critical invariant: hardware failure is operational only. It never reverses or mutates a committed payment, refund, receipt snapshot, or Z close.
