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
- [x] Review and refine the written spec with the user.
- [x] Create the detailed implementation plan after spec approval.
- [x] Implement the permission matrix, role expansion, room workflow backend, and workflow-integrated UI.
- [x] Verify and roll out the completed module safely.

## Verification Plan

- Command or check 1: `cmd /c npm run build`
- Command or check 2: `cmd /c npx tsx --test test\unit\permissionMatrix.test.ts test\unit\navigation.test.ts test\unit\approvalsQueue.test.ts test\unit\roomWorkflowRouting.test.ts test\unit\roomWorkflowHelpers.test.ts test\unit\roomWorkflowState.test.ts test\unit\roomCatalog.test.ts test\unit\roomSummary.test.ts test\unit\roomMaintenance.test.ts test\unit\roomPrint.test.ts test\unit\roomState.test.ts`
- Command or check 3: `cmd /c npm run lint` for repo-wide typecheck awareness, expecting unrelated legacy failures outside the room-workflow slice.

## Review Notes

- Findings:
  - Room Management now persists raw intakes in `fdc_room_intakes`, routes reviewer work by room review group, and uses `/requests` plus `/approvals` as the formal workflow surfaces.
  - Material consolidation now creates approved purchase requests with automatic downstream handoffs, while maintenance promotion creates a real `chief_accountant` approval gate with manual forward choice in request detail.
- Residual risks:
  - The SQL migration and frontend deploy are now applied, but authenticated browser smoke for reviewer and downstream roles is still pending.
  - Production already had a legacy `fdc_room_catalog` schema, so the migration intentionally avoided reshaping that table and only made the new review-group index conditional.
  - `npm run lint` still fails on unrelated legacy areas in `fdc-lan-bridge`, `supabase/functions`, `to be intergrate/`, and existing tests; the focused room-workflow/build checks pass.

## Closeout

- Final status: SQL applied to self-hosted Supabase, frontend deployed to Cloudflare Pages, and live domain verification completed; authenticated browser smoke is still pending
- Follow-up tasks:
  - Run end-to-end browser smoke for reviewer, chief accountant, internal accountant, and hr records flows.
  - Backfill or standardize `fdc_room_catalog` if future features start reading the database catalog directly instead of the static portal map.
