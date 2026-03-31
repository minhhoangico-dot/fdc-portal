# Task Spec: lab-dashboard-paid-waiting-queue

## Goal

- Problem: The lab dashboard currently counts any lab order with no processing/result timestamp as `Chờ lấy mẫu`, even if the corresponding patient record has not been paid.
- Desired outcome: `Chờ lấy mẫu` only includes orders in `dm_servicegroupid = 3` whose `patientrecordid` has at least one `tb_treatment.isthutien = 1` row, and the waiting detail list matches the summary card.

## Scope

- In scope:
- Add bridge-side test coverage for paid-only waiting queue behavior.
- Update the shared queue timeline query or filtering so summary/detail waiting views stay aligned.
- Refresh workflow evidence and lessons after verification.
- Out of scope:
- Changing processing/completed queue semantics.
- Reworking TAT or abnormal-result calculations.

## Constraints

- Technical constraints:
- Keep the fix bridge-local and minimal.
- Preserve the existing `dm_servicegroupid = 3` lab scope.
- Product or operational constraints:
- Waiting rows must represent orders that are both ordered and paid before sample collection.

## Assumptions

- `tb_treatment.isthutien = 1` is the intended payment signal for the sampling queue.
- `tb_servicedata.is_da_tinh_toan` and `tb_servicedata.tylethanhtoan` are not reliable for this dashboard use case because live waiting rows keep them at zero.

## Affected Areas

- Files or directories:
- `fdc-lan-bridge/src/labDashboard/service.ts`
- `fdc-lan-bridge/test/unit/labDashboardService.test.ts`
- `tasks/todo.md`
- Systems touched:
- HIS queue/timeline query logic and bridge unit tests.

## Role Split

- Planner: Record the payment-signal decision and verification target.
- Implementer: Add the failing test and patch the waiting queue logic.
- Verifier: Run targeted bridge checks and capture output.
- Reviewer: Confirm waiting summary/detail stay aligned and paid-only.

## Implementation Plan

- [x] Verify the payment signal by scanning schema and sampling live waiting rows.
- [x] Add a failing unit test for paid-only waiting summary/detail behavior.
- [x] Update the bridge queue timeline logic to exclude unpaid waiting rows.
- [x] Run verification and close out workflow notes.

## Verification Plan

- Command or check 1: `cmd /c npx jest test/unit/labDashboardService.test.ts --runInBand`
- Command or check 2: `cmd /c npm test`
- Command or check 3: `cmd /c npm run build`
- Results:
- `cmd /c npx jest test/unit/labDashboardService.test.ts --runInBand` in `fdc-lan-bridge`: passed, 4/4 tests covering reagent alignment plus paid-only waiting summary/detail behavior.
- `cmd /c npm test` in `fdc-lan-bridge`: passed, 13/13 suites and 53/53 tests.
- `cmd /c npm run build` in `fdc-lan-bridge`: passed (`tsc` clean).

## Review Notes

- Findings:
- None specific to the final patch. The bridge change stayed inside the shared lab timeline CTE and the new tests lock both the summary card and queue detail list to the paid-only waiting rule.
- Residual risks:
- Live rollout verification is still required because HIS payment semantics were confirmed from sampled rows rather than formal upstream documentation.

## Closeout

- Final status: completed
- Follow-up tasks:
- Verify `/lab-dashboard/current` and `/lab-dashboard/details?section=queue&focus=waiting` against live bridge data after rollout.
