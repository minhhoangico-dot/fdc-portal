# Task Spec: lab-dashboard-source-table-names

## Goal

- Problem: The source tab still explains data origins in generic terms such as "hồ sơ xét nghiệm gốc" instead of naming the actual source tables, which makes operator-facing provenance less precise.
- Desired outcome: Queue, TAT, abnormal, and reagent provenance text explicitly mentions the source table names used by the bridge, such as `tb_servicedata`, `tb_treatment`, `tb_patientrecord`, `tb_patient`, and `fdc_inventory_snapshots`.

## Scope

- In scope:
- Update bridge provenance wording only.
- Add unit coverage that locks the direct table-name wording.
- Refresh workflow evidence and lessons after verification.
- Out of scope:
- Changing the underlying query logic or portal rendering.
- Reworking the structure/order of the source tab blocks.

## Constraints

- Technical constraints:
- Keep the change localized to provenance builders and their tests.
- Preserve existing structured source-info shape.
- Product or operational constraints:
- Operator-facing wording should become more precise without exposing irrelevant implementation jargon.

## Assumptions

- The user wants direct table names in the source explanation text across all lab dashboard sections, not just the queue section.

## Affected Areas

- Files or directories:
- `fdc-lan-bridge/src/labDashboard/sourceProvenance.ts`
- `fdc-lan-bridge/test/unit/labDashboardSourceProvenance.test.ts`
- `tasks/todo.md`
- Systems touched:
- Bridge provenance/source tab text and bridge unit tests.

## Role Split

- Planner: Record the wording requirement and verification target.
- Implementer: Add the failing test and patch the provenance strings.
- Verifier: Run targeted bridge checks and capture evidence.
- Reviewer: Confirm the final wording names the real tables without breaking source-info readability.

## Implementation Plan

- [x] Inspect the current provenance builders and identify where generic wording remains.
- [x] Add a failing test that asserts the direct table names appear in the source strings.
- [x] Update the provenance text to name the exact tables by section.
- [x] Run verification and close out workflow notes.

## Verification Plan

- Command or check 1: `cmd /c npx jest test/unit/labDashboardSourceProvenance.test.ts --runInBand`
- Command or check 2: `cmd /c npm test`
- Command or check 3: `cmd /c npm run build`

## Review Notes

- Findings:
- None during bridge unit/integration/build verification.
- Residual risks:
- Browser/source-tab wording should still be checked manually after rollout because the tests only validate string content, not UI readability.

## Closeout

- Final status: done
- Verification evidence:
- `cmd /c npx jest test/unit/labDashboardSourceProvenance.test.ts --runInBand` in `fdc-lan-bridge`: passed, 9/9 tests including the new direct-table-name provenance assertion.
- `cmd /c npm test` in `fdc-lan-bridge`: passed, 13/13 suites and 54/54 tests.
- `cmd /c npm run build` in `fdc-lan-bridge`: passed (`tsc` clean).
- Follow-up tasks:
- Smoke-check the source tab wording on `/lab-dashboard/details` or `/lab-dashboard/tv` after rollout.
