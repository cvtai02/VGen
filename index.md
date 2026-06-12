# VGen

VGen is a video generation service for creating composite, intro, and zhihugen videos through async render jobs.

## Folders

- `app/` — Fastify API, use cases, Prisma schema, infrastructure adapters, Remotion templates, and workers.
- `ui/` — Admin UI for settings, render job creation, and job status monitoring.
- `handoffs/` — Backend/UI coordination documents. Completed handoffs live in `handoffs/archive/`.

## Bootstrap

Copy `.env.example` to `.env` and fill in your values before starting:

```
SYSTEM_TOKEN=your-admin-token
DATABASE_URL=postgresql://vgen:vgen@localhost:5432/vgen
```

## Development

```
pnpm install
docker compose up -d
cd app && npm run db:migrate   # first run only
pnpm dev:app
pnpm dev:ui
pnpm dev:worker
```

Agents must read `rules.md` and the nearest `index.md` / `rules.md` before editing code.
