# FlowLedger

FlowLedger is a personal finance dashboard for fast manual entry, multi-currency account tracking, recurring bills, credit card billing cycles, wallet balances, refunds, installments, and cash.

The first version is planned as a mobile-first Next.js app backed by SQLite. It should work well on a phone browser today and remain easy to deploy on a NAS later.

## Planned Stack

- Next.js App Router
- TypeScript
- SQLite
- Drizzle ORM
- Docker Compose for future NAS deployment
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
npm run db:generate
npm run db:migrate
npm run db:seed
npm run lint
npm run build
```

## Database

Local development uses `./data/flowledger.db`, which is ignored by git. The schema is defined in `src/db/schema.ts`, migrations live in `src/db/migrations`, and the default accounts, categories, payment methods, credit cards, and quick entry templates are seeded by `scripts/seed.mjs`.

Money is stored as integer minor units. JPY values are whole yen, while CNY values are fen.

## Documentation

The current product requirements are in [docs/requirements.md](docs/requirements.md).
The development plan is in [docs/development-plan.md](docs/development-plan.md).
Development progress is tracked in [docs/progress.md](docs/progress.md).
