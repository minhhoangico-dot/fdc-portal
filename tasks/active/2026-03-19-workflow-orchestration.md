# Task Spec: workflow-orchestration

## Goal

- Problem: the repository had agent guidance files, but it did not have a durable shared workspace for planning, handoffs, lessons, and write-scope boundaries.
- Desired outcome: add a repo-native orchestration structure that lets multiple agents coordinate and inherit context from earlier work.

## Scope

- In scope: workflow documentation, shared task files, agent role registry, and wiring the workflow into repo guidance.
- Out of scope: application runtime behavior, build pipeline changes, or tool-specific automation beyond reusable file structure.

## Constraints

- Technical constraints: avoid disrupting existing application code or unrelated in-progress work in the dirty tree.
- Product or operational constraints: the workflow must fit both portal and bridge work and stay simple enough to use during real tasks.

## Assumptions

- Agents collaborating on this repository can read repo-local markdown and YAML files.
- Future work will benefit more from a lightweight file-based workflow than from adding custom runtime tooling.

## Affected Areas

- Files or directories: `WORKFLOW.md`, `agents/`, `tasks/`, `AGENTS.md`, `CLAUDE.md`
- Systems touched: repository documentation and repo-local operating process

## Role Split

- Planner: define the shared workflow, directory layout, and operating rules.
- Implementer: create the new docs and templates.
- Verifier: inspect the created files and confirm the guidance points to them.
- Reviewer: capture any residual process risks.

## Implementation Plan

- [x] Define the workflow lifecycle and shared file map.
- [x] Create `tasks/` files for planning, decisions, lessons, templates, and handoffs.
- [x] Create `agents/registry.yaml` and supporting role guidance.
- [x] Update `AGENTS.md` and `CLAUDE.md` to point future agents at the new workflow.
- [x] Review the generated structure and verify the key files.

## Verification Plan

- Command or check 1: inspect the new directory tree under `tasks/` and `agents/`
- Command or check 2: read `WORKFLOW.md`, `tasks/todo.md`, `tasks/lessons.md`, `tasks/decisions.md`, and `agents/registry.yaml`
- Command or check 3: confirm `AGENTS.md` and `CLAUDE.md` both reference the new workflow files

## Review Notes

- Findings: none during the bootstrap pass
- Residual risks: success depends on future agents actually updating `tasks/todo.md`, `tasks/lessons.md`, and `tasks/decisions.md` instead of letting them drift

## Closeout

- Final status: done
- Follow-up tasks: create the next spec from this pattern when the next non-trivial task starts
