# Task Spec: lab-dashboard-reagent-unit-alignment

## Goal

- Problem: The lab dashboard reagent section can show a different unit than the `Quản lý Kho Thuốc` list for `Khoa Xét Nghiệm` because the bridge falls back blank snapshot units to `hộp` while the inventory screen falls back to `Cái`.
- Desired outcome: The dashboard uses the same lab-scoped snapshot rows and the same fallback unit semantics as the inventory management list for `Khoa Xét Nghiệm`.

## Scope

- In scope:
- Add bridge coverage for reagent stock scoping and blank-unit fallback.
- Update the bridge reagent fallback so summary/detail payloads align with the inventory list.
- Record verification evidence and any residual UI risk.
- Out of scope:
- Reworking reagent keyword grouping or changing portal inventory filters.
- Live rollout or deployment work beyond local verification in this session.

## Constraints

- Technical constraints:
- Keep the change minimal and bridge-local unless a failing test proves the portal also needs edits.
- Do not disturb unrelated in-progress files in the dirty worktree.
- Product or operational constraints:
- The dashboard must stay scoped to `Khoa Xét Nghiệm`, not broader warehouse inventory.

## Assumptions

- The inventory management list remains the source-of-truth behavior for unit fallback on blank `fdc_inventory_snapshots.unit` values.
- The existing lab-warehouse scoping logic is already correct and should be locked in by test coverage.

## Affected Areas

- Files or directories:
- `fdc-lan-bridge/src/labDashboard/service.ts`
- `fdc-lan-bridge/test/unit/**`
- `tasks/todo.md`
- Systems touched:
- LAN bridge reagent summary/detail mapping and bridge unit tests.

## Role Split

- Planner: Capture the mismatch, scope, and verification target.
- Implementer: Add the failing test and patch the reagent fallback.
- Verifier: Run the targeted bridge tests/build and record results.
- Reviewer: Check that the fix stays lab-scoped and does not reintroduce warehouse bleed.

## Implementation Plan

- [x] Confirm the current dashboard/inventory mismatch and choose the smallest defensible fix.
- [x] Add a failing unit test that asserts lab-only stock and `Cái` fallback for blank units.
- [x] Update the bridge reagent mapping to share the inventory fallback behavior.
- [x] Run targeted verification and write the closeout notes.

## Verification Plan

- Command or check 1: `cmd /c npx jest test/unit/labDashboardService.test.ts`
- Command or check 2: `cmd /c npm test`
- Command or check 3: `cmd /c npm run build`
- Results:
- `cmd /c npx jest test/unit/labDashboardService.test.ts --runInBand` in `fdc-lan-bridge`: passed, 2/2 tests covering lab-only stock scoping and `Cái` fallback for blank reagent units in both current and detail payloads.
- `cmd /c npm test` in `fdc-lan-bridge`: passed, 13/13 suites and 51/51 tests.
- `cmd /c npm run build` in `fdc-lan-bridge`: passed (`tsc` clean).

## Review Notes

- Findings:
- None specific to the final patch. The bridge-only change stayed inside reagent fallback wiring and the new service test now locks both lab scoping and blank-unit behavior.
- Residual risks:
- The fix is derived from bridge tests, so an interactive browser smoke on `/lab-dashboard` remains a follow-up.

## Closeout

- Final status: completed
- Follow-up tasks:
- Verify the rendered reagent labels against the inventory list in a browser after the bridge change lands.
