# Task Spec: weekly-report-health-check-count

## Goal

- Problem: tuần 15 trên màn TV weekly report hiển thị `Khám sức khỏe = 0` dù HIS có 38 lượt dịch vụ `Khám Sức khỏe (Khám)` trong khoảng `06/04/2026 - 12/04/2026`.
- Desired outcome: xác nhận root cause, sửa logic tổng hợp `Khám bệnh` để mapping `kham_suc_khoe` đếm đúng dữ liệu live, và ghi lại rủi ro snapshot hiện có.

## Scope

- In scope:
  - điều tra dữ liệu HIS tuần 15 và mapping `fdc_weekly_report_service_mappings`
  - thêm regression test cho `getExaminationStats`
  - sửa logic match `contains`/`starts_with` trong bridge weekly report
  - chạy verification cục bộ và ghi rõ ảnh hưởng tới snapshot đã lưu
- Out of scope:
  - thay đổi cấu hình mapping live trong Supabase
  - thay đổi UI portal weekly report

## Constraints

- Technical constraints:
  - giữ thay đổi ở bridge weekly report scope, không lan sang portal
  - production code chỉ được sửa sau khi có test fail
- Product or operational constraints:
  - weekly report hiện ưu tiên đọc snapshot đã lưu, nên code fix không tự sửa snapshot tuần 15 đang tồn tại

## Assumptions

- Mapping `kham_suc_khoe` hiện hành với `match_type = contains` và `match_value = "sức khỏe"` là cấu hình đúng nghiệp vụ.
- Weekly report detail logic dùng `ILIKE` là hành vi đúng cần đồng bộ với summary aggregation.

## Affected Areas

- Files or directories:
  - `fdc-lan-bridge/src/weeklyReport/queries.ts`
  - `fdc-lan-bridge/test/unit/weeklyReportQueries.test.ts`
  - `tasks/todo.md`
  - `tasks/lessons.md`
- Systems touched:
  - HIS weekly report aggregation
  - bridge weekly-report unit coverage

## Role Split

- Planner: capture the miscount scope, live-data evidence, and verification plan.
- Implementer: add the regression test and minimal bridge fix.
- Verifier: run the targeted test and bridge build, then record residual snapshot risk.
- Reviewer: confirm the fix matches detail semantics and does not broaden exact-match behavior unexpectedly.

## Implementation Plan

- [x] Confirm the live week-15 symptom against HIS service rows and current weekly report output
- [x] Add a failing weekly-report unit test for case-insensitive `contains` matching
- [x] Implement the minimal `getExaminationStats` fix to align summary matching with detail `ILIKE`
- [x] Run targeted verification and record the snapshot follow-up risk

## Verification Plan

- Command or check 1: `cmd /c npx jest test/unit/weeklyReportQueries.test.ts --runInBand`
- Command or check 2: `cmd /c npm run build`

## Review Notes

- Findings:
  - `getExaminationStats` currently evaluates `contains` and `starts_with` with case-sensitive JS string methods, unlike detail queries which use case-insensitive `ILIKE`.
- Residual risks:
  - The bridge process is live and weekly report is fixed, but host health remains `degraded` because `misaConnected = false` after restart with `fdc_readonly` login failures.

## Closeout

- Final status: rolled out and week-15 live snapshot regenerated
- Follow-up tasks:
  - investigate the current live MISA login failures on the bridge host if MISA jobs must recover

## Verification Evidence

- HIS live verification on `2026-04-13`: week 15 contains `38` `dm_servicegroupid = 1` rows with service name `Khám Sức khỏe (Khám)`, matching the user-provided patient list.
- Bridge live verification before the fix on `2026-04-13`: `getCurrentWeeklyReport({ date: '2026-04-12' })` returned snapshot week `15` with `kham_suc_khoe.current = 0`, and the pre-fix `getExaminationStats(...)` path also returned `0`.
- `cmd /c npx jest test/unit/weeklyReportQueries.test.ts --runInBand`: failed first with `current: 0` instead of `38`, then passed after the matching fix landed.
- Live-code verification after the fix on `2026-04-13`: `getExaminationStats(...)` now returns `kham_suc_khoe.current = 38` and `previous = 28` for week `15`.
- `cmd /c npm run build` in `fdc-lan-bridge`: passed (`tsc` clean).
- SSH rollout on `2026-04-13`: copied `src/weeklyReport/queries.ts` to `/opt/fdc-lan-bridge/src/weeklyReport/queries.ts`, then ran `sudo npm run build` followed by `sudo systemctl restart fdc-lan-bridge`.
- Host-side bundle verification on `2026-04-13`: `/opt/fdc-lan-bridge/dist/weeklyReport/queries.js` contains `normalizeMatchText`, `matchesServiceMapping`, and `toLocaleLowerCase`.
- Host-side raw verification on `2026-04-13`: direct `require('./dist/weeklyReport/service').generateWeeklyReportSnapshot({ date: '2026-04-12', trigger: 'manual' })` returned `kham_suc_khoe.current = 38` and upserted `public.fdc_weekly_report_snapshots.generated_at = 2026-04-13T12:31:29.136+00:00`.
- Live bridge verification on `2026-04-13`: both `http://127.0.0.1:3333/weekly-report/current?date=2026-04-12` on the host and `https://bridge.fdc-nhanvien.org/weekly-report/current?date=2026-04-12` return `kham_suc_khoe.current = 38`, `previous = 28`, and `source = snapshot`.
- Host health verification on `2026-04-13`: `curl http://127.0.0.1:3333/health` returned `status = degraded`, `hisConnected = true`, `misaConnected = false`; `journalctl -u fdc-lan-bridge` shows repeated `Login failed for user 'fdc_readonly'` from the MISA SQL Server connection.
