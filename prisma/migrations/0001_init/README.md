# Initial Migration

The initial SQL migration is checked in at `prisma/migrations/0001_init/migration.sql`.

Use one of these setup paths:

- Local PostgreSQL: run `pnpm prisma:migrate --name init`
- Supabase PostgreSQL: apply `migration.sql` in the Supabase SQL Editor, then run `pnpm prisma:seed`

If you are using Supabase, prefer this split:

- `DATABASE_URL`: pooled Postgres URI on port `6543`
- `DIRECT_URL`: direct Postgres URI on port `5432`

That keeps app runtime and seeding on the pooled connection while preserving a direct connection for Prisma migration workflows.