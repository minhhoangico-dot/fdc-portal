# Task Spec: lab-dashboard-tv-drilldown

## Goal

- Problem: `/lab-dashboard/tv` only shows live summary cards, so lab staff cannot click directly on a metric to inspect detailed rows and verify the underlying data source/calculation from the same display.
- Desired outcome: Add drill-down navigation inside `/lab-dashboard/tv` so each main section can open a dedicated detail screen with `Danh sách chi tiết` and `Nguồn dữ liệu`, backed by a lazy-loaded bridge API that keeps patient names masked.

## Scope

- In scope:
  - Add a detail bridge API for lab dashboard sections and focuses
  - Extend bridge lab dashboard types with detail contracts and calculation metadata
  - Add TV detail-mode routing via search params on `/lab-dashboard/tv`
  - Make queue, TAT, abnormal, and reagent summary blocks clickable on the TV display
  - Add a dedicated TV detail screen with list/source tabs and back navigation
  - Re-align the TV summary density and composition to match `to be intergrate/lab-dashboard.html`
- Out of scope:
  - Changing the launcher page `/lab-dashboard` beyond keeping it compatible with the summary view
  - Adding patient names or any PHI beyond the already-masked `patientCode`
  - Redesigning the polling behavior of the summary route

## Constraints

- Technical constraints:
  - Keep `/lab-dashboard/current` lightweight for its 30-second TV polling behavior.
  - Detail data must be fetched lazily through a separate route.
  - Portal page components stay thin; fetching/state lives in a viewmodel or helper hook.
  - Use `@/` imports in portal code.
- Product or operational constraints:
  - Drill-down is only required on `/lab-dashboard/tv`.
  - `Nguồn dữ liệu` must include both freshness metadata and a short explanation of how the chosen metric is calculated.
  - `patientName` must never appear in any detail payload or UI.

## Assumptions

- A full-screen detail state within the same `/lab-dashboard/tv` route is acceptable as long as the user can return to the live summary immediately.
- Queue/TAT detail rows should operate at the per-order/per-root-lab-record level using the same HIS timeline data already used for summary metrics.
- Empty or partially failing sections should still render source metadata so staff can understand why detail rows are missing.

## Affected Areas

- Files or directories:
  - `fdc-lan-bridge/src/labDashboard/**`
  - `fdc-lan-bridge/src/server.ts`
  - `fdc-lan-bridge/test/integration/server.test.ts`
  - `src/app/lab-dashboard/tv/page.tsx`
  - `src/components/lab-dashboard/**`
  - `src/viewmodels/useLabDashboard.ts`
  - `src/types/labDashboard.ts`
  - `tasks/todo.md`
- Systems touched:
  - LAN bridge API
  - HIS queue/TAT/abnormal queries
  - Supabase inventory snapshot lookups
  - Portal TV UI

## Role Split

- Planner: Capture scope, interaction model, and verification.
- Implementer: Add bridge detail API plus TV drill-down UI and routing.
- Verifier: Run bridge tests/build, portal build, and smoke the drill-down flows.
- Reviewer: Check masking, filter correctness, and any regressions in the live summary behavior.

## Implementation Plan

- [x] Update workflow files for this drill-down task.
- [x] Add failing bridge tests for `/lab-dashboard/details`.
- [x] Implement detail bridge types, validation, query builders, and route registration.
- [x] Extend portal lab dashboard types/viewmodels for lazy detail fetching and TV detail mode.
- [x] Add clickable summary/detail UI on `/lab-dashboard/tv` with `Danh sách chi tiết` and `Nguồn dữ liệu`.
- [x] Run verification and capture residual risks.

- [x] Reconcile the TV summary layout against `to be intergrate/lab-dashboard.html` after user visual feedback.

## Verification Plan

- Command or check 1: `cd fdc-lan-bridge && npm test`
- Command or check 2: `cd fdc-lan-bridge && npm run build`
- Command or check 3: `npm run build`
- Command or check 4: Manual smoke of `/lab-dashboard/tv` detail navigation for queue, TAT, abnormal, and reagents.

## Review Notes

- Findings:
  - No blocking issues found in the implemented bridge detail contract, portal build, or targeted test coverage.
  - Summary layout now follows the compact reagent-chip composition from `to be intergrate/lab-dashboard.html`, which prevents the reagent row from consuming the middle-row height on `/lab-dashboard/tv`.
  - TV mode no longer renders the extra summary footer or the abnormal/reagent header action links, which brings the chrome closer to `to be intergrate/lab-dashboard.html` without changing the agreed drill-down focus mapping.
- Deployment:
  - Cloudflare Pages deploy completed for `fdc-portal`: `https://aa36fe9e.fdc-portal.pages.dev`.
  - Bridge rollout completed on `Vostro-Server` and public `/lab-dashboard/details` now responds successfully.
- Residual risks:
  - Manual smoke on the actual `/lab-dashboard/tv` UI was not executed in this session, so click-target coverage and visual polish still need a browser check.
  - Root `npm run lint` is not part of this task because repo-wide TypeScript issues already exist outside the lab dashboard area.
  - Queue/TAT detail accuracy still depends on HIS timestamp semantics and should be validated by lab operations after rollout.

## Closeout

- Final status: implemented locally and verified by targeted automated checks; pending browser smoke.
- Follow-up tasks:
  - Verify `/lab-dashboard/tv` manually in a browser for queue, TAT, abnormal, and reagent click flows.
  - Validate queue/TAT detail rows with lab staff against real HIS timestamps after rollout.
