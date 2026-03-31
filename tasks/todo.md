# Shared Task Board

## Current Task

- Task ID: `room-management-full-system`
- Owner: `implementer`
- Status: `spec-written`
- Spec: `tasks/active/2026-03-31-room-management-full-system.md`

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
- [ ] Implementation
- [ ] Verification
- [ ] Review
- [ ] Lessons and closeout

## 2026-03-31 Room Management Full-System

- Scope: replace the frontend-first Room Management mock flow with a real Supabase-backed workflow module, add room-origin request and maintenance routing into the existing portal request engine, introduce the new reviewer and finance roles, and move the portal onto a centralized permission matrix across all modules.
- Checklist:
  - [x] Explore the current room-management, requests, approvals, role, and navigation architecture
  - [x] Confirm the approved workflow, role, and permission rules with the user
  - [x] Save the full-system design spec
  - [ ] Get user review on the written spec
  - [ ] Write the implementation plan
  - [ ] Implement schema, permission, and workflow changes
  - [ ] Run verification and record evidence
- Verification evidence:
  - Design review against current portal architecture completed on `2026-03-31` using `src/lib/navigation.ts`, `src/lib/role-access.ts`, `src/types/roleCatalog.ts`, `src/viewmodels/useRequests.ts`, `src/viewmodels/useApprovals.ts`, `src/App.tsx`, and the related SQL migrations.
- Residual risk:
  - Implementation has not started yet; the current portal still uses the frontend-first Room Management mock flow and legacy hardcoded permission checks.

## 2026-03-31 Room Management Frontend-First

- Scope: replace the `Quản lý phòng` iframe preview with a working portal-native module that keeps the approved map layout and makes map, drawer, maintenance, supply, queue, and print flows usable on session-only mock state.
- Checklist:
  - [x] Save the frontend-first design spec and execution plan
  - [x] Add failing helper/reducer coverage for room-management state and grouping logic
  - [x] Port the room catalog, summary helpers, maintenance helpers, print helpers, and shared reducer into `src/`
  - [x] Replace `/room-management` with the real map + drawer experience
  - [x] Add `/room-management/maintenance` and `/room-management/print/materials`
  - [x] Run targeted verification and record residual risks
- Verification evidence:
  - `cmd /c npx tsx --test test\unit\roomCatalog.test.ts`: passed, 1/1.
  - `cmd /c npx tsx --test test\unit\roomSummary.test.ts`: passed, 1/1.
  - `cmd /c npx tsx --test test\unit\roomMaintenance.test.ts`: passed, 1/1.
  - `cmd /c npx tsx --test test\unit\roomPrint.test.ts`: passed, 1/1.
  - `cmd /c npx tsx --test test\unit\roomState.test.ts`: passed, 1/1.
  - `cmd /c npx tsx --test test\unit\navigation.test.ts`: passed, 4/4.
  - `cmd /c npm run build`: passed, Vite production build completed successfully; emitted `assets/index-as62Nw-_.js`.
  - `cmd /c npm run lint`: failed for pre-existing repository-wide TypeScript issues in `fdc-lan-bridge`, `supabase/functions`, `to be intergrate/`, and unrelated legacy tests; no room-management paths appeared in the filtered lint output after the new room-management files landed.
  - `cmd /c npx wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true`: passed; deployment URL `https://3c1e7061.fdc-portal.pages.dev`.
  - `Invoke-WebRequest -UseBasicParsing https://portal.fdc-nhanvien.org`: passed; live HTML now references `assets/index-as62Nw-_.js`.
  - `Invoke-WebRequest -UseBasicParsing https://portal.fdc-nhanvien.org/assets/index-as62Nw-_.js`: passed with status `200`.
  - `Invoke-WebRequest -UseBasicParsing https://portal.fdc-nhanvien.org/room-management/maintenance`: passed with status `200`.
- Residual risk:
  - Browser smoke is still pending for `/room-management`, `/room-management/maintenance`, and `/room-management/print/materials`.

## 2026-03-25 Admin TV Surface Removal

- Scope: remove the duplicate `Màn hình TV` tab from `/admin` and redirect the legacy `admin?tab=tv_screens` entry to `/tv-management`.
- Checklist:
  - [x] Save the follow-up spec and implementation plan
  - [x] Add failing regression coverage for the legacy admin TV deep link and tab list
  - [x] Remove the TV tab from `AdminPage`
  - [x] Redirect `admin?tab=tv_screens` to `/tv-management`
  - [x] Drop obsolete `tv_screens` admin tab typing
  - [x] Run targeted verification and record evidence
- Verification evidence:
  - `cmd /c npx tsx --test test\unit\adminNavigation.test.ts`: passed, 3/3.
  - `cmd /c npx tsx --test test\unit\adminNavigation.test.ts test\unit\navigation.test.ts`: passed, 6/6.
  - `cmd /c npm run build`: passed, Vite production build completed successfully.
  - `cmd /c npx wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true`: passed; deployment URL `https://713c48b6.fdc-portal.pages.dev`.
  - Live bundle check on `2026-03-25`: both `https://713c48b6.fdc-portal.pages.dev/` and `https://portal.fdc-nhanvien.org/` serve `assets/index-CEz0pAN3.js`.
- Residual risk:
  - Browser smoke is still useful for `/admin?tab=tv_screens` to confirm the redirect lands on `/tv-management` in-app.

## 2026-03-25 Weekly Report TV Management

- Scope: move weekly report management under `/tv-management`, add a row-level settings action for the weekly report TV screen, and convert legacy weekly report/admin routes into redirects.
- Checklist:
  - [x] Confirm the target flow and architecture with the user
  - [x] Save the design spec, implementation plan, and active task spec
  - [x] Add failing tests for navigation, TV screen feature helpers, and weekly report URL helpers
  - [x] Implement the `/tv-management/weekly-report` management flow and new TV/detail namespace
  - [x] Redirect `/weekly-report*` and `admin?tab=weekly_report` to the new flow
  - [x] Preserve `fdc_tv_screens.settings` during edit and add the row-level weekly report settings action
  - [x] Add SQL backfill for `settings.featureKey = "weekly_report"` and the new TV route
  - [x] Run verification and record evidence
- Verification evidence:
  - `cmd /c npx tsx --test test\unit\navigation.test.ts test\unit\tvScreenLinks.test.ts test\unit\weeklyReportLinks.test.ts`: passed, 13/13.
  - `cmd /c npm run build`: passed, Vite production build completed successfully.
  - `cmd /c npx wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true`: passed; deployment URL `https://2c28fa65.fdc-portal.pages.dev`.
  - Live bundle check on `2026-03-25`: both `https://2c28fa65.fdc-portal.pages.dev/` and `https://portal.fdc-nhanvien.org/` serve `assets/index-Cs7T1ENy.js`.
  - Live Supabase verification via `POST /pg/query` on `2026-03-25`: production initially had no weekly report row in `public.fdc_tv_screens`; after the seed/upsert, slug `weekly-report` exists with `content_url = /tv-management/weekly-report/tv`, `feature_key = weekly_report`, `is_active = true`, and `updated_at = 2026-03-25 12:00:08.015144+00`.
- Residual risk:
  - Browser smoke is still pending for `/tv-management/weekly-report`, `admin?tab=weekly_report`, and the public alias `/tv/weekly-report`.

## 2026-03-25 Head Nurse Role Label Encoding

- Scope: repair the mojibake `head_nurse` label/description shown in the employee portal and prevent future SQL seeds from reintroducing the corrupted Vietnamese text.
- Checklist:
  - [x] Confirm the root cause between portal defaults and SQL-seeded role data
  - [x] Save the task spec and verification plan
  - [x] Add failing portal regression coverage for corrupted role catalog strings
  - [x] Patch the portal role-catalog merge path to repair corrupted seeded text
  - [x] Correct the SQL seed/update script for `head_nurse`
  - [x] Run targeted verification and record evidence
  - [x] Append the lesson and close out workflow notes
- Verification evidence:
  - `cmd /c npx tsx --test test\\unit\\roleCatalog.test.ts`: passed, 1/1 after first failing against the mojibake `head_nurse` seed payload.
  - `cmd /c npm run build`: passed, Vite production build completed successfully; the existing large-chunk warning remains.
  - Live Supabase verification via service-role REST on `2026-03-25`: `fdc_role_catalog.role_key = head_nurse` now returns `display_name = Điều dưỡng trưởng`, the correct description, and `updated_at = 2026-03-25T09:52:09.983318+00:00`.
  - `cmd /c npx wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true`: passed; deployment URL `https://5a063022.fdc-portal.pages.dev`.
  - Live bundle check on `2026-03-25`: both `https://5a063022.fdc-portal.pages.dev` and `https://portal.fdc-nhanvien.org/` serve `assets/index-ByYbAF67.js`.
- Residual risk:
  - Authenticated browser smoke for the specific `pthue` session is still useful, but the underlying live data and deployed bundle now both match the intended fix.

## 2026-03-25 Lab Dashboard TAT Test Name

- Scope: add a `Tên test` column to every `Chi tiết TAT` row by extending the bridge detail payload and keeping the table/export output aligned.
- Checklist:
  - [x] Save the task spec and implementation plan
  - [x] Add failing bridge/export coverage for `testName`
  - [x] Extend the bridge TAT detail payload with `testName`
  - [x] Render/export the new `Tên test` column in the portal
  - [x] Roll out the bridge detail files to the live host and verify the public payload
  - [x] Run targeted bridge + portal verification

- Verification evidence:
  - `cmd /c npx jest test/unit/labDashboardDetails.test.ts --runInBand` in `fdc-lan-bridge`: passed, 8/8 tests including TAT `testName` preservation across subgroup filters.
  - `cmd /c npx tsx --test test/unit/labDashboardDetailExport.test.ts`: passed, 6/6 tests including the `TÃªn test` export column assertion.
  - `cmd /c npm run build` in `fdc-lan-bridge`: passed (`tsc` clean).
  - `cmd /c npm run build` at repo root: passed, Vite production build completed successfully.
  - Live host root cause on `2026-03-25`: `/opt/fdc-lan-bridge/src/labDashboard/detailHelpers.ts` and `/opt/fdc-lan-bridge/src/labDashboard/service.ts` were stale, so the live TAT detail payload still omitted `testName` even though the local repo and tests were already correct.
  - SSH rollout to `Vostro-Server` (`hbminh@192.168.1.9`): copied `src/labDashboard/detailHelpers.ts`, `src/labDashboard/service.ts`, and `src/labDashboard/types.ts`, then ran `cd /opt/fdc-lan-bridge && sudo npm run build`.
  - Sequential restart verification on `2026-03-25`: `sudo systemctl restart fdc-lan-bridge && systemctl is-active fdc-lan-bridge` returned `active` after the rebuild completed.
  - Raw localhost verification on `2026-03-25`: `curl -s -D - 'http://localhost:3333/lab-dashboard/details?section=tat&focus=type%3Amien-dich&date=2026-03-25' | head -n 30` returned rows with `testName`, for example `[G] Mycoplasma pneumoniae IgM`.
  - Public bridge verification on `2026-03-25`: `Invoke-RestMethod https://bridge.fdc-nhanvien.org/lab-dashboard/details?section=tat&focus=type%3Amien-dich&date=2026-03-25` now exposes `testName`, for example `22001265 / [G] Mycoplasma pneumoniae IgM`, `23009760 / [G] AFP`, and `23009760 / [G] CA 72-4`.
- Residual risk:
  - The portal already rendered the column before this rollout, so operators with an old browser tab may still need a hard refresh to pick up the corrected bridge payload.

## 2026-03-25 Lab Dashboard Waiting Stage Fix

- Scope: stop paid lab rows from remaining in `Chờ lấy mẫu` when HIS only fills `do_servicedatadate`/`end_date`, and keep `Chênh lệch BH - ...` adjustment rows out of the lab queue entirely.
- Checklist:
  - [x] Confirm the live HIS root cause for patient `23009760`
  - [x] Save the task spec and implementation plan
  - [x] Add failing bridge coverage for timestamp fallback and BH-adjustment exclusion
  - [x] Patch the shared lab timeline query
  - [x] Run targeted bridge verification and a live waiting-queue check
  - [x] Append the lesson and close out workflow notes
- Verification evidence:
  - `cmd /c npx jest test/unit/labDashboardService.test.ts --runInBand` in `fdc-lan-bridge`: passed, 7/7.
  - `cmd /c npm test` in `fdc-lan-bridge`: passed, 13/13 suites and 58/58 tests.
  - `cmd /c npm run build` in `fdc-lan-bridge`: passed (`tsc` clean).
  - Local live-data check on `2026-03-25`: patient `23009760` is absent from `waiting` after the patch and appears only in `completed`; queue totals are now `waitingForSample=5`, `processing=0`, `completedToday=48`.
  - SSH rollout completed to `Vostro-Server` (`hbminh@192.168.1.9`): copied `/opt/fdc-lan-bridge/src/labDashboard/service.ts`, ran `sudo npm run build`, then `sudo systemctl restart fdc-lan-bridge`; service status returned `active`.
  - Public bridge verification on `2026-03-25`: `/lab-dashboard/details?section=queue&focus=waiting&date=2026-03-25` now returns `rowCount=0` with no `23009760`, while `/lab-dashboard/details?section=queue&focus=completed&date=2026-03-25` returns `matched=18` rows for `23009760`.
- Residual risk:
  - Queue/source provenance wording still mentions only `order_date` and `data_date`, so the source tab text should be aligned in a follow-up.

## 2026-03-25 TV Screen Preview Link

- Scope: align the TV management preview action with the effective screen URL so `internal` screens open their configured target route, while making `/tv/{slug}` explicit as a public alias rather than the only URL shown to operators.
- Checklist:
  - [x] Identify the mismatch between preview action and displayed internal URL
  - [x] Save the task spec and implementation plan
  - [x] Add failing unit coverage for preview URL derivation
  - [x] Implement helper-driven preview link behavior in `TvScreensTab`
  - [x] Clarify alias wording in the table UI
  - [x] Run targeted verification and record evidence
- Verification evidence:
  - `cmd /c npx tsx --test test\unit\tvScreenLinks.test.ts`: passed, 3/3.
  - `cmd /c npm run build`: passed, Vite build completed successfully.
  - `cmd /c npx wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true`: passed; deployment URL `https://2cac7f1d.fdc-portal.pages.dev`.
  - Live bundle check on `https://portal.fdc-nhanvien.org/`: now serves `assets/index-BRr6YnhA.js`, which contains the new `Alias cong khai` copy.
- Residual risk:
  - Interactive browser confirmation of the icon click after deploy is still pending, although the helper test and live bundle verification both match the intended fix.

## 2026-03-25 TV Management Route

- Scope: expose `Quản lý TV` as a dedicated `/tv-management` module in sidebar/bottom nav while preserving the existing admin `tv_screens` tab as a secondary entry point.
- Checklist:
  - [x] Confirm the desired architecture for a dedicated TV management route
  - [x] Save the task spec and implementation plan
  - [x] Add failing navigation visibility test coverage
  - [x] Add `tv_management` module key, route, and nav item
  - [x] Reuse `TvScreensTab` from a thin page at `/tv-management`
  - [x] Run targeted verification and record evidence
- Verification evidence:
  - `cmd /c npx tsx --test test\unit\navigation.test.ts`: passed, 2/2.
  - `cmd /c npm run build`: passed, Vite build completed successfully.
- Residual risk:
  - On mobile, `Quản lý TV` appears inside the `Thêm` sheet for `super_admin` because the bottom nav still caps primary items at 4.

## 2026-03-24 Lab Dashboard Real Inventory TV

- Scope: redesign the reagent section so `/lab-dashboard/tv` and reagent detail use real lab inventory rows from `fdc_inventory_snapshots`, while keeping the original card/chip visual language and slow upward TV marquee motion.
- Checklist:
  - [x] Confirm the approved TV summary direction with browser samples
  - [x] Save the approved design and refresh workflow files
  - [x] Save the implementation plan for inline execution
  - [x] Write failing bridge tests for row-level reagent payloads
  - [x] Replace bridge reagent summary/detail mapping away from synthetic groups
  - [x] Update portal summary/detail rendering and CSS to the approved TV motion layout
  - [x] Run targeted bridge + portal verification and record evidence
- Verification evidence:
  - `cmd /c npx jest test/unit/labDashboardService.test.ts --runInBand` in `fdc-lan-bridge`: passed, 5/5 tests covering real inventory reagent ordering, detail payloads, item-key focus, and paid-only waiting queue behavior.
  - `cmd /c npx jest test/unit/labDashboardDetails.test.ts --runInBand` in `fdc-lan-bridge`: passed, 7/7 tests including reagent detail sorting by stock and item-key filtering.
  - `cmd /c npx jest test/unit/labDashboardSourceProvenance.test.ts --runInBand` in `fdc-lan-bridge`: passed, 9/9 tests after reagent provenance switched to real `fdc_inventory_snapshots` rows and item-level focus.
  - `cmd /c npm test` in `fdc-lan-bridge`: passed, 13/13 suites and 56/56 tests.
  - `cmd /c npm run build` in `fdc-lan-bridge`: passed (`tsc` clean).
  - `cmd /c npx tsx --test test\unit\labDashboardDisplayModel.test.ts`: passed, 2/2 tests covering item-based chip labels and loop-ready reagent summary data.
  - `cmd /c npx tsx --test test\unit\labDashboardDetailExport.test.ts`: passed, 6/6 tests covering item-level reagent export labels and workbook output.
  - `cmd /c npm run build` at repo root: passed, Vite production build completed successfully; the existing large-chunk warning remains.
  - `cmd /c npx wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true`: passed, deployment URL `https://eb609305.fdc-portal.pages.dev`.
  - SSH rollout completed to `Vostro-Server` (`hbminh@192.168.1.9`): copied `src/labDashboard/detailHelpers.ts`, `src/labDashboard/service.ts`, `src/labDashboard/sourceProvenance.ts`, and `src/labDashboard/types.ts`, then ran `sudo npm run build` and `sudo systemctl restart fdc-lan-bridge`; service status returned `active`.
  - Live bridge verification on `2026-03-24`: local `http://localhost:3333/lab-dashboard/current` and public `https://bridge.fdc-nhanvien.org/lab-dashboard/current` both returned `123` reagent rows sorted as real inventory items; public `/lab-dashboard/details?section=reagents&focus=all` returned title `Chi tiết tồn kho khoa xét nghiệm`, `displayedRowCount=123`, and first row `XN0031 / Hóa chất xét nghiệm AMYLASE / 0.5 Cai`.
  - Residual risk:
    - The summary motion/readability requirement is highly visual, so browser smoke on `/lab-dashboard/tv` and `/lab-dashboard/details?section=reagents&focus=all` remains mandatory even after tests/builds pass.

## 2026-03-24 Lab Dashboard Source Table Names

- Scope: update lab dashboard source/provenance explanations so they reference the actual source table names directly in operator-facing text instead of generic dataset descriptions.
- Checklist:
  - [x] Identify which provenance builders still describe sources generically
  - [x] Add a failing test that asserts the rendered provenance strings contain the direct table names
  - [x] Update queue, TAT, abnormal, and reagent provenance text to call out the exact tables used
  - [x] Run targeted bridge verification and record evidence
- Verification evidence:
  - `cmd /c npx jest test/unit/labDashboardSourceProvenance.test.ts --runInBand` in `fdc-lan-bridge`: passed, 9/9 tests including the new direct-table-name provenance assertion.
  - `cmd /c npm test` in `fdc-lan-bridge`: passed, 13/13 suites and 54/54 tests.
  - `cmd /c npm run build` in `fdc-lan-bridge`: passed (`tsc` clean).
- Residual risk:
  - This is an operator-facing wording update, so a browser/source-tab smoke check is still useful after rollout even if the bridge tests pass.

## 2026-03-24 Lab Dashboard Paid Waiting Queue

- Scope: make `Hàng chờ lấy mẫu` count and waiting detail rows only include lab orders with `dm_servicegroupid = 3` and an existing `tb_treatment.isthutien = 1` record on the same `patientrecordid`.
- Checklist:
  - [x] Scan the HIS schema for payment-related fields and verify which signal matches live waiting rows
  - [x] Add a failing bridge test for paid-only waiting queue behavior
  - [x] Update the bridge queue timeline logic to keep unpaid waiting rows out of summary/detail waiting views
  - [x] Run targeted bridge verification and record evidence
- Verification evidence:
  - `cmd /c npx jest test/unit/labDashboardService.test.ts --runInBand` in `fdc-lan-bridge`: passed, 4/4 tests covering reagent alignment plus paid-only waiting summary/detail behavior.
  - `cmd /c npm test` in `fdc-lan-bridge`: passed, 13/13 suites and 53/53 tests.
  - `cmd /c npm run build` in `fdc-lan-bridge`: passed (`tsc` clean).
- Residual risk:
  - The payment rule is being inferred from HIS field behavior and test mocks in this session, so a live browser/API smoke check is still needed after rollout.

## 2026-03-24 Lab Dashboard Reagent Unit Alignment

- Scope: align the lab dashboard reagent stock section with the `Khoa Xét Nghiệm` inventory list so stock counts stay lab-scoped and blank snapshot units fall back to the same `Cái` label the inventory management screen shows.
- Checklist:
  - [x] Confirm the mismatch between dashboard reagent mapping and inventory list mapping
  - [x] Add a failing bridge test for lab-scoped reagent stock plus blank-unit fallback
  - [x] Update bridge reagent unit fallback to match inventory management
  - [x] Run targeted bridge verification and record evidence
- Verification evidence:
  - `cmd /c npx jest test/unit/labDashboardService.test.ts --runInBand` in `fdc-lan-bridge`: passed, 2/2 tests covering lab-only stock scoping and `Cái` fallback for blank reagent units in both current and detail payloads.
  - `cmd /c npm test` in `fdc-lan-bridge`: passed, 13/13 suites and 51/51 tests.
  - `cmd /c npm run build` in `fdc-lan-bridge`: passed (`tsc` clean).
- Residual risk:
  - Manual browser smoke on `/lab-dashboard` is still required after the bridge fix because this session is validating the mapping through tests rather than the rendered portal page.

## 2026-03-23 Lab Dashboard Source Provenance

- Scope: add structured, operator-friendly provenance to the lab dashboard source tab on both the bridge detail API and the portal UI.
- Checklist:
  - [x] Refresh the workflow files for the provenance follow-up
  - [x] Bridge contract/types
  - [x] Bridge provenance builder
  - [x] Portal type/helper
  - [x] Source-tab UI
  - [x] Verification evidence
- Verification evidence:
  - `cmd /c npx jest test/unit/labDashboardSourceProvenance.test.ts` in `fdc-lan-bridge`: passed, 8/8 tests covering queue, TAT, abnormal, reagent, canonical-label fallback, and no-`patientName` provenance strings.
  - `cmd /c npx jest test/integration/server.test.ts --runInBand` in `fdc-lan-bridge`: passed, 23/23 tests including the real `/lab-dashboard/details` route assertion and the fallback-path check that preserves fetched provenance when the TAT provenance builder throws.
  - `cmd /c npm test` in `fdc-lan-bridge`: passed, 12/12 suites and 49/49 tests.
  - `cmd /c npm run build` in `fdc-lan-bridge`: passed (`tsc` clean).
  - `cmd /c npx tsx --test test\unit\labDashboardSourceDetails.test.ts`: passed, 3/3 tests for structured block ordering, legacy fallback, and error-preserving behavior.
  - `cmd /c npm run build` at repo root: passed, Vite production build completed successfully; the existing large-chunk warning remains.
- Residual risk:
  - Manual browser smoke is still required because provenance readability is UI-sensitive and this session did not include a browser-driven check for `/lab-dashboard/tv` or `/lab-dashboard/details`.

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

## 2026-03-25 Room Management Sidebar

- Scope: register the approved `Quản lý phòng` module in portal navigation so it shows up in the shared sidebar and opens a real `/room-management` page.
- Checklist:
  - [x] Confirm the missing sidebar item is caused by an unregistered `room_management` module
  - [x] Save the focused task spec and verification plan
  - [x] Add failing navigation coverage for the room-management entry
  - [x] Register the room-management module key, nav item, and route
  - [x] Add a minimal `/room-management` portal page scaffold
  - [x] Run targeted verification and record evidence
- Verification evidence:
  - `cmd /c npx tsx --test test\unit\navigation.test.ts`: passed, 4/4 including the new `/room-management` assertion for both `super_admin` and `staff`.
  - `cmd /c npm run build`: passed, Vite production build completed successfully; the existing large-chunk warning remains.
- Residual risk:
  - `/room-management` is currently a floorplan-preview landing page, not the full maintenance/request/print workflow from the approved room-management design.

## 2026-03-31 Room Management Rollout

- Scope: roll out the already-implemented room-management sidebar/page to production because the live portal is still serving an older bundle.
- Checklist:
  - [x] Confirm the missing live sidebar item is a deployment gap, not missing source code
  - [x] Save the rollout task spec and verification plan
  - [x] Run fresh local verification for the room-management navigation/build state
  - [x] Deploy the current portal bundle to Cloudflare Pages
  - [x] Verify the live portal serves the updated asset hash
- Verification evidence:
  - `cmd /c npx tsx --test test\unit\navigation.test.ts`: passed, 4/4 including the `/room-management` assertion.
  - `cmd /c npm run build`: passed; emitted `assets/index-BZgJhm-U.js`.
  - `cmd /c npx wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true`: passed; deployment URL `https://6d2e6743.fdc-portal.pages.dev`.
  - `Invoke-WebRequest -UseBasicParsing https://portal.fdc-nhanvien.org`: passed; live HTML now references `assets/index-BZgJhm-U.js`.
  - `Invoke-WebRequest -UseBasicParsing https://portal.fdc-nhanvien.org/assets/index-BZgJhm-U.js`: passed; bundle contains `/room-management`.
  - `Invoke-WebRequest -UseBasicParsing https://portal.fdc-nhanvien.org/room-management`: passed with status `200`.
- Residual risk:
  - Users with an old service worker or cached tab may still need a hard refresh before the new sidebar item appears locally.

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
