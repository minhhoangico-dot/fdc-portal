# Codebase Optimization Multi-Agent Plan

This folder splits the codebase optimization work into separate execution plans for multiple agents. Each plan has a narrow write scope, explicit dependencies, and verification commands.

## Execution Order

1. `01-verification-baseline.md` must run first. It restores trustworthy checks and creates the repo-local task spec.
2. After Agent 01 completes, Agents 02, 03, 04, and 05 can run in parallel if each keeps to its write scope.
3. `06-final-verification-review.md` runs last after all implementation agents have landed their work.

## Agent Assignment Matrix

| Plan | Role | Can Run In Parallel | Primary Write Scope |
|---|---|---:|---|
| `01-verification-baseline.md` | verifier/planner | No, prerequisite | `tsconfig.json`, bridge failing fixture, `tasks/**` |
| `02-portal-bundle-pwa.md` | portal-worker | Yes, after 01 | `src/App.tsx`, `vite.config.ts`, bundle scripts |
| `03-portal-presentation-refactor.md` | portal-worker | Yes, after 01 | `src/app/pharmacy/**`, `src/app/inventory/**` |
| `04-portal-viewmodel-realtime.md` | portal-worker | Yes, after 01 | `src/viewmodels/**`, `src/lib/*approval*`, realtime helper |
| `05-bridge-refactor.md` | bridge-worker | Yes, after 01 | `fdc-lan-bridge/src/labDashboard/**`, `fdc-lan-bridge/src/weeklyReport/**` |
| `06-final-verification-review.md` | verifier/reviewer | No, final gate | `tasks/**`, verification records |

## Shared Rules

- Do not revert unrelated dirty worktree changes.
- Inspect `git diff -- <path>` before editing a modified file.
- Portal imports must use `@/`.
- New source files need the Apache-2.0 license header.
- Each agent should leave a handoff in `tasks/handoffs/` if another agent must continue or review an unresolved risk.
- No agent should touch another agent's primary write scope without coordinating through `tasks/active/2026-04-30-codebase-optimization.md`.

