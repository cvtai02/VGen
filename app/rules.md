# App Rules

- Do not add repositories.
- Keep Prisma context in `src/core/database`.
- Routes must call use cases and must not access infrastructure directly.
- Use one use case, one DTO, and one API endpoint per file.
