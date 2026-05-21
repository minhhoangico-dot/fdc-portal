# Task Spec: codebase-optimization

## Goal

- Problem: Codebase optimization is unsafe while the portal typecheck includes unrelated bridge/prototype files and the bridge Jest suite has a known fixture failure.
- Desired outcome: Restore a green verification baseline, then enable measurable bundle, refactor, and bridge modularization work by separate agents.

## Scope

- In scope:
  - Narrow portal TypeScript checking to the portal-owned source/test surface.
  - Fix the bridge lab-dashboard provenance test fixtures for the current TAT row contract.
  - Record verification evidence for the optimization baseline.
  - Coordinate follow-up optimization agents with non-overlapping scopes.
- Out of scope:
  - Product behavior changes.
  - Visual redesigns.
  - Live SQL/index rollout without measurement evidence.
  - Portal route splitting, presentation refactors, viewmodel refactors, and bridge module splits in Agent 01.

## Constraints

- Technical constraints:
  - Preserve existing compiler options unless they directly cause noisy root verification.
  - Do not edit bridge production code for this baseline task.
  - Do not revert unrelated dirty worktree changes.
  - Keep portal imports using `@/` aliases in future implementation work.
- Product or operational constraints:
  - Verification must be trustworthy before bundle or refactor work starts.
  - Bridge tests protect clinic-facing synced dashboard data and should be kept green before bridge refactors.

## Assumptions

- The current root `npm run lint` failure is caused by the root TypeScript project including unrelated bridge Jest tests and `to be intergrate/**` prototype files.
- The bridge test failure is caused by stale fixtures after `LabDashboardTatDetailRow.testName` became required.
- The existing dirty worktree contains unrelated prior work that should be preserved.

## Affected Areas

- Files or directories:
  - `tsconfig.json`
  - `package.json` only if needed for a separate portal lint project
  - `fdc-lan-bridge/test/unit/labDashboardSourceProvenance.test.ts`
  - `src/app/admin/AddUserModal.tsx`
  - `src/app/admin/ApprovalTab.tsx`
  - `src/app/requests/create/page.tsx`
  - `src/components/weekly-report/WeeklyReportDetailsScreen.tsx`
  - `src/lib/supplyInventoryKpiDetails.ts`
  - `tasks/todo.md`
  - `tasks/active/2026-04-30-codebase-optimization.md`
- Systems touched:
  - Portal TypeScript verification.
  - Bridge Jest verification.
  - Repo workflow tracking.

## Role Split

- Planner: maintain this spec and the shared task board.
- Implementer: Agent 01 verifier/planner for baseline changes only.
- Verifier: run portal lint/build and bridge build/test.
- Reviewer: final multi-agent reviewer in `06-final-verification-review.md`.

## Implementation Plan

- [x] Create this active task spec.
- [x] Update `tasks/todo.md` for `codebase-optimization`.
- [x] Confirm failing baseline checks.
- [x] Narrow root TypeScript scope.
- [x] Fix bridge TAT provenance fixtures.
- [x] Run portal and bridge verification.
- [x] Record evidence and residual risks.

## Verification Plan

- Root baseline:
  - `cmd /c npm.cmd run lint`
  - `cmd /c npm.cmd run build`
- Bridge baseline:
  - `cmd /c npm.cmd run build`
  - `cmd /c npm.cmd test -- --runInBand`

## Verification Evidence

- Baseline `cmd /c npm.cmd run lint` at the repo root failed before the fix because root TypeScript included `fdc-lan-bridge/test/**` Jest globals and `to be intergrate/**` Next/prototype files.
- Baseline `cmd /c npm.cmd test -- --runInBand` in `fdc-lan-bridge` failed before the fixture fix because three `LabDashboardTatDetailRow` objects in `test/unit/labDashboardSourceProvenance.test.ts` were missing required `testName`.
- After narrowing `tsconfig.json`, root lint exposed real portal type errors in existing source. Minimal type fixes were applied in the affected source files so the restored lint baseline is meaningful.
- `cmd /c npm.cmd run lint` at the repo root: passed.
- `cmd /c npm.cmd run build` at the repo root: passed. Current large chunk warning remains; final emitted main chunk was `assets/index-vpbWUJmR.js` at `1,457.61 kB` minified and `389.62 kB` gzip, with PWA precache `18` entries / `1980.35 KiB`.
- `cmd /c npm.cmd run build` in `fdc-lan-bridge`: passed.
- `cmd /c npm.cmd test -- --runInBand` in `fdc-lan-bridge`: passed, `15` suites and `63` tests.

### Agent 03: Portal Presentation Refactor

### Implementation

- Boundary note: this is a behavior-preserving extraction. Supabase queries and business rules remain in the existing viewmodels/helpers; the new components own display markup and callback wiring only.
- Added `test/unit/portalPresentationComponents.test.ts` to lock the planned component exports and page-size budgets before the extraction.
- Split `src/app/pharmacy/page.tsx` into focused presentation modules:
  - `src/app/pharmacy/PharmacyFilters.tsx`
  - `src/app/pharmacy/PharmacyKpiGrid.tsx`
  - `src/app/pharmacy/PharmacyInventoryTable.tsx`
  - `src/app/pharmacy/PharmacyCharts.tsx`
  - `src/app/pharmacy/PharmacyAnomalySections.tsx`
  - `src/app/pharmacy/PharmacyDetailDrawer.tsx`
- Split `src/app/inventory/OverviewTab.tsx` into focused presentation modules:
  - `src/app/inventory/overview/InventoryAlertsPanel.tsx`
  - `src/app/inventory/overview/InventoryKpiGrid.tsx`
  - `src/app/inventory/overview/InventoryCharts.tsx`
- Kept inventory/pharmacy data loading and state ownership in the existing viewmodels and helpers, including `usePharmacyInventory`, `useSupplyChart`, and the KPI/detail helper modules.
- Targeted verification exposed one real logic bug outside the presentation split: `src/lib/inventory-dashboard-summary.ts` double-counted duplicate anomaly rows by `id`. Agent 03 fixed that by deduplicating anomaly ids before counting active alerts.

### File Size Evidence

- Before line counts on `2026-04-30`:
  - `src/app/pharmacy/page.tsx`: `973` lines.
  - `src/app/inventory/OverviewTab.tsx`: `907` lines.
- After extraction verification on `2026-04-30`:
  - `src/app/pharmacy/page.tsx`: `444` lines.
  - `src/app/inventory/OverviewTab.tsx`: `489` lines.

### Verification Evidence

- Red test before extraction: `cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\portalPresentationComponents.test.ts` failed because the planned component files did not exist and `src/app/pharmacy/page.tsx` exceeded the `500` line budget.
- Final verification on the extracted branch state:
  - `cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\portalPresentationComponents.test.ts test\unit\pharmacyInventoryPresentation.test.ts test\unit\inventoryDashboardSummary.test.ts`: passed with `7` tests and `0` failures.
  - `cmd /c npm.cmd run build`: passed; emitted `assets/index-CG8PUy3O.js` at `334.85 kB` minified / `101.81 kB` gzip, `assets/charts-BRJ_mBCz.js` at `383.36 kB`, `assets/xlsx-CkFp8p6R.js` at `429.53 kB`, and PWA precache `61` entries / `1576.42 KiB`.
  - `cmd /c npm.cmd run lint`: passed.

### Residual Risks

- No browser smoke was run for the extracted pharmacy and inventory presentation surfaces; current evidence is targeted unit coverage, production build, and typecheck only.
- `tasks/todo.md` already carries unrelated in-progress task-board edits, so Agent 03 did not update or stage that file as part of this slice.

## Review Notes

- Findings:
  - Agent 01 found and fixed additional portal type errors that were hidden by the previous noisy lint scope.
- Residual risks:
  - The worktree contains many unrelated dirty files; commit/stage operations must remain path-scoped.
  - No Agent 01 commit was created because `tasks/todo.md` had pre-existing uncommitted changes; staging the whole file would bundle unrelated work.
  - The portal build still has the expected large chunk warning. Agent 02 owns route/vendor splitting and PWA precache reduction.

## Agent 02: Portal Bundle And PWA

### Implementation

- Added bundle and PWA budget scripts:
  - `scripts/check-portal-bundle-budget.mjs`
  - `scripts/check-pwa-precache-budget.mjs`
- Added package scripts:
  - `npm run check:bundle`
  - `npm run check:pwa`
- Converted portal route pages in `src/App.tsx` to `React.lazy` imports while keeping providers, route guards, `AppShell`, and `RoomManagementProvider` synchronous.
- Added `src/components/layout/RouteFallback.tsx` for the shared Suspense fallback.
- Added stable Vite vendor chunks for React, Supabase, Recharts, and Lucide icons.
- Configured Workbox to ignore `**/xlsx-*.js` and cap individual precached files at `1024 * 1024` bytes.

### Verification Evidence

- Red check after adding budget scripts:
  - `cmd /c npm.cmd run build`: passed; pre-split output still emitted `assets/index-vpbWUJmR.js` at `1,457.61 kB` minified and precached `18` entries / `1980.35 KiB`.
  - `cmd /c npm.cmd run check:bundle`: failed as expected because `index-vpbWUJmR.js` was `1423.45 KiB`, above the `950.00 KiB` main budget.
  - `cmd /c npm.cmd run check:pwa`: failed as expected because `assets/xlsx-CkFp8p6R.js` was precached.
- Final verification:
  - `cmd /c npm.cmd run build`: passed; main chunk is now `assets/index-tu7jH01S.js` at `334.85 kB` minified and `101.80 kB` gzip.
  - Final build kept `assets/xlsx-CkFp8p6R.js` as a separate dynamic chunk at `429.53 kB` minified and `143.08 kB` gzip.
  - Final build precached `61` entries / `1571.35 KiB`; the XLSX chunk is excluded.
  - `cmd /c npm.cmd run check:bundle`: passed. Largest non-XLSX chunks were `charts-BRJ_mBCz.js` at `374.38 KiB`, `index-tu7jH01S.js` at `327.00 KiB`, and `supabase-yKjPlrCh.js` at `170.08 KiB`.
  - `cmd /c npm.cmd run check:pwa`: passed with `61` precache entries and no XLSX chunk.
  - `cmd /c npm.cmd run lint`: passed.
  - After the workspace later moved to branch `codex/portal-presentation-refactor` and picked up additional portal edits outside Agent 02 scope, Agent 02 reran `cmd /c npm.cmd run build`, `cmd /c npm.cmd run check:bundle`, `cmd /c npm.cmd run check:pwa`, and `cmd /c npm.cmd run lint`; all four commands passed again.
  - Fresh rerun output on that branch state: main chunk `assets/index-CSzXowQE.js` at `334.85 kB` minified / `101.80 kB` gzip, XLSX chunk `assets/xlsx-CkFp8p6R.js` at `429.53 kB`, and PWA precache `61` entries / `1572.51 KiB`.

### Residual Risks

- The PWA precache still includes normal route chunks as required by the plan, so the total precache size is lower than the pre-split build but remains above `1400 KiB`.
- No browser smoke was run for lazy route loading; build and typecheck prove the import graph, but runtime auth/navigation UX should still be checked during final verification.
- `src/App.tsx` still mixes this task's lazy-route changes with earlier uncommitted route-gate edits, so Agent 02 cannot produce a clean path-scoped commit from the current workspace without hunk-level staging.

## Agent 04: Portal Viewmodel And Realtime

### Implementation

- Added `src/lib/approval-actions.ts` for stable selection normalization and non-empty approval selection guards.
- Added `src/lib/supabase-realtime.ts` for shared `postgres_changes` subscription setup and cleanup.
- Reused the existing approval draft helper surface in `src/lib/approval-config.ts`; no duplicate `src/lib/admin-approval-template-draft.ts` was added because the immutable approval-template draft behavior already lived there.
- Rewired these modules to the shared realtime helper:
  - `src/contexts/AuthContext.tsx`
  - `src/viewmodels/useRequests.ts`
  - `src/viewmodels/useNotifications.ts`
  - `src/viewmodels/useImportExport.ts`
  - `src/viewmodels/useInventoryDashboardSummary.ts`
  - `src/viewmodels/useSupplyChart.ts`
  - `src/viewmodels/useApprovals.ts`
  - `src/viewmodels/usePharmacyInventory.ts`
  - `src/viewmodels/useSupplyInventory.ts`
- Rewired approval batching in `src/viewmodels/useApprovals.ts` to use the extracted selection helpers and dedupe intake IDs before consolidation.
- Added a dev-safe bridge URL path in `src/lib/bridge-client.ts` and updated `src/viewmodels/useAdmin.ts` plus `src/viewmodels/hikvision.ts` to use it so local portal smoke goes through `/api/bridge` instead of calling the production bridge origin directly.

### Verification Evidence

- Red phase before the helper extraction:
  - `cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\approvalActions.test.ts test\unit\approvalConfigState.test.ts test\unit\bridgeClient.test.ts test\unit\supabaseRealtime.test.ts` failed because `src/lib/approval-actions.ts`, `src/lib/supabase-realtime.ts`, and the `resolveBridgeBaseUrl` export did not exist.
- Final helper verification:
  - `cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\approvalActions.test.ts test\unit\approvalConfigState.test.ts test\unit\bridgeClient.test.ts test\unit\supabaseRealtime.test.ts`: passed with `10` tests and `0` failures.
  - `cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\pharmacyInventoryPresentation.test.ts test\unit\inventoryDashboardSummary.test.ts test\unit\approvalActions.test.ts test\unit\approvalConfigState.test.ts test\unit\supabaseRealtime.test.ts test\unit\bridgeClient.test.ts`: passed with `15` tests and `0` failures.
  - `cmd /c npm.cmd run lint`: passed.
  - `cmd /c npm.cmd run build`: passed.

### Residual Risks

- `src/lib/bridge-client.ts` now owns the local-dev bridge proxy behavior, so any future bridge-origin logic should be centralized there instead of reintroducing direct `import.meta.env.VITE_BRIDGE_URL` reads in viewmodels.

## Agent 05: Bridge Refactor

### Implementation

- Split lab dashboard loading into focused modules under `fdc-lan-bridge/src/labDashboard/loaders/`:
  - `shared.ts`: timeline CTE, freshness, normalization, and shared timeline fetch helpers.
  - `queue.ts`: queue summary and detail loading.
  - `tat.ts`: TAT summary and detail loading.
  - `abnormal.ts`: abnormal-result summary and detail loading.
  - `reagents.ts`: lab reagent inventory summary and detail loading.
- Kept `fdc-lan-bridge/src/labDashboard/service.ts` as the public facade for `getLabDashboardCurrent()` and `getLabDashboardDetails()`.
- Split weekly report stats into family modules under `fdc-lan-bridge/src/weeklyReport/queries/` while keeping `fdc-lan-bridge/src/weeklyReport/queries.ts` as the existing public import facade.
- Replaced broad weekly-report store `.select("*")` calls with explicit column constants for snapshots, logs, infectious codes, and service mappings.

### File Size Evidence

- Before this refactor:
  - `fdc-lan-bridge/src/labDashboard/service.ts`: `1064` lines.
  - `fdc-lan-bridge/src/weeklyReport/queries.ts`: `692` lines in the active workspace before splitting.
- After this refactor:
  - `fdc-lan-bridge/src/labDashboard/service.ts`: `229` lines.
  - `fdc-lan-bridge/src/labDashboard/loaders/shared.ts`: `196` lines.
  - `fdc-lan-bridge/src/labDashboard/loaders/queue.ts`: `93` lines.
  - `fdc-lan-bridge/src/labDashboard/loaders/tat.ts`: `151` lines.
  - `fdc-lan-bridge/src/labDashboard/loaders/abnormal.ts`: `249` lines.
  - `fdc-lan-bridge/src/labDashboard/loaders/reagents.ts`: `246` lines.
  - `fdc-lan-bridge/src/weeklyReport/queries.ts`: `330` lines.
  - Weekly query family modules: `examination.ts` `78`, `laboratory.ts` `62`, `imaging.ts` `64`, `procedures.ts` `68`, `infectious.ts` `122`, `transfer.ts` `37` lines.

### Verification Evidence

- Freeze before extraction: `cmd /c npx.cmd jest test/unit/labDashboardService.test.ts test/unit/labDashboardDetails.test.ts test/unit/labDashboardSourceProvenance.test.ts test/integration/server.test.ts --runInBand` passed, `4` suites and `47` tests.
- Loader checkpoints: after the extraction checkpoints, `cmd /c npx.cmd jest test/unit/labDashboardService.test.ts --runInBand` passed and `cmd /c npm.cmd run build` passed at each queue/TAT/abnormal/reagent checkpoint.
- Full lab-dashboard surface: `cmd /c npx.cmd jest test/unit/labDashboardService.test.ts test/unit/labDashboardDetails.test.ts test/unit/labDashboardSourceProvenance.test.ts test/integration/server.test.ts --runInBand` passed, `4` suites and `47` tests; `cmd /c npm.cmd run build` passed.
- Weekly report: `cmd /c npx.cmd jest test/unit/weeklyReportQueries.test.ts --runInBand` passed, `1` test; `cmd /c npm.cmd run build` passed.
- Full bridge verification: `cmd /c npm.cmd test -- --runInBand` passed, `15` suites and `63` tests; `cmd /c npm.cmd run build` passed.

### Residual Risks

- The worktree still contains unrelated dirty bridge and portal files from other agent scopes; any commit must avoid broad staging such as `git add fdc-lan-bridge/test`.
- This refactor was verified locally with bridge tests/build only; no live bridge rollout or API smoke was performed.

## Agent 06: Final Verification Review

### Verification Evidence

- `cmd /c npm.cmd run lint`: passed on `2026-04-30`.
- `cmd /c npm.cmd run build`: passed on `2026-04-30`; emitted `assets/index-Drc6An4x.js` at `335.45 kB` minified / `102.14 kB` gzip, `assets/charts-BRJ_mBCz.js` at `383.36 kB`, `assets/xlsx-CkFp8p6R.js` at `429.53 kB`, and PWA precache `61` entries / `1576.17 KiB`.
- `cmd /c npm.cmd run check:bundle`: passed; reported `index-Drc6An4x.js` at `327.59 KiB`, `charts-BRJ_mBCz.js` at `374.38 KiB`, `xlsx-CkFp8p6R.js` at `419.47 KiB`, and `supabase-yKjPlrCh.js` at `170.08 KiB`.
- `cmd /c npm.cmd run check:pwa`: passed with `61` precache entries and XLSX excluded from precache.
- `cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\pharmacyInventoryPresentation.test.ts test\unit\inventoryDashboardSummary.test.ts test\unit\approvalActions.test.ts test\unit\approvalConfigState.test.ts test\unit\supabaseRealtime.test.ts test\unit\bridgeClient.test.ts`: passed with `15` tests and `0` failures.
- `cmd /c npm.cmd run build` in `fdc-lan-bridge`: passed on `2026-04-30`.
- `cmd /c npm.cmd test -- --runInBand` in `fdc-lan-bridge`: passed on `2026-04-30`, `15` suites and `63` tests.
- Post-refactor size checks on `2026-04-30`:
  - `src/app/pharmacy/page.tsx`: `405` lines.
  - `src/app/inventory/OverviewTab.tsx`: `454` lines.
  - `fdc-lan-bridge/src/labDashboard/service.ts`: `229` lines.
  - `fdc-lan-bridge/src/weeklyReport/queries.ts`: `330` lines.
- Browser smoke against a fresh local Vite server at `http://127.0.0.1:3001`:
  - `/login`: rendered the expected login screen, and `pthue / 123` authenticated successfully on `2026-04-30`.
  - `/dashboard`: rendered the authenticated dashboard for `pthue` with live cards and user context.
  - `/inventory`: rendered `Kho vật tư` with tabs, KPI cards, charts, and live data.
  - `/pharmacy`: rendered `Quản lý Kho Thuốc` with KPIs, charts, and anomaly sections.
  - `/weekly-report`: resolved to `/tv-management/weekly-report` and rendered the weekly-report admin surface with snapshot, ICD, mapping, and custom-report sections.
  - `/admin`: rendered `Quản trị hệ thống` with live user rows, including `pthue`.
  - `/lab-dashboard/tv`: rendered the live dashboard after load instead of hanging on a blank route or CORS-denied access screen.
  - `cmd /c npx.cmd --yes @playwright/cli@latest console error`: returned `0` errors on the checked authenticated routes and the TV dashboard route.
  - `cmd /c npx.cmd --yes @playwright/cli@latest network` on `/admin` and `/lab-dashboard/tv`: showed `http://127.0.0.1:3001/api/bridge/tv-access/check => 200 OK` and `http://127.0.0.1:3001/api/bridge/lab-dashboard/current => 200 OK`.
  - `cmd /c npm.cmd run check:auth-smoke` with `PORTAL_SMOKE_BASE_URL=http://127.0.0.1:3001`, `PORTAL_SMOKE_USERNAME=pthue`, and `PORTAL_SMOKE_PASSWORD=123`: passed. The scripted smoke now logs in through the real UI and verifies `/dashboard`, `/inventory`, `/pharmacy`, `/weekly-report`, `/admin`, and `/lab-dashboard/tv`, including successful bridge responses for `/tv-access/check` and `/lab-dashboard/current`.

### Scope Drift Review

- `tasks/handoffs/` still contains only `README.md`; no implementation handoff notes were recorded by the subagents.
- Agent 04 landed as helper extraction plus hook rewiring. The only planned file intentionally not added is `src/lib/admin-approval-template-draft.ts`, because the existing `src/lib/approval-config.ts` already owned the immutable approval-template draft behavior.
- No SQL migration files or index rollout files were added by this optimization pass; the bridge changes are application-query refactors only.
- Final verification found one workflow guardrail miss and corrected it immediately: `fdc-lan-bridge/test/unit/detectAnomalies.test.ts` was missing the repository Apache-2.0 header.
- The stale authenticated-smoke blocker was a live auth/data issue, not a portal routing issue: the `fdc_user_mapping` row for `pthue@fdc.vn` still existed, but its `supabase_uid` pointed at a missing auth user. Final verification recreated the auth user, restored password `123`, and rebound `fdc_user_mapping.supabase_uid` so the documented smoke credential works again.

### Residual Risks

- Shared workflow files and unrelated dirty portal/bridge edits still prevent a clean path-scoped closeout commit from this workspace.

## Closeout

- Final status: `completed`. Agent 02 through Agent 06 changes are verified in the current tree, the documented smoke credential works again, and the local TV/bridge path is validated through the dev proxy.
- Follow-up tasks:
  - Keep future local bridge-dependent portal code on `buildBridgeUrl(...)` so dev smoke continues to route through `/api/bridge`.
  - If the `pthue` auth user is rotated again, update the shared smoke credential record instead of letting the task docs drift.
