# FlowLedger

FlowLedger is a personal finance dashboard for fast manual entry, multi-currency account tracking,
recurring bills, credit card billing cycles, wallet balances, refunds, installments, and cash.

The first version is a mobile-first Next.js app backed by SQLite locally and libsql (Turso) in
production. It works well on a phone browser and deploys to Vercel + Turso.

## Stack

- Next.js 16 App Router + TypeScript
- Tailwind v4 + shadcn/ui (base-nova) + lucide-react + next-themes
- Drizzle ORM with libsql (local file in dev, Turso in production)
- vitest for domain unit tests
- PWA manifest for adding the app to a phone home screen

## Project Structure

```text
src/app/       Next.js pages and app shell
src/db/        Database schema and migrations
src/domain/    Finance domain types and rules
docs/          Product requirements and planning notes
```

## Development

Install dependencies:

```bash
npm install
```

Prepare the local SQLite database:

```bash
npm run db:setup
```

Run locally:

```bash
npm run dev
```

Then open `http://localhost:3000`.

Useful commands:

```bash
npm run db:generate         # 改完 schema 后生成新 migration
npm run db:migrate          # 应用 migration（按 DATABASE_URL 走本地 or Turso）
npm run db:seed
npm run db:reset            # 清库重建本地（含 WAL sidecar）
npm test
npm run lint
npm run build
```

## Database

Local development uses `file:./data/flowledger.db`, which is ignored by git. Production uses Turso
(libsql) via env vars `DATABASE_URL` + `DATABASE_AUTH_TOKEN`. The same Drizzle schema and migrations
work for both.

Schema is defined in `src/db/schema.ts`, migrations live in `src/db/migrations`, defaults are seeded
by `scripts/seed.mjs`. Money is stored as integer minor units (JPY = whole yen, CNY = fen).

## Deployment

See [docs/deployment.md](docs/deployment.md) for the Vercel + Turso setup walk-through.

## Documentation

The current product requirements are in [docs/requirements.md](docs/requirements.md). The
development plan is in [docs/development-plan.md](docs/development-plan.md). Development progress is
tracked in [docs/progress.md](docs/progress.md). Code guidelines are in
[docs/code-guidelines.md](docs/code-guidelines.md). The UI direction is in
[docs/ui-direction.md](docs/ui-direction.md).
