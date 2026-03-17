# OpsPilot Health

OpsPilot Health is a production-style multi-tenant clinic operations SaaS built with Next.js App Router, Prisma/PostgreSQL, Auth.js credentials auth, Supabase Storage, Google Gemini, and Resend.

## What’s Included

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
- Google Gemini via REST API
- Resend for transactional email

## Environment

Copy `.env.example` to `.env` and provide real values for:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `GOOGLE_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

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
- If you want a checked-in SQL migration file, run Prisma migrate in an environment where `prisma migrate diff` is permitted; the schema is already ready for it.
