# Project Rules

## Architecture

- Do not add a repository layer.
- Do not add an abstraction layer on top of Prisma.
- Prisma context belongs in the application core.
- Use cases may depend directly on Prisma context.
- Controllers/routes must call use cases.
- Controllers/routes must not access infrastructure directly.
- DTOs must be shared by API routes/controllers and use cases.
- Infrastructure implementations must implement core/shared-kernel contracts.

## Settings

- Bootstrap settings (system token, database URL) live in `.env` only.
- All runtime settings are stored in the `SystemSettings` database table (singleton row, id = 1).
- Runtime settings are loaded from the database at startup and seeded with defaults on first run.
- Settings must be viewable and editable from the admin UI.
- Masked token values (`"********"`) must be restored from the stored value before saving.
- Changing `redis.url` requires an application restart.

## File Granularity

- One use case per file.
- One DTO per file.
- One API endpoint or API boundary per file.
- Registration files may compose APIs but must not contain endpoint business logic.

## Handoffs

- Every API contract change must create a backend-to-UI handoff in `handoffs/`.
- Every UI requirement needing backend support must create a UI-to-backend handoff.
- Completed handoffs must be moved to `handoffs/archive/`.
