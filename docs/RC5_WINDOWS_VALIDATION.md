# rc.5 Windows validation sequence

From the SwiftTill project root:

1. `pnpm install`
2. `pnpm prisma:generate`
3. `pnpm prisma:validate`
4. `pnpm build`
5. `pnpm run verify:rc5`
6. `pnpm prisma:migrate:status`

Stop after migration status and inspect the result before running `migrate deploy` against any existing database. Never use `migrate reset` or `db push` as a shortcut on production data.

For a brand-new empty database, after migration status/schema validation and backup policy are confirmed, deploy migrations, set first-run bootstrap variables temporarily, run `pnpm bootstrap:admin`, then remove the bootstrap PIN from `.env`.

Runtime health endpoint after `pnpm start`: `/api/health`.
