# Handoff: Settings DB Migration

Status: Pending
Direction: Backend to UI
Created: 2026-06-04

## Summary

Runtime settings moved from JSON files to the database. Bootstrap settings (`SYSTEM_TOKEN`, `DATABASE_URL`) now live in `.env`.

## What Changed

- New `SystemSettings` Prisma model (singleton row, id = 1).
- `SettingsLoader` now reads/writes the DB instead of `config/settings.local.json`.
- `app.adminAccessToken` removed from settings — admin auth now uses `SYSTEM_TOKEN` env var.
- `database.*` removed from settings — DB URL is always in `.env`.
- New `featureFlags.enableZhihugenFlow` added.
- `restoreMasked` logic added: sending `"********"` for a token field keeps the existing value.

## Required Action

Run `cd app && npm run db:migrate` to create the `SystemSettings` table.

Copy `app/.env.example` to `app/.env` and set your values.

## Admin UI Impact

- Settings page no longer shows `adminAccessToken` or `database` fields.
- The system token used to authenticate settings updates comes from the `.env` `SYSTEM_TOKEN` value, stored in localStorage by the UI as before.
- Changing `redis.url` still requires a restart (`restartRequired: true` in response).

## Acceptance Criteria

- [ ] `npm run db:migrate` creates `SystemSettings` table.
- [ ] App starts and seeds default settings if no row exists.
- [ ] GET /api/settings returns settings without `adminAccessToken` or `database` fields.
- [ ] PUT /api/settings with valid SYSTEM_TOKEN saves changes.
- [ ] PUT /api/settings with invalid token returns 401.
- [ ] Masked token fields (`"********"`) are preserved on save.
