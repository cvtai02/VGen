# Handoff: Settings DB Migration

Status: Completed
Direction: Backend to UI
Created: 2026-06-04
Archived: 2026-06-16
Owner: Backend and UI

## Summary

Runtime settings moved from local JSON-style configuration to the database. Bootstrap settings now live in `.env`, and the admin UI consumes the DB-backed settings APIs.

## Context

The app needs runtime settings to be editable from the admin UI while keeping only bootstrap secrets in the environment.

## Contract / Requirement

- `SYSTEM_SECRET`, `ENCRYPTION_KEY`, `DATABASE_CONNECTION_STRING`, and optional UI API base URL are bootstrap settings.
- Secret runtime settings are masked as `********` in API responses.
- Sending `********` back for a secret field preserves the stored value.
- Storage, TTS, and Zhihugen settings are available through protected bearer-token APIs.

## Files Changed Or Expected

- `app/src/config/settings.loader.ts`
- `app/src/config/settings.schema.ts`
- `app/src/modules/renders/api/storage-settings.api.ts`
- `app/src/modules/renders/api/tts-settings.api.ts`
- `app/src/modules/zhihugen/api/zhihugen-settings.api.ts`
- `ui/src/pages/SettingsPage.tsx`
- `ui/src/api/clients.ts`

## Acceptance Criteria

- [x] Runtime settings are persisted in the database.
- [x] Secret settings are encrypted before storage.
- [x] Masked secret values preserve existing secrets.
- [x] Admin UI can view and update supported settings.

## Notes

Completed in the same change set as the UI support.
