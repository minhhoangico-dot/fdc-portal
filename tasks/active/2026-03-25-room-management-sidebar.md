# Task Spec: room-management-sidebar

## Goal

- Problem: The approved `Quản lý phòng` module does not appear in the portal sidebar because the portal never registered a `room_management` module key, nav item, or route.
- Desired outcome: Authenticated users can see and open a dedicated `/room-management` entry from the shared portal navigation.

## Scope

- In scope:
  - Add a focused navigation regression test for the missing room-management item.
  - Register the `room_management` module in the portal navigation and route table.
  - Add a minimal `/room-management` page scaffold so the new nav item opens a real portal page.
- Out of scope:
  - Full room-management feature implementation from the draft design.
  - New Supabase schema, issue queue, or material-request workflows.

## Constraints

- Technical constraints:
  - Keep page components thin and use the existing `@/` import alias.
  - Avoid broad refactors because the worktree already has unrelated in-progress changes.
- Product or operational constraints:
  - The fix must not create a dead sidebar link.
  - Navigation visibility should match the room-management design baseline of broad authenticated access.

## Assumptions

- The user is asking for the approved `Quản lý phòng` module defined in `docs/superpowers/specs/2026-03-24-room-management-design.md`.
- A lightweight scaffold page is acceptable for this fix as long as the nav item opens a usable portal screen.

## Affected Areas

- Files or directories:
  - `src/types/roleCatalog.ts`
  - `src/lib/navigation.ts`
  - `src/App.tsx`
  - `src/app/room-management/page.tsx`
  - `test/unit/navigation.test.ts`
  - `tasks/todo.md`
- Systems touched:
  - Portal navigation
  - Portal authenticated routing

## Role Split

- Planner: capture the focused scope, assumptions, and verification steps.
- Implementer: add the regression test plus the room-management nav/route/page scaffold.
- Verifier: run the targeted unit test and portal build.
- Reviewer: confirm the fix creates a real route and does not widen access accidentally beyond the intended baseline.

## Implementation Plan

- [x] Add the task entry to `tasks/todo.md`.
- [x] Add a failing navigation test for `/room-management`.
- [x] Register `room_management` in the module-key and navigation registries.
- [x] Add the `/room-management` route and scaffold page.
- [x] Run targeted verification and record evidence.

## Verification Plan

- Command or check 1: `cmd /c npx tsx --test test\\unit\\navigation.test.ts` -> passed, 4/4 tests including the new `/room-management` assertion.
- Command or check 2: `cmd /c npm run build` -> passed, Vite production build completed successfully; the existing large-chunk warning remains.

## Review Notes

- Findings: none in the scoped navigation/page scaffold after the targeted test and full portal build.
- Residual risks: `/room-management` is currently a scaffolded landing page that previews the approved floorplans; the maintenance queue, room-scoped material request flow, and print surface from the draft design are still follow-up work.

## Closeout

- Final status: completed
- Follow-up tasks:
  - Implement the full room-management feature set from `docs/superpowers/specs/2026-03-24-room-management-design.md`.
  - Add browser smoke coverage for `/room-management` once the route is deployed.
