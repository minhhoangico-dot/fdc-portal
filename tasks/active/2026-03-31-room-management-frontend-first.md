# Task Spec: room-management-frontend-first

## Goal

- Problem: The sidebar entry for `Quản lý phòng` exists, but the page only exposes an iframe preview and static cards, so the user cannot actually report maintenance, create supply requests, or print a usable room-level summary.
- Desired outcome: Replace the preview with a portal-native Room Management module that preserves the approved map layout and makes the map, drawer, maintenance form, supply form, maintenance queue, and print preview all usable on session-only mock state.

## Scope

- In scope:
  - Create a shared Room Management provider with session-only in-memory state.
  - Port the approved floor layout into real React components under `src/`.
  - Build the map screen, drawer tabs, maintenance queue, and print preview routes.
  - Add unit coverage for catalog/layout, summary badges, maintenance helpers, print grouping, and shared state append behavior.
- Out of scope:
  - Supabase persistence.
  - `/requests` or `/approvals` integration.
  - Local storage or cross-refresh persistence.
  - Browser automation or visual regression tooling.

## Constraints

- Technical constraints:
  - Keep the module self-contained under Room Management routes.
  - State must persist while navigating between `/room-management`, `/room-management/maintenance`, and `/room-management/print/materials`, but reset on full refresh.
  - Reuse the approved room ordering and wing structure from the prototype instead of inventing a new layout.
- Product or operational constraints:
  - The UI must fit the existing portal theme rather than reusing the prototype shell styling.

## Assumptions

- The approved prototype room list in `public/roomplanning/src/lib/seed-data.ts` remains the correct room catalog source.
- Session-only mock state is sufficient for this pass because the user explicitly approved reset-on-refresh behavior.

## Affected Areas

- Files or directories:
  - `src/types/roomManagement.ts`
  - `src/lib/room-management/`
  - `src/components/room-management/`
  - `src/contexts/RoomManagementContext.tsx`
  - `src/app/room-management/**`
  - `src/App.tsx`
  - `test/unit/room*.test.ts`
  - `tasks/todo.md`
  - `tasks/active/2026-03-31-room-management-frontend-first.md`
- Systems touched:
  - Portal-only frontend routes and build output

## Role Split

- Planner: convert the approved spec into an execution plan and keep task tracking current.
- Implementer: build the provider, room surfaces, queue, and print routes inside the portal.
- Verifier: run targeted unit tests plus portal build/type-check commands and isolate residual risk.
- Reviewer: confirm the new module solves the user-visible functionality gap rather than only the sidebar discoverability gap.

## Implementation Plan

- [x] Save the design spec and execution plan for the frontend-first rewrite.
- [x] Add failing helper and reducer tests for room catalog, summaries, maintenance workflow, print grouping, and shared session state.
- [x] Build the room-management domain helpers and state reducer.
- [x] Replace the iframe scaffold with a real map surface and drawer tabs.
- [x] Add `/room-management/maintenance` and `/room-management/print/materials`.
- [x] Run targeted verification and record residual risks.

## Verification Plan

- Command or check 1: `cmd /c npx tsx --test test\unit\roomCatalog.test.ts` -> passed, 1/1.
- Command or check 2: `cmd /c npx tsx --test test\unit\roomSummary.test.ts` -> passed, 1/1.
- Command or check 3: `cmd /c npx tsx --test test\unit\roomMaintenance.test.ts` -> passed, 1/1.
- Command or check 4: `cmd /c npx tsx --test test\unit\roomPrint.test.ts` -> passed, 1/1.
- Command or check 5: `cmd /c npx tsx --test test\unit\roomState.test.ts` -> passed, 1/1.
- Command or check 6: `cmd /c npx tsx --test test\unit\navigation.test.ts` -> passed, 4/4.
- Command or check 7: `cmd /c npm run build` -> passed, Vite production build completed successfully and emitted `assets/index-as62Nw-_.js`.
- Command or check 8: `cmd /c npm run lint` -> failed because of pre-existing repository-wide TypeScript issues in `fdc-lan-bridge`, `supabase/functions`, `to be intergrate/`, and an unrelated inventory/admin test surface; no room-management paths appeared in the filtered lint output after the new room-management fixes landed.
- Command or check 9: `cmd /c npx wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true` -> passed; deployment URL `https://3c1e7061.fdc-portal.pages.dev`.
- Command or check 10: `Invoke-WebRequest -UseBasicParsing https://portal.fdc-nhanvien.org` -> passed; live HTML now references `assets/index-as62Nw-_.js`.
- Command or check 11: `Invoke-WebRequest -UseBasicParsing https://portal.fdc-nhanvien.org/assets/index-as62Nw-_.js` -> passed with status `200`.
- Command or check 12: `Invoke-WebRequest -UseBasicParsing https://portal.fdc-nhanvien.org/room-management/maintenance` -> passed with status `200`.

## Review Notes

- Findings: The original sidebar fix solved route discoverability but not functional completeness. The missing piece was a real provider-backed module under `src/`, not more rollout work.
- Residual risks:
  - Browser smoke is still pending for the three Room Management routes because this session did not include an interactive browser automation tool.
  - `npm run lint` remains red due to unrelated repo-wide TypeScript issues outside the Room Management write set.

## Closeout

- Final status: completed for the approved frontend-first scope
- Follow-up tasks:
  - Browser-smoke `/room-management`, `/room-management/maintenance`, and `/room-management/print/materials`.
  - Decide whether the next pass should integrate Room Management with real requests/approvals or Supabase persistence.
