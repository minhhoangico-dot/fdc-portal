# Tasks Workspace

This directory is the shared workspace for agent coordination.

## Layout

- `todo.md`: current shared checklist
- `lessons.md`: correction-driven memory
- `decisions.md`: durable architecture and process decisions
- `active/`: one spec per non-trivial task
- `handoffs/`: short continuation notes between agents
- `templates/`: reusable task and handoff templates

## Rules

- Keep task specs small and current. If the plan changes, rewrite the spec instead of leaving contradictory notes.
- Use one active spec per non-trivial task.
- Prefer appending to `lessons.md` and `decisions.md` over creating more one-off memory files.
- If a handoff becomes the source of truth, promote the durable parts into `decisions.md` or `lessons.md`.
