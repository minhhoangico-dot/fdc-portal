# Workflow Orchestration

This repository now has a shared workflow layer for multi-agent execution. The goal is simple:

- plan before non-trivial work
- split work without overlapping write scopes
- leave durable handoffs for the next agent
- convert mistakes and corrections into reusable project memory

## Read Order

Every agent should read these files before starting related work:

1. `AGENTS.md`
2. `CLAUDE.md` if that agent uses Claude-specific repo guidance
3. `WORKFLOW.md`
4. `tasks/lessons.md`
5. `tasks/decisions.md`
6. `tasks/todo.md`
7. the relevant spec in `tasks/active/`
8. the latest handoff in `tasks/handoffs/`

## Shared Files

| File | Purpose |
|---|---|
| `tasks/todo.md` | Shared checklist for the current non-trivial task |
| `tasks/active/*.md` | Detailed task specs with scope, assumptions, and verification plan |
| `tasks/handoffs/*.md` | Short status packets between agents |
| `tasks/lessons.md` | Correction-driven memory that future agents must reuse |
| `tasks/decisions.md` | Durable architecture and process decisions |
| `agents/registry.yaml` | Role definitions and write-scope boundaries |

`tasks/` is the canonical workflow area for agent coordination. Legacy root files such as `todo.md` and `plan.md` can still exist, but they do not replace this shared structure.

## Operating Rules

### 1. Plan First

Use a written plan for any task that has at least one of these properties:

- three or more implementation steps
- architectural tradeoffs
- cross-cutting edits across portal, bridge, SQL, or Supabase functions
- non-trivial verification

Before code changes, create or update a spec in `tasks/active/` and reflect the checklist in `tasks/todo.md`.

If the task goes sideways, stop and re-plan. Do not keep pushing with a stale plan.

### 2. One Task Per Agent

Each agent should own one focused task at a time.

- split by write scope whenever possible
- avoid multiple agents editing the same file set
- treat `agents/registry.yaml` as the default boundary map
- use handoffs when work must cross from one role to another

### 3. Shared Memory, Not Tribal Memory

Agents inherit experience through files, not by hoping the next model guesses correctly.

- durable project rules belong in `tasks/decisions.md`
- user corrections and avoidable mistakes belong in `tasks/lessons.md`
- task-local state belongs in `tasks/active/` and `tasks/handoffs/`

After any correction from the user, append a lesson with:

- what went wrong
- the rule that prevents a repeat
- the trigger for when future agents should re-read that lesson

### 4. Verification Before Done

No task is complete until the proof is written down.

- record commands run
- record results, not just intent
- note gaps if a check could not be executed
- capture residual risks in the task spec or handoff

The verifier or reviewer should be able to approve the work from the written record alone.

### 5. Prefer the Simplest Defensible Solution

For non-trivial changes, pause before implementation and ask whether the design can be simplified without reducing correctness. Do not over-engineer routine fixes. Do not accept a hack if the elegant solution is already clear.

### 6. Autonomous Cleanup

When a bug or failing test is reported, the default expectation is full ownership:

- locate the failure signal
- identify the root cause
- implement the fix
- verify the fix
- document the lesson if the failure exposed a preventable pattern

## Task Lifecycle

1. Create `tasks/active/<task-id>.md` from `tasks/templates/task-spec.template.md`.
2. Update `tasks/todo.md` with a concrete checklist and current owner.
3. Split work using roles from `agents/registry.yaml`.
4. Each agent leaves a handoff in `tasks/handoffs/` if another agent needs to continue.
5. Verification results go into the active spec or a handoff before the task is marked done.
6. Any new durable decision is appended to `tasks/decisions.md`.
7. Any correction-based learning is appended to `tasks/lessons.md`.

## File Naming

- active specs: `tasks/active/<yyyy-mm-dd>-<task-id>.md`
- handoffs: `tasks/handoffs/<yyyy-mm-dd>-<task-id>-<role>.md`

Keep names stable and grep-friendly.
