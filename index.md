# VGen

VGen is a server-rendered video generation application for creating composite videos and intro videos through async render jobs.

## Folders

- `app/` contains the Fastify API, use cases, Prisma context, infrastructure adapters, Remotion templates, and workers.
- `ui/` contains the admin/testing UI for settings, render creation, and job status.
- `api-clients/` contains portable native-fetch TypeScript clients and synced DTOs.
- `api-mcp-server/` contains local automation and smoke-test tooling.
- `handoffs/` contains backend/UI coordination documents.

## Development

- `pnpm install`
- `docker compose up -d`
- `pnpm dev:app`
- `pnpm dev:ui`
- `pnpm dev:worker`
- `pnpm sync:dtos`
- `pnpm smoke`

Agents must read `rules.md` and the nearest layer `index.md` / `rules.md` before editing code.
