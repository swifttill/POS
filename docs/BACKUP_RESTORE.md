# PostgreSQL backup and restore runbook

## Backup
Use PostgreSQL-native tooling from a trusted administration host. Example placeholders:

`pg_dump --format=custom --file=swifttill-before-release.dump "$DATABASE_URL"`

Record the backup timestamp, database identity, release version and SHA-256 of the dump. Store it outside the application host according to the operator's retention policy.

## Verify backup
`pg_restore --list swifttill-before-release.dump > backup-contents.txt`

A backup is not accepted merely because `pg_dump` exited successfully. Restore it into an isolated test database and run integrity/smoke checks.

## Restore rehearsal
Create an empty isolated PostgreSQL database, restore with:

`pg_restore --clean --if-exists --no-owner --dbname="$RESTORE_DATABASE_URL" swifttill-before-release.dump`

Then validate core counts and financial reconciliation before treating the backup as recoverable.

## Production recovery
Stop writes before a destructive full restore. Preserve the failed database for forensic review. Restore only from a verified backup and document the recovery point. After recovery, reconcile orders, payments, refunds, shifts/Z reports and audit records before reopening POS terminals.
