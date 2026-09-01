# Phase 08 API Contract — Shifts & Cash Drawer

Commands are server-authoritative and permission-gated.

- `POST /api/shifts/open` — opening cash, authenticated actor, trusted terminal; rejects second OPEN shift for terminal.
- `GET /api/shifts/current` — current actor/terminal shift summary. Blind-count policy must omit expected cash where unauthorized.
- `POST /api/shifts/:id/cash-movements` — CASH_IN/CASH_OUT/SAFE_DROP/ADJUSTMENT; positive amount + reason; immutable correction via opposite movement.
- `GET /api/shifts/:id/x-report` — live read-only aggregation; never closes/reset shift.
- `POST /api/shifts/:id/close` — counted cash + idempotency key; locks shift, blocks pending payments/open orders unless explicit authorized override, calculates authoritative expected cash, requires manager approval above variance threshold, persists immutable Z and closes atomically.
- `GET /api/shifts/:id/z-report` — historical immutable snapshot. Reprint never recloses or recalculates.

Expected drawer = opening cash + completed cash payments - cash refunds - cash payment reversals + cash in - cash out - safe drops ± approved adjustments. Card/Online never affect physical drawer.

USB printer success/failure is outside shift-close transaction. A failed Z print never reopens a closed shift.
