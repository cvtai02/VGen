# UI Rules

- Use the local client functions in `src/api/clients.ts`; do not scatter raw fetch calls through pages.
- Send protected requests with `Authorization: Bearer <token>`.
- Store the issued admin bearer token in local storage only.
- Do not use cookies for auth.
- Create a UI-to-backend handoff for new backend requirements.
- Update `ui/index.md` when pages, client APIs, or responsibilities change.
