# Task Spec: lab-dashboard-integration

## Goal

- Problem: `to be intergrate/lab-dashboard.html` is a standalone mockup with inline CSS/JS and random data, so it is not integrated with portal routing, TV screens, or live HIS/Supabase data.
- Desired outcome: Ship a live lab dashboard with an authenticated launcher route, a public full-screen TV route, and a bridge endpoint that returns queue, TAT, abnormal-result, and reagent-stock data without exposing patient names.

## Scope

- In scope:
- Add `/lab-dashboard` under the authenticated portal shell.
- Add `/lab-dashboard/tv` as a public full-screen route outside `AppShell`.
- Add `GET /lab-dashboard/current` in `fdc-lan-bridge`.
- Convert the standalone HTML into React components plus route-scoped styling.
- Reuse `fdc_tv_screens` by seeding an internal TV entry that points to `/lab-dashboard/tv`.
- Out of scope:
- Adding a new sidebar module or `ModuleKey`.
- Changing role catalog visibility rules.
- Large schema changes beyond a TV-screen seed SQL.

## Constraints

- Technical constraints:
- Keep portal pages thin and put fetch/state logic in a dedicated viewmodel.
- Keep bridge-side lab dashboard types local to the bridge.
- Avoid reverting or reshaping unrelated in-progress changes in the dirty worktree.
- Product or operational constraints:
- Public TV output must not include patient names.
- The launcher and TV pages should share the same masked payload in v1.

## Assumptions

- `tb_servicedata` provides enough live signal for queue, TAT, and abnormal-result sections via `servicedatausedate`, `order_date`, `data_date`, `data_value`, `data_value_lh`, and grouped master rows.
- Reagent stock can be sourced from existing inventory snapshots with a bridge-side lab reagent allowlist, with HIS fallback if snapshots are unavailable.

## Affected Areas

- Files or directories:
- `fdc-lan-bridge/src/server.ts`
- `fdc-lan-bridge/src/labDashboard/**`
- `fdc-lan-bridge/test/integration/server.test.ts`
- `src/App.tsx`
- `src/app/lab-dashboard/**`
- `src/components/lab-dashboard/**`
- `src/viewmodels/useLabDashboard.ts`
- `src/types/labDashboard.ts`
- `sql/`
- `tasks/todo.md`
- Systems touched:
- Portal routing/UI, LAN bridge API, HIS read queries, Supabase inventory snapshots, TV screen registry.

## Role Split

- Planner: Refresh shared task files and capture assumptions.
- Implementer: Build bridge endpoint, portal routes, shared display component, and TV seed SQL.
- Verifier: Run TypeScript and bridge test checks, then record residual gaps.
- Reviewer: Review for privacy regressions, route leaks, and broken existing TV behavior.

## Implementation Plan

- [x] Refresh shared workflow files for this task.
- [x] Add bridge lab dashboard service and register `GET /lab-dashboard/current`.
- [x] Add portal lab dashboard types, viewmodel, launcher route, public TV route, and scoped styling.
- [x] Seed a default `fdc_tv_screens` entry for the internal lab TV route.
- [x] Run verification and record residual risks.

## Verification Plan

- Command or check 1: `npm run lint`
- Command or check 2: `cd fdc-lan-bridge && npm test`
- Command or check 3: smoke-read `GET /lab-dashboard/current` via tests/mocks and confirm no patient names are returned in payload rows

## Review Notes

- Findings:
- No new feature-specific defects found during bridge build/test or portal production build checks.
- Residual risks:
- HIS timestamp semantics for queue/TAT are inferred from live column behavior; production validation should confirm the stage labels align with lab operations.
- Top-level `npm run lint` still fails because the repo includes unrelated Jest test files, Supabase edge functions, and archived `to be intergrate` code that are already part of the root TypeScript program.
- The seeded TV row still needs to be applied in the target database before `/tv/xet-nghiem` will redirect to `/lab-dashboard/tv`.

## Closeout

- Final status: completed
- Follow-up tasks:
- Apply `sql/20260322_lab_dashboard_tv_screen.sql` in the target environment.
- Validate queue/TAT labels with lab operations after first live rollout.
