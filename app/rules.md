# App Rules

- Do not add repositories or abstraction layers on top of Prisma.
- Keep Prisma context in `src/core/database/`.
- Use cases may use Prisma context directly.
- Routes must call use cases when business behavior is involved.
- Routes must not access provider-specific infrastructure directly.
- Infrastructure implementations must implement shared-kernel contracts.
- Use one use case, one DTO, and one API endpoint/boundary per file.
- Runtime settings live in the database and secret values must be encrypted with `ENCRYPTION_KEY`.
- Settings schema lives in `src/config/settings.schema.ts`; update it when adding runtime settings.
- Entity classes must protect their invariants. When Prisma returns plain objects, validate invariants in use cases or shared value objects instead of adding a mapper layer.
- New render job types require an enum value in `RenderJobType`, DTOs, use cases, API file, and registration in the module `api/index.ts`.
- Update `app/index.md` when APIs, modules, use cases, or infrastructure adapters change.
