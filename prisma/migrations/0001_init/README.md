# Initial Migration Placeholder

The Prisma schema for the initial OpsPilot Health release is finalized and validates successfully.

In this environment, `prisma migrate diff --script` hit a process-permission restriction (`spawn EPERM`), so the checked-in `migration.sql` could not be generated automatically.

Generate the initial SQL migration in a normal local shell with:

```bash
pnpm exec prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0001_init/migration.sql
```

Or create and apply the migration directly with:

```bash
pnpm prisma:migrate --name init
```
