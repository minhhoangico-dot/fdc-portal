# Agent Roles

Use `agents/registry.yaml` as the default role map for multi-agent work in this repository.

## Coordination Rules

- The planner owns decomposition, scope, and `tasks/todo.md`.
- Implementation agents own disjoint write scopes.
- The reviewer or verifier should not be the only source of proof; implementation agents still record what they ran.
- If a task crosses portal, bridge, and SQL boundaries, split it into separate specs or handoffs instead of letting one agent improvise across the entire stack.

## Required Inputs

Before starting, each agent should read:

- `WORKFLOW.md`
- `tasks/lessons.md`
- `tasks/decisions.md`
- the active task spec
- the latest relevant handoff

## Handoff Standard

Every handoff should cover:

- current status
- files touched or intentionally avoided
- verification already completed
- open risks or blockers
- exact next step for the next role

Use `tasks/templates/handoff.template.md` instead of inventing a new format each time.
