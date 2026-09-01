# SwiftTill Phase 08 Certification

Scope: Shifts, physical cash drawer accounting, opening cash, Cash In/Out, Safe Drop, Adjustment, blind-count close contract, variance approval, X semantics and immutable Z close foundation.

Certified checks require all Phase 00–08 domain regression tests, source/security verifier, TypeScript source checks where compiler is available, parent SHA continuity and ZIP integrity.

Hardware boundary: cash drawer pulse and direct USB Z printing remain Phase 11. Phase 08 certifies accounting/workflow contracts, not physical hardware operation.

Production build boundary: a Next.js production build is only certified if dependencies are installed and the build command actually passes. Missing dependencies are recorded, never treated as success.
