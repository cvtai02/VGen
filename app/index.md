# App

Fastify API server, use cases, Prisma schema, infrastructure adapters, Remotion render engine, and BullMQ workers.

## Architecture

Routes call use cases. Use cases may use Prisma context directly. Infrastructure implements shared-kernel contracts.

## Bootstrap

`SYSTEM_TOKEN` and `DATABASE_URL` are read from `.env`. All other settings are stored in the `SystemSettings` DB table and loaded at startup via `SettingsLoader`.

## Key Folders

- `src/config/` — Settings schema, loader (DB-backed), defaults.
- `src/core/` — Prisma client, shared-kernel contracts and enums.
- `src/infrastructure/` — Queue (BullMQ), render engine (Remotion), storage (7router), TTS, media source adapters.
- `src/modules/renders/` — Render job API, use cases, DTOs. Types: Composite, Intro, Zhihugen.
- `src/modules/settings/` — Settings API, use cases, DTOs.
- `src/workers/` — BullMQ render worker entry point.
- `prisma/` — Database schema (`RenderJob`, `RenderAsset`, `RenderJobEvent`, `SystemSettings`).

## APIs

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/renders/composite` | Create composite render job |
| POST | `/api/renders/intro` | Create intro render job |
| POST | `/api/renders/zhihugen` | Create zhihugen render job |
| GET | `/api/renders` | List render jobs |
| GET | `/api/renders/:id` | Get render job status |
| GET | `/api/settings` | Get runtime settings (tokens masked) |
| PUT | `/api/settings` | Update runtime settings (requires SYSTEM_TOKEN) |
| GET | `/api/health` | Health check |

## Migrations

Run `npm run db:migrate` after any `prisma/schema.prisma` change.
