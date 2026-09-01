# SwiftTill Windows Print Service
Windows-first localhost hardware bridge for installed USB thermal printers. It binds to `127.0.0.1`, requires `X-SwiftTill-Print-Token`, accepts immutable print jobs, encodes ESC/POS, and writes RAW bytes through the Windows spooler. Cash drawer opening uses the printer ESC/POS pulse. It does not contain payment logic and cannot roll back a completed sale.

Production packaging still requires installation on a real Windows POS and verification with the target printer/driver. Browser/system print remains a fallback outside the normal direct-print path.
