# Handoff: Initial Render and Settings API

Status: Pending
Direction: Backend to UI
Created: 2026-06-02
Owner: Backend

## Summary

Initial API contract for VGen render jobs and runtime settings.

## Context

The UI needs to create render jobs, inspect job status, and edit runtime JSON settings.

## Contract / Requirement

- POST /api/renders/composite
- POST /api/renders/intro
- GET /api/renders/:renderJobId
- GET /api/renders
- GET /api/settings
- PUT /api/settings

## Files Changed or Expected

- app/src/modules/renders/dtos/
- app/src/modules/renders/api/
- app/src/modules/settings/dtos/
- app/src/modules/settings/api/
- api-clients/src/

## Acceptance Criteria

- [ ] Requirement is implemented.
- [ ] API client is updated, if needed.
- [ ] Relevant `index.md` files are updated.
- [ ] Relevant `rules.md` files are updated, if needed.
- [ ] Smoke test passes, if applicable.

## Notes

UI must use the API clients from `api-clients/`.
