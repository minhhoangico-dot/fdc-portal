# Task Spec: lab-dashboard-detail-scroll-export

## Goal

- Problem: `/lab-dashboard/tv` detail mode does not reliably scroll through long row sets, and operators cannot export the currently opened focus for offline confirmation.
- Desired outcome: Keep the detail action bar fixed, make the detail table own scrolling, and add `.xlsx` export for the exact `section` + `focus` currently shown in `Danh sách chi tiết`.

## Scope

- In scope:
  - Fix nested overflow/min-height rules for detail-mode list rendering
  - Add a portal-side export helper for current-focus `.xlsx`
  - Wire a `Xuất Excel` action into the detail screen
  - Add targeted unit coverage for export mapping and export availability
- Out of scope:
  - Adding a bridge-side export endpoint
  - Exporting all section rows beyond the active focus
  - Adding export to the `Nguồn dữ liệu` tab

## Constraints

- Technical constraints:
  - Keep the bridge API unchanged; use the current `LabDashboardDetailPayload`.
  - Follow TDD for export helper behavior.
  - Use `@/` imports in portal code.
  - Avoid regressing the shared TV summary layout in `src/app/lab-dashboard/lab-dashboard.css`.
- Product or operational constraints:
  - Export must never expose `patientName`.
  - Export uses the current rendered payload snapshot if background refresh is happening.
  - Operators need real `.xlsx`, not `.csv`.

## Assumptions

- Browser-side workbook generation is acceptable for the expected focus-level row counts.
- A lazy-loaded `xlsx` dependency is preferable to adding workbook code to the initial detail bundle.

## Affected Areas

- Files or directories:
  - `src/components/lab-dashboard/LabDashboardDetailScreen.tsx`
  - `src/app/lab-dashboard/lab-dashboard.css`
  - `src/lib/labDashboardDetailExport.ts`
  - `test/unit/labDashboardDetailExport.test.ts`
  - `package.json`
  - `package-lock.json`
  - `tasks/todo.md`
- Systems touched:
  - Portal TV detail UI
  - Browser-side export/download flow

## Role Split

- Planner: refresh workflow files and implementation plan for the scroll/export follow-up
- Implementer: add export helper, hook up the detail screen, and fix CSS overflow
- Verifier: run targeted tests/build and record evidence, plus note any manual-smoke gap
- Reviewer: check export correctness, scroll ownership, and summary-layout regression risk

## Implementation Plan

- [ ] Add failing unit tests for export mapping, filename sanitization, and availability rules.
- [ ] Add the browser-side `xlsx` dependency and implement the export helper.
- [ ] Wire `Xuất Excel` in the detail screen and fix the inner-scroll layout chain.
- [ ] Run targeted verification and record evidence.

## Verification Plan

- Command or check 1: `cmd /c npx tsx --test test\unit\labDashboardDetail.test.ts`
- Command or check 2: `cmd /c npx tsx --test test\unit\labDashboardDetailExport.test.ts`
- Command or check 3: `cmd /c npm run build`
- Command or check 4: Manual smoke on `/lab-dashboard/tv` detail mode for scroll + `.xlsx` export and summary layout comparison against `to be intergrate/lab-dashboard.html`

## Review Notes

- Findings:
  - No blocking findings remain after review loops.
  - Helper review required two follow-up fixes: derive worksheet names from the active section and fail fast on unsupported sections instead of silently falling back to the reagent schema.
  - UI/CSS review required one follow-up fix: convert the detail screen into a bounded flex column and add a synchronous export lock to prevent duplicate downloads on fast double-click.
- Residual risks:
  - CSS changes share the summary screen stylesheet, so manual verification should still compare `/lab-dashboard/tv` against `to be intergrate/lab-dashboard.html`.
  - There is still no component-level integration test for export-button visibility/disabled state or scroll containment because the current node-based test runner does not load the component's CSS import directly.

## Closeout

- Final status: implemented locally and verified by targeted automated checks; manual browser smoke still pending
- Follow-up tasks:
  - Verify export file contents with real lab operators after deployment if format adjustments are needed.
  - Run a browser smoke on `/lab-dashboard/tv` to confirm inner scrolling and compare the summary layout against `to be intergrate/lab-dashboard.html`.
