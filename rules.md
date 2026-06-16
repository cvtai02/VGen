# Project Rules

## Project Structure

- `app/` contains the main business source code and application APIs.
- `ui/` contains the admin interface.
- `handoffs/` contains temporary backend/UI coordination documents.
- `index.md`, `rules.md`, `AGENTS.md`, and `CLAUDE.md` must stay current at the root.
- `app/` and `ui/` are the only workspace roots.

Framework best practice takes priority inside each workspace root.

## Settings

- Only bootstrap settings live in `.env`: `SYSTEM_SECRET`, `ENCRYPTION_KEY`, `DATABASE_CONNECTION_STRING`, and optional `API_BASE_URL` / `VITE_API_BASE_URL`.
- Runtime settings live in the database and must be viewable and editable from the admin UI.
- Secret runtime settings stored in the database must be encrypted with `ENCRYPTION_KEY`.
- Masked secret values sent as `********` must preserve the existing stored secret.

## Admin UI And Auth

- The admin UI logs in with `SYSTEM_SECRET`.
- Protected API endpoints authenticate with `Authorization: Bearer <token>`.
- Never use cookie sessions and never send tokens in query strings.
- CORS must allow all origins, methods, and headers without credentials.

## Architecture

- Do not add a repository layer or abstraction layer on top of Prisma.
- Prisma context belongs in `app/src/core/database/`.
- Use cases may depend directly on Prisma context.
- Routes/controllers call use cases where business behavior is involved.
- Infrastructure implementations must implement contracts defined in the core/shared kernel.
- Do not leak provider-specific infrastructure details into use cases or API handlers.

## Modules

- Each module should contain `usecases/`, `api/`, and `dtos/` where applicable.
- Each use case must be in its own file.
- Each API/controller boundary must be in its own file.
- Each DTO must be in its own file.
- DTOs should be shared by API handlers and use cases.

## Core / Shared Kernel

Shared kernel code may contain enums, constants, policies, value objects, shared types, infrastructure contracts, and cross-module concepts. Keep it stable and broadly reusable.

## Entities And Aggregates

- Entity classes must define and protect the constraints of that entity.
- Use public and private properties/methods properly so invalid state cannot be created or persisted accidentally.
- Aggregates must define and protect constraints involving relationships between multiple entities.
- When Prisma returns plain objects instead of entity classes, validate invariants in use cases and shared value objects rather than introducing a mapping layer over Prisma.

## API Errors

All APIs return one JSON error shape:

```json
{ "statusCode": 401, "error": "Unauthorized", "message": "Missing or invalid bearer token." }
```

Changing this shape is an API contract change and must follow the handoff rules.

## Database Migrations

- All schema changes go through Prisma migrations.
- Commit migrations with the code that requires them.
- Never edit the database schema manually.

## Testing

A passing smoke test is required for every change. Unit tests are encouraged for shared value objects, policies, and non-trivial use cases.

## Handoffs

- Backend API contract changes create a backend-to-UI handoff unless the UI change ships in the same change set.
- UI requirements needing backend support create a UI-to-backend handoff.
- Completed handoffs move into the matching `archive/` folder.
