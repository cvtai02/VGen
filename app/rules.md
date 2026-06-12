# App Rules

- Do not add repositories or abstract layers on top of Prisma.
- Keep Prisma context in `src/core/database/`.
- Routes must call use cases and must not access infrastructure directly.
- Use one use case, one DTO, and one API endpoint per file.
- Settings schema lives in `src/config/settings.schema.ts` — update it when adding new runtime settings.
- New render job types require: enum value in `RenderJobType`, DTO, usecase, API file, registration in `api/index.ts`.
- Update `app/index.md` whenever APIs, modules, use cases, or infrastructure adapters change.
