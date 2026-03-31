# Task Spec: lab-dashboard-waiting-stage-fix

## Goal

- Problem: The lab dashboard still shows paid patients in `Chờ lấy mẫu` when HIS lab root rows only populate `do_servicedatadate`/`end_date`, and it also mixes `Chênh lệch BH - ...` billing adjustment rows into the operational queue.
- Desired outcome: `Chờ lấy mẫu` only contains real lab rows that have neither processing nor completion timestamps, so patient `23009760` no longer appears there after sample execution/result release.

## Scope

- In scope:
- Add bridge-side regression coverage for waiting-stage classification based on live HIS timestamp patterns.
- Exclude `Chênh lệch BH - ...` rows from the lab dashboard timeline/query.
- Use `do_servicedatadate` and `end_date` as stage fallbacks where `order_date`/`data_date` are blank.
- Out of scope:
- Reworking the portal UI or card labels.
- Changing non-queue lab dashboard sections beyond the shared timeline fields they already consume.

## Constraints

- Technical constraints:
- Keep the fix bridge-local and minimal.
- Preserve the paid-treatment gate and existing lab group scope.
- Product or operational constraints:
- Rows must not stay in `Chờ lấy mẫu` after lab execution has already started or results have already been released in HIS.

## Assumptions

- `do_servicedatadate` is a valid processing-stage signal when `order_date` is blank.
- `end_date` is a valid completion-stage fallback when `data_date` is blank for the affected HIS lab rows.
- `Chênh lệch BH - ...` rows are billing artifacts and should not appear in the operational lab queue.

## Affected Areas

- Files or directories:
- `fdc-lan-bridge/src/labDashboard/service.ts`
- `fdc-lan-bridge/test/unit/labDashboardService.test.ts`
- `tasks/todo.md`
- `tasks/lessons.md`
- Systems touched:
- HIS lab timeline query logic and bridge unit tests.

## Role Split

- Planner: Capture the root-cause evidence and intended timeline semantics.
- Implementer: Add failing tests and patch the shared lab timeline query.
- Verifier: Run targeted bridge tests/build and sample the waiting payload.
- Reviewer: Confirm the waiting queue no longer includes `23009760` because of completed/in-progress lab rows or BH adjustment clones.

## Implementation Plan

- [x] Add failing unit coverage for `do_servicedatadate`/`end_date` stage fallback and `Chênh lệch BH - ...` exclusion.
- [x] Update the shared lab timeline CTE to use the broader HIS stage signals and skip billing-adjustment rows.
- [x] Run targeted verification, record evidence, and append the lesson.

## Verification Plan

- Command or check 1: `cmd /c npx jest test/unit/labDashboardService.test.ts --runInBand`
- Command or check 2: `cmd /c npm test`
- Command or check 3: `cmd /c npm run build`
- Command or check 4: Query `getLabDashboardDetails({ section: "queue", focus: "waiting", asOfDate: "2026-03-25" })` and confirm patient `23009760` is absent.
- Results:
- `cmd /c npx jest test/unit/labDashboardService.test.ts --runInBand` in `fdc-lan-bridge`: passed, 7/7 tests including the new waiting-stage fallback and BH-adjustment regression coverage.
- `cmd /c npm test` in `fdc-lan-bridge`: passed, 13/13 suites and 58/58 tests.
- `cmd /c npm run build` in `fdc-lan-bridge`: passed (`tsc` clean).
- Live-data verification via local `getLabDashboardCurrent('2026-03-25')` and queue detail loaders: waiting queue dropped from 17 rows before the patch to 5 rows after it; patient `23009760` is no longer present in `waiting` or `processing` and now appears only in `completed` rows with result timestamps.
- SSH rollout completed to `Vostro-Server` (`hbminh@192.168.1.9`): copied `/opt/fdc-lan-bridge/src/labDashboard/service.ts`, ran `sudo npm run build`, then `sudo systemctl restart fdc-lan-bridge`; service status returned `active`.
- Public bridge verification on `2026-03-25`: `https://bridge.fdc-nhanvien.org/lab-dashboard/details?section=queue&focus=waiting&date=2026-03-25` returned `rowCount=0` and no row for `23009760`; public `/lab-dashboard/details?section=queue&focus=completed&date=2026-03-25` returned `matched=18` rows for `23009760`, confirming the patient now lands in `completed`.

## Review Notes

- Findings:
- Root cause is in the shared timeline query, not the portal rendering layer.
- Residual risks:
- Queue/source provenance wording still describes `order_date`/`data_date` only, so the source tab copy should be refreshed in a follow-up if operators rely on that explanation text.

## Closeout

- Final status: completed
- Follow-up tasks:
- Refresh queue/source provenance wording so it matches the new `do_servicedatadate` and `end_date` fallback logic.
