# Project Rules

## VGen-Specific Rules

- Do not add a repository layer.
- Do not add an abstraction layer on top of Prisma.
- Prisma context belongs in the application core.
- Use cases may depend directly on Prisma context.
- Controllers/routes must call use cases.
- Controllers/routes must not access infrastructure directly.
- DTOs must be shared by API routes/controllers and use cases.
- One use case per file.
- One DTO per file.
- One API endpoint or API boundary per file.
- Infrastructure implementations must implement core/shared-kernel contracts.
- Runtime settings must be stored in ignored JSON files.
- Settings must be viewable and editable from the UI.
- API client DTOs must be synced from `app/`.
- Every API contract change must create a backend-to-UI handoff.
- Every UI requirement needing backend support must create a UI-to-backend handoff.

## File Granularity

- A use case file exports one primary use case class or function.
- A DTO file exports one primary DTO.
- An API file defines one endpoint or one clear API boundary.
- Registration files may compose APIs but must not contain endpoint business logic.
