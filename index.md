# VGen

VGen is a video generation service with a Fastify API and an admin UI for runtime configuration and render job operations.

## Folders

- `app/` - Main business source code. Exposes the application APIs, Prisma schema, use cases, infrastructure adapters, and Remotion templates.
- `ui/` - Admin interface for logging in with the system secret, configuring runtime settings, managing Telegram bot delivery destinations, creating Zhihugen render jobs, and reviewing job status.
- `handoffs/` - Temporary coordination documents between backend and UI work.
  - `handoffs/backend-to-ui/` - Backend API contract changes for UI follow-up.
  - `handoffs/backend-to-ui/archive/` - Completed backend-to-UI handoffs.
  - `handoffs/ui-to-backend/` - UI requirements that need backend support.
  - `handoffs/ui-to-backend/archive/` - Completed UI-to-backend handoffs.
- `rules.md` - Project rules for structure, architecture, settings, migrations, tests, and handoffs.
- `AGENTS.md` - Instructions for AI agents working in this project.
- `CLAUDE.md` - Instructions for Claude working in this project.

## Bootstrap

`app/.env` contains only bootstrap settings:

```env
SYSTEM_SECRET=your-admin-login-secret
ENCRYPTION_KEY=your-runtime-settings-encryption-key
DATABASE_CONNECTION_STRING=postgresql://user:password@host:5432/vgen?sslmode=require
DATABASE_SSL=require
```

`ui` reads its API URL from `VITE_API_BASE_URL`; when omitted it uses `http://localhost:3000`.

## Development

```bash
pnpm install
pnpm --filter app db:generate
pnpm --filter app db:migrate
pnpm dev
```

The API listens on `http://localhost:3000` by default. The UI listens on `http://localhost:5173`.

Telegram delivery is configured from the admin UI Telegram page. It supports multiple bot tokens, multiple chat destinations per bot, manual destination add/remove, chat sync from Telegram updates, and automatic upload of completed generated videos to all enabled destinations.

Agents must read this file and `rules.md` before editing code. Inside `app/` or `ui/`, also read the nearest `index.md` and `rules.md`.
