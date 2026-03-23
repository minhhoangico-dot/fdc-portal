# Task Spec: lab-dashboard-source-provenance

## Goal

- Problem: `Nguồn dữ liệu` on `/lab-dashboard/details` and `/lab-dashboard/tv` only exposes shallow notes, so operators cannot verify how the current rows were derived or why a focus produces the visible result set.
- Desired outcome: Extend the existing detail contract additively so the bridge can return structured provenance for lab dashboard source tabs, and the portal can render that provenance in an operator-friendly way without exposing `patientName`.

## Scope

- In scope:
  - Add additive provenance fields to the bridge lab-dashboard detail contract
  - Build bridge provenance for queue, TAT, abnormal, and reagent detail sources
  - Add a portal helper/type surface for the structured source contract
  - Render the source-tab UI so it prefers structured provenance over legacy notes
  - Keep labels and explanations operator-friendly and suitable for clinic staff
- Out of scope:
  - Per-row provenance traces
  - Any contract change that removes or renames the existing `calculationNotes` fallback during rollout
  - Exposing `patientName` in any payload, helper, or UI
  - Adding a separate provenance endpoint

## Constraints

- Technical constraints:
  - The contract change must be additive and backward compatible.
  - Provenance counts and funnel steps must come from the same arrays and filters used to derive the final detail rows.
  - The UI should render structured provenance first and only fall back to `calculationNotes` when structured fields are absent.
  - Use `@/` imports in portal code.
- Product or operational constraints:
  - Labels, explanations, and dataset names must be operator-friendly and readable in Vietnamese.
  - No per-row provenance in the UI.
  - `patientName` must never appear in the bridge payload, portal helper output, or rendered source tab.

## Assumptions

- The current `meta.sourceDetails[]` shape is the right place to extend provenance for both `/lab-dashboard/details` and `/lab-dashboard/tv`.
- The bridge already has enough data at detail-build time to compute truthful funnel counts without introducing new queries.
- Existing `calculationNotes` should remain available during rollout so older portal builds can still render source information safely.

## Affected Areas

- Files or directories:
  - `fdc-lan-bridge/src/labDashboard/**`
  - `fdc-lan-bridge/test/integration/server.test.ts`
  - `src/types/labDashboard.ts`
  - `src/lib/labDashboardSourceDetails.ts`
  - `src/components/lab-dashboard/LabDashboardDetailScreen.tsx`
  - `src/components/lab-dashboard/LabDashboardSourcePanel.tsx`
  - `src/app/lab-dashboard/lab-dashboard.css`
  - `tasks/todo.md`
- Systems touched:
  - LAN bridge detail API
  - Portal detail/source-tab UI
  - Lab dashboard verification flow

## Role Split

- Planner: Keep scope additive, preserve backward compatibility, and document verification expectations.
- Implementer: Add bridge provenance builders, portal source helper/types, and source-tab rendering.
- Verifier: Run bridge tests/build, portal tests/build, and manual smoke on `/lab-dashboard/tv`.
- Reviewer: Check that provenance is truthful, operator-friendly, and free of `patientName`.

## Implementation Plan

- [ ] Refresh the workflow files for the provenance follow-up.
- [ ] Add additive bridge contract/types and provenance builder coverage.
- [ ] Add the portal helper/types and source-tab rendering.
- [ ] Run verification and record evidence.

## Verification Plan

- Command or check 1: `cmd /c npm test` in `fdc-lan-bridge`
- Command or check 2: `cmd /c npm run build` in `fdc-lan-bridge`
- Command or check 3: `cmd /c npx tsx --test test\unit\labDashboardSourceDetails.test.ts`
- Command or check 4: `cmd /c npm run build` at repo root
- Command or check 5: Manual smoke on `/lab-dashboard/tv` and `/lab-dashboard/details` source tabs for queue, TAT, abnormal, and reagents

## Review Notes

- Findings:
  - None yet; this task only refreshes workflow tracking.
- Residual risks:
  - The provenance contract must stay additive until all portal consumers are updated.
  - Manual browser smoke is still required because source-tab UI changes can regress readability even when tests pass.

## Closeout

- Final status: workflow setup pending implementation.
- Follow-up tasks:
  - Implement the bridge provenance contract and builder.
  - Implement the portal helper and source-tab UI.
  - Capture verification evidence in `tasks/todo.md` and this spec.
