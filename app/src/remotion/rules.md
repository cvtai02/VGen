# Remotion Rules

Remotion components must stay template-focused.
Business logic belongs in use cases.
Render orchestration belongs in the Remotion render-engine infrastructure adapter.
Remotion components must receive normalized props and must not call databases, queues, settings stores, or external APIs.
