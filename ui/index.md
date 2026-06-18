# UI

Vite React admin interface for VGen.

## Responsibilities

- Log in with the app `SYSTEM_SECRET`.
- Store the issued bearer token in local storage.
- Configure DB-backed runtime settings through protected app APIs.
- Configure Telegram delivery for completed Zhihugen videos.
- Create Zhihugen render jobs.
- Review and manage render job status.

## Key Folders

- `src/api/` - Fetch clients and DTO shapes used by UI pages.
- `src/components/` - Reusable UI components.
- `src/pages/` - Admin screens.
- `src/styles/` - Application CSS.

The UI uses `VITE_API_BASE_URL` when set and falls back to `http://localhost:3000`.
