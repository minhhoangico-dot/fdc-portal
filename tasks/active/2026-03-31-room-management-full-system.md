# Task Spec: room-management-full-system

## Goal

- Problem: Room Management currently works only as a frontend-first mock module, while the approved business flow requires real request integration, reviewer routing by room group, finance approval behavior, downstream handoffs, and new full-system roles with their own permissions.
- Desired outcome: Complete Room Management as a real portal workflow module backed by Supabase and a centralized permission matrix that governs the whole portal.

## Scope

- In scope:
  - Write and approve the full-system design spec.
  - Introduce the new room workflow architecture around the existing request engine.
  - Add the new roles and permission matrix across portal modules.
  - Plan the migration path from frontend-first mock state to the live workflow.
- Out of scope:
  - Multi-role-per-user support in the first pass.
  - A full replacement of `fdc_approval_requests` and `fdc_approval_steps`.

## Constraints

- Technical constraints:
  - Keep the existing request and approval engine as the execution backbone.
  - Preserve the approved room map layout and current portal visual theme.
  - Keep permissions centralized in typed application code, with SQL/RLS enforcing the resulting data boundaries.
- Product or operational constraints:
  - Material and maintenance flows must not be flattened into the same finance behavior.
  - New roles must be real portal roles, not temporary routing aliases.

## Assumptions

- Each user still has one primary role in `fdc_user_mapping` for the first implementation pass.
- The current `/requests` and `/approvals` pages remain the correct operator surfaces for formal requests and approvals.

## Affected Areas

- Files or directories:
  - `docs/superpowers/specs/2026-03-31-room-management-full-system-design.md`
  - `src/types/user.ts`
  - `src/types/roleCatalog.ts`
  - `src/lib/navigation.ts`
  - `src/lib/role-access.ts`
  - `src/lib/permissions/` or equivalent shared permission layer
  - `src/viewmodels/useRequests.ts`
  - `src/viewmodels/useApprovals.ts`
  - `src/app/requests/**`
  - `src/app/approvals/**`
  - `src/app/room-management/**`
  - `sql/*.sql` for role, workflow, and RLS changes
  - `tasks/todo.md`
  - `tasks/lessons.md`
- Systems touched:
  - Portal frontend
  - Supabase schema and RLS

## Role Split

- Planner: turn the approved spec into the implementation plan and sequence the rollout.
- Implementer: land schema, permission, room workflow, and UI integration changes without breaking the existing request engine.
- Verifier: run permission, workflow, RLS, and build checks before any rollout claims.
- Reviewer: confirm that role visibility, approval behavior, and handoff semantics match the user-approved business flow.

## Implementation Plan

- [x] Explore the existing room-management, requests, approvals, and role infrastructure.
- [x] Confirm the user-approved workflow and permission constraints.
- [x] Write the full-system design spec.
- [ ] Review and refine the written spec with the user.
- [ ] Create the detailed implementation plan after spec approval.
- [ ] Implement the permission matrix, role expansion, room workflow backend, and workflow-integrated UI.
- [ ] Verify and roll out the completed module safely.

## Verification Plan

- Command or check 1: design walkthrough against `src/lib/navigation.ts`, `src/lib/role-access.ts`, `src/viewmodels/useRequests.ts`, `src/viewmodels/useApprovals.ts`, and the current Room Management routes to ensure the spec matches the actual architecture.
- Command or check 2: manual review of the written spec for coverage of roles, permissions, workflow semantics, SQL/RLS, migration, and verification scope.
- Command or check 3: user review of the spec before implementation planning begins.

## Review Notes

- Findings:
  - Completing Room Management now requires a portal-wide authorization redesign, not just backend persistence for one module.
  - The room workflow must distinguish between approval decisions and downstream handoff work; forcing both into approval steps would produce the wrong behavior.
- Residual risks:
  - Many modules still use inline role checks, so the implementation plan must include systematic replacement rather than selective patching.

## Closeout

- Final status: spec written, awaiting user review before implementation planning
- Follow-up tasks:
  - Convert the approved design into an execution plan with rollout phases and verification gates.
