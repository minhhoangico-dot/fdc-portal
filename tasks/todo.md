# Shared Task Board

## Current Task

- Task ID: `lab-dashboard-source-provenance`
- Owner: `implementer`
- Status: `in_progress`
- Spec: `tasks/active/2026-03-23-lab-dashboard-source-provenance.md`

## Operating Checklist

- [x] Write or refresh the task spec in `tasks/active/`
- [x] Record assumptions, constraints, and affected areas
- [x] Split work by role with non-overlapping write scopes
- [x] Define the verification plan before implementation starts
- [x] Mark items complete as work lands
- [x] Record verification evidence before marking done
- [x] Add review notes or residual risks
- [x] Append a lesson after any user correction or preventable miss

## Work Breakdown

- [x] Intake and scope
- [x] Design or architecture decision
- [x] Implementation
- [x] Verification
- [x] Review
- [ ] Lessons and closeout

## 2026-03-23 Lab Dashboard Source Provenance

- Scope: add structured, operator-friendly provenance to the lab dashboard source tab on both the bridge detail API and the portal UI.
- Checklist:
  - [x] Refresh the workflow files for the provenance follow-up
  - [ ] Bridge contract/types
  - [ ] Bridge provenance builder
  - [ ] Portal type/helper
  - [ ] Source-tab UI
  - [ ] Verification evidence
- Residual risk:
  - Manual browser smoke is required because provenance readability is UI-sensitive and the contract must remain additive during rollout.

## 2026-03-23 Lab Dashboard Detail Scroll Export

- Scope: keep `/lab-dashboard/tv` detail mode scrollable inside the detail list area only and add `.xlsx` export for the current `section` + `focus`.
- Checklist:
  - [x] Confirm export scope, fixed-header expectation, and file format with the user
  - [x] Write and review the design spec in `docs/superpowers/specs/2026-03-23-lab-dashboard-detail-scroll-export-design.md`
  - [x] Save the implementation plan and active task spec
  - [x] Add failing export tests and implement the export helper
  - [x] Wire the detail screen export action and fix the overflow chain
  - [x] Run targeted verification and record evidence
- Verification evidence:
  - `cmd /c npx tsx --test test\unit\labDashboardDetail.test.ts`: passed, 3/3 tests for TV detail search-param parsing/building.
  - `cmd /c npx tsx --test test\unit\labDashboardDetailExport.test.ts`: passed, 6/6 tests for filename sanitization, export availability, row mapping, invalid-date passthrough, workbook sheet naming, and unsupported-section guard.
  - `cmd /c npm run build`: passed, Vite production build completed successfully after wiring export/download and bounded detail scrolling.
  - Task 1 helper review: spec review passed after fixing section-derived worksheet naming; code-quality review passed after replacing the implicit reagent fallback with an exhaustive unsupported-section error.
  - Task 2 UI/CSS review: spec review passed after converting the detail screen into a bounded flex column; code-quality review passed after adding a synchronous export lock to block double-click duplicate downloads.
- Residual risk:
  - Manual browser smoke is still required because the change touches shared detail/summary CSS and the new export button wiring has no component-level integration test in this repo.

## 2026-03-23 Lab Dashboard TV Drill-down

- Scope: let lab staff click main cards/metrics directly on `/lab-dashboard/tv` to open a dedicated detail screen with `Danh sách chi tiết` and `Nguồn dữ liệu`, without bloating the summary polling payload.
- Checklist:
  - [x] Confirm interaction model and detail depth with the user
  - [x] Record a new task spec and verification plan
  - [x] Add bridge detail API contract and validation
  - [x] Add bridge detail query/filter logic for queue, TAT, abnormal, and reagents
  - [x] Add TV detail-mode routing, lazy fetch hook, and interactive summary cards
  - [x] Run targeted verification and record evidence
  - [x] Re-align the summary layout to match `to be intergrate/lab-dashboard.html`
- Verification evidence:
  - `cmd /c npm test` in `fdc-lan-bridge`: passed, 11/11 suites and 40/40 tests.
  - `cmd /c npm run build` in `fdc-lan-bridge`: passed (`tsc` clean).
  - `cmd /c npm run build` at repo root: passed, Vite production build completed successfully.
  - `cmd /c npx tsx --test test\\unit\\labDashboardDetail.test.ts`: passed, 3/3 tests for TV detail search-param parsing/building.
  - `cmd /c npx tsx --test test\\unit\\labDashboardDetail.test.ts test\\unit\\labDashboardDisplayModel.test.ts`: passed, 5/5 tests including the new summary display-model coverage.
  - `cmd /c npx wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true`: passed, deployment URL `https://aa36fe9e.fdc-portal.pages.dev`.
  - SSH rollout completed to `Vostro-Server` (`hbminh@192.168.1.9`): copied `src/labDashboard/`, `src/tvAccess/`, `src/server.ts`, and `src/config.ts`, then ran `npm run build` and `sudo systemctl restart fdc-lan-bridge`; service status returned `active`.
  - Public verification: `https://bridge.fdc-nhanvien.org/lab-dashboard/details?section=queue&focus=waiting&date=2026-03-23` returned `200` with title `Chi tiết hàng chờ lấy mẫu`, `rowCount=17`, and one source block.
- Residual risk:
  - Manual browser smoke for `/lab-dashboard/tv` detail flow is still pending.

## 2026-03-23 Head Nurse Role + User

- Scope: add a `Điều dưỡng trưởng` role with full non-admin access, allow username-style login for `pthue`, and create the requested live Supabase account.
- Checklist:
  - [x] Inspect portal role logic, request/approval access checks, and live Supabase constraints
  - [x] Update portal role typing/module access for `head_nurse`
  - [x] Add an idempotent SQL migration for live role catalog and request/attachment access
  - [x] Apply live Supabase changes for the role seed and `pthue` account
  - [x] Run targeted verification and record results
- Verification evidence:
  - `cmd /c npm run build`: passed, Vite production build completed successfully.
  - `cmd /c npx wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true`: passed, deployment URL `https://c73e6be2.fdc-portal.pages.dev`.
  - Live Supabase SQL verification via `POST /pg/query`: `fdc_role_catalog` now contains `head_nurse`; `fdc_can_view_request`, `fdc_can_act_on_step`, and delete-attachment policies include `head_nurse`.
  - Live Auth verification: `pthue@fdc.vn / 123` successfully returned a bearer token from `auth/v1/token`.
  - Live mapping verification: `fdc_user_mapping` row exists with role `head_nurse`, department `Dieu duong`, and active status.
- Residual risk:
  - `cmd /c npm run lint` still fails because of pre-existing repo-wide TypeScript issues in `fdc-lan-bridge`, Supabase functions, and `to be intergrate/`; no new failure was isolated to the head-nurse changes.

## Review Notes

- Findings: none specific to the lab-dashboard implementation during bridge build/test and portal build verification.
- Residual risks: live lab queue/TAT stages rely on HIS timestamp fields and grouped root rows; needs post-implementation validation with real lab staff usage. Root `npm run lint` remains blocked by pre-existing repository-wide TypeScript issues outside this task.
- Follow-ups: apply the seeded TV screen SQL in the target environment if migrations are not auto-applied, then verify `/tv/xet-nghiem` redirects to `/lab-dashboard/tv`.

## 2026-03-23 Queue/TAT Live Fix

- Scope: fix the bridge query regression that makes `/lab-dashboard/current` fall back queue/TAT to zero on the TV screen.
- Checklist:
  - [x] Identify the failing queue/TAT query and verify the HIS schema columns in `tb_dm_servicesubgroup`
  - [x] Update the shared queue/TAT CTE to use `dm_servicesubgroupid` and `dm_servicesubgroupname`
  - [x] Run `cd fdc-lan-bridge && npm test`
  - [x] Run `cd fdc-lan-bridge && npm run build`
  - [x] Run a real-data smoke check for `getLabDashboardCurrent("2026-03-23")`
  - [x] Record verification evidence and any rollout gap
- Verification evidence:
  - `cmd /c npm test` in `fdc-lan-bridge`: passed, 10/10 suites and 28/28 tests.
  - `cmd /c npm run build` in `fdc-lan-bridge`: passed (`tsc` clean).
  - `cmd /c npx ts-node --transpile-only -e ... getLabDashboardCurrent('2026-03-23')`: queue returned `waitingForSample=9`, `processing=0`, `completedToday=54`; TAT returned non-zero values; `sectionErrors=null`.
  - SSH rollout completed to `Vostro-Server` (`hbminh@192.168.1.9`): copied `/opt/fdc-lan-bridge/src/labDashboard/service.ts`, ran `npm run build`, then `sudo systemctl restart fdc-lan-bridge`.
  - `curl http://localhost:3333/lab-dashboard/current?date=2026-03-23` on the bridge host: returned queue `waitingForSample=13`, `processing=0`, `completedToday=55`; TAT returned non-zero values; no `sectionErrors`.
  - `Invoke-RestMethod https://bridge.fdc-nhanvien.org/lab-dashboard/current?date=2026-03-23`: public bridge now returns the same non-zero queue/TAT payload and no `sectionErrors.queue/tat`.
- Residual risk:
  - The TV page should reflect the fix immediately because it reads the live bridge payload, but any already-open browser tab may need a hard refresh to drop stale client state.

## 2026-03-23 Reagent Warehouse Scope

- Scope: make the `reagents` section show stock scoped to `Khoa Xét Nghiệm` instead of pulling `XN*` items from `Khoa Dược / Vật tư`.
- Checklist:
  - [x] Verify current snapshot warehouses and confirm that reagent rows exist under `Khoa Xét Nghiệm`
  - [x] Tighten bridge reagent scoping to lab warehouse rows only
  - [x] Update the UI label so the section clearly reads as stock for the lab department
  - [x] Run bridge test/build after the reagent source change
  - [x] Verify live reagent payload after rollout
- Verification evidence:
  - Snapshot inspection for `2026-03-23` showed warehouses `Khám Bệnh`, `Khoa Dược / Vật tư`, `Khoa Xét Nghiệm`, `Khối Vật Tư`; previous reagent logic could pull `XN*` rows from `Khoa Dược / Vật tư`.
  - `cmd /c npm test` in `fdc-lan-bridge`: passed, 10/10 suites and 28/28 tests.
  - `cmd /c npm run build` in `fdc-lan-bridge`: passed (`tsc` clean).
  - Local `getLabDashboardCurrent('2026-03-23')` after the scope fix returned reagent rows sourced from the lab warehouse, for example `Glucose=1`, `Creatinine=1`, `ALT / AST=2`, `Điện giải=5`, `Nước tiểu=2`.
  - SSH rollout completed to `Vostro-Server` (`hbminh@192.168.1.9`): copied `/opt/fdc-lan-bridge/src/labDashboard/service.ts`, ran `npm run build`, then `sudo systemctl restart fdc-lan-bridge`.
  - Public bridge verification: `https://bridge.fdc-nhanvien.org/lab-dashboard/current?date=2026-03-23` now returns reagent payload scoped to the lab warehouse, including `Glucose=1`, `Creatinine=1`, `ALT / AST=2`, `Điện giải=5`, `Nước tiểu=2`.
  - Portal build passed with `cmd /c npm run build` at repo root.
  - Cloudflare Pages deployment completed for project `fdc-portal`: `https://aa51928b.fdc-portal.pages.dev`.
- Residual risk:
  - Already-open browser tabs may keep stale client state until reloaded, so the live TV page may need a hard refresh to pick up both the new reagent payload and the updated section label.
