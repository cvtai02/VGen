# Renders Rules

- Each use case stays in its own file.
- Each DTO stays in its own file.
- Each API file owns one endpoint.
- Entities must protect their own constraints.
- Invalid render status transitions must throw a domain error.
- Valid transitions: `Pending -> Rendering`, `Pending -> Cancelled`, `Rendering -> Completed`, `Rendering -> Failed`, `Rendering -> Cancelled`, `Failed -> Pending`.
