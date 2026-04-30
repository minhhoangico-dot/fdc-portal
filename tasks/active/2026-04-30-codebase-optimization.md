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

- Boundary note: this is a behavior-preserving extraction. Supabase queries and business rules remain in the existing viewmodels/helpers; the new components own display markup and callback wiring only.
- Before line counts on `2026-04-30`:
  - `src/app/pharmacy/page.tsx`: `973` lines.
  - `src/app/inventory/OverviewTab.tsx`: `907` lines.
- Red test before extraction: `cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\portalPresentationComponents.test.ts` failed because the planned component files did not exist and `src/app/pharmacy/page.tsx` exceeded the `500` line budget.

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

### Residual Risks

- The PWA precache still includes normal route chunks as required by the plan, so the total precache size is lower than the pre-split build but remains above `1400 KiB`.
- No browser smoke was run for lazy route loading; build and typecheck prove the import graph, but runtime auth/navigation UX should still be checked during final verification.

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

## Closeout

- Final status: Agent 02 bundle/PWA work and Agent 05 bridge refactor work are implementation and verification complete; commits remain path-scoped because shared workflow files and other agent scopes have pre-existing uncommitted changes.
- Follow-up tasks:
  - Agent 03: portal presentation refactor.
  - Agent 04: portal viewmodel and realtime helper refactor.
  - Agent 05: bridge refactor.
  - Agent 06: final verification and review.
