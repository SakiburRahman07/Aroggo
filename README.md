# OpsPilot Health

OpsPilot Health is a production-style multi-tenant clinic operations SaaS built with Next.js App Router, Prisma/PostgreSQL, Auth.js credentials auth, Supabase Storage, Groq, and Resend.

## What's Included

- Multi-tenant clinic workspace model with role-based access control
- Auth flows for login, signup, invites, forgot password, and reset password
- Patients, appointments, visits, tasks, comments, notifications, and analytics
- Document upload, storage, extraction, summarization, structured extraction, and retrieval chunking
- Grounded AI assistant for Q&A, visit drafting, meeting-note-to-task extraction, and operational summaries
- Audit logging, email logging, and provider abstractions

## Stack

- Next.js 15 + TypeScript + Tailwind CSS
- Prisma ORM + PostgreSQL
- Auth.js / NextAuth credentials provider with Prisma adapter
- Supabase Storage for document files
- Groq via `groq-sdk`
- Resend for transactional email

## Environment

Copy `.env.example` to `.env` and provide real values for:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `GROQ_API_KEY`
- `GROQ_MODEL` optional
- `GROQ_STRUCTURED_MODEL` optional
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

### Groq Notes

The default text model is `meta-llama/llama-4-scout-17b-16e-instruct`.
Structured extraction uses `GROQ_STRUCTURED_MODEL` when provided, otherwise it falls back to `GROQ_MODEL`.

Operational summaries are cached for 15 minutes, and document uploads now fall back to deterministic summaries if the LLM provider is unavailable or rate-limited.

### Supabase Postgres Notes

If you are using Supabase as your remote PostgreSQL database, use two different connection strings:

- `DATABASE_URL`: Supabase pooled connection string on port `6543`
- `DIRECT_URL`: Supabase direct connection string on port `5432`

This matters because Prisma Client, the app runtime, and `pnpm prisma:seed` all use `DATABASE_URL`, while Prisma migration workflows use `DIRECT_URL` when available.

If your seed fails with `Can't reach database server at db.<project-ref>.supabase.co:5432`, your machine is trying to use Supabase's direct host for runtime traffic. On some networks that host is unreachable or resolves over IPv6 only. Switch `DATABASE_URL` to the pooled Supabase URI and keep `DIRECT_URL` on the direct host.

You can also do a one-off seed override without changing the app's main runtime configuration:

```powershell
$env:PRISMA_DATABASE_URL = "<pooled-postgres-uri>"
pnpm prisma:seed
```

## Local Setup

1. Install dependencies.

```bash
pnpm install
```

2. Generate the Prisma client.

```bash
pnpm prisma:generate
```

3. Apply your schema to PostgreSQL.

```bash
pnpm prisma:migrate --name init
```

If you only want a quick local sync without a committed migration yet, use:

```bash
pnpm db:push
```

4. Seed demo data if you want a ready-made workspace.

```bash
pnpm prisma:seed
```

5. Start the app.

```bash
pnpm dev
```

## Demo Credentials

After seeding:

- `admin@demo.opspilot.health` / `DemoPass123!`
- `doctor@demo.opspilot.health` / `DemoPass123!`
- `reception@demo.opspilot.health` / `DemoPass123!`

## Useful Commands

```bash
pnpm exec tsc --noEmit
pnpm exec eslint .
pnpm exec next build
pnpm exec prisma validate
```

## Notes

- AI output is positioned for documentation and operations support, not diagnosis.
- Document processing currently supports direct text extraction for plain text, JSON, and PDF uploads.
- Signed Supabase URLs are used for protected document access.
- The Prisma schema is validated and the app build passes with the configured environment.