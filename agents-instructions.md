# Agent Instructions

Agents must read `rules.md` before changing code.

Every time an agent uses a skill, it must report the skill name used.

Required skill names:

- Implement API Skill
- Implement Infrastructure Skill
- Smoke Test Skill

Generated code must be separated into appropriate files and folders so it can be indexed and searched reliably.

File granularity rules:

- One use case per file.
- One DTO per file.
- One API endpoint or API boundary per file.
- Index/registration files are allowed, but they must not contain business logic or multiple endpoint implementations.

Agents must update relevant `index.md` and `rules.md` files whenever APIs, DTOs, use cases, infrastructure adapters, module boundaries, or handoff statuses change.
