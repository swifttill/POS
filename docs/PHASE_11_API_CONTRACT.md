# Phase 11 — Local Windows Print Service Contract

## Local endpoint
`POST http://127.0.0.1:4317/v1/print`
Header: `X-SwiftTill-Print-Token: <workstation secret>`

The service MUST bind only to loopback. A print request contains a persisted job ID, selected installed Windows printer, document kind, immutable rendered text, copy count, cut flag, and optional drawer pulse.

## Normal flow
1. Financial/order operation commits on the server.
2. Immutable ReceiptDocument/Report/Z snapshot exists.
3. Server queues a print job.
4. Browser/agent sends the job to the local SwiftTill Print Service.
5. Service encodes ESC/POS and submits RAW bytes to the installed Windows USB printer.
6. Dispatch success/failure is recorded separately.

Printer failure MUST NOT reverse payment, refund, shift close, or any finalized financial state. Retry reuses the same persisted financial document.

## Discovery
Windows printer discovery uses `Get-Printer`; configured device identity is the Windows system printer name. V1 supports 80mm primary and 58mm optional receipt printers.

## Cash drawer
Drawer opening is an explicit ESC/POS pulse routed through the configured receipt printer. It is never represented as a financial transaction.

## Security
No LAN bind, no cloud print relay, no printer credentials in browser source. The localhost service requires a workstation token. Production installer must generate/store that token locally.

## Fallback
Browser/system print may remain available as a manual fallback. It is not the normal direct-print path.
