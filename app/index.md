# App

Fastify API server, Prisma schema, runtime settings loader, infrastructure adapters, Remotion templates, and render use cases.

## Bootstrap

`app/.env` contains:

- `SYSTEM_SECRET` - admin login secret.
- `ENCRYPTION_KEY` - encryption key for secret runtime settings stored in the database.
- `DATABASE_CONNECTION_STRING` - Prisma PostgreSQL connection string.
- `DATABASE_SSL` - set to `require` when the database requires SSL.

All other runtime settings are stored in the `SystemSettings` table and loaded at startup.

## Key Folders

- `src/config/` - Runtime settings schema, defaults, encryption, and DB-backed loader.
- `src/core/` - Prisma client/context and shared-kernel contracts, enums, and API error shape.
- `src/infrastructure/` - Non-ORM infrastructure adapters such as render engines, storage, and concurrency.
- `src/modules/auth/` - System-secret login and bearer token verification.
- `src/modules/renders/` - Render job APIs, settings APIs, DTOs, and use cases.
- `src/modules/zhihugen/` - Zhihugen render flow APIs and DB-backed feature settings.
- `src/remotion/` - Remotion compositions and templates.
- `prisma/` - PostgreSQL schema and migrations.

## APIs

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/auth/login` | Exchange `SYSTEM_SECRET` for a bearer token |
| GET | `/api/health` | Public health check |
| GET | `/api/settings/tts` | Get TTS settings with masked secrets |
| POST | `/api/settings/tts` | Update TTS settings |
| GET | `/api/settings/telegram` | Get Telegram delivery settings with masked bot token |
| POST | `/api/settings/telegram` | Update Telegram delivery settings |
| GET | `/api/features/zhihugen/settings` | Get Zhihugen runtime settings |
| POST | `/api/features/zhihugen/settings` | Update Zhihugen runtime settings |
| GET | `/api/tts/models` | List TTS models |
| POST | `/api/zhihugen/render` | Create a Zhihugen render job |
| GET | `/api/zhihugen/jobs` | List Zhihugen jobs |

## Migrations

Run `pnpm --filter app db:migrate` after any `prisma/schema.prisma` change.
