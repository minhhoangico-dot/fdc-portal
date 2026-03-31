# Task Spec: remove-reports-module

## Goal

- Problem: The legacy `/reports` module is no longer wanted in the portal UI.
- Desired outcome: Remove the reports module from routing, navigation, and type catalogs without affecting the remaining portal modules.

## Scope

- In scope:
- Remove the `/reports` route and page dependency.
- Remove the `reports` module key from navigation visibility and role catalog types.
- Delete report-only source files that become unused.
- Out of scope:
- Weekly report (`/weekly-report`) functionality.
- Admin weekly report configuration.

## Constraints

- Technical constraints:
- Keep imports using `@/` aliases where applicable.
- Avoid touching unrelated modules or reverting unrelated workspace changes.
- Product or operational constraints:
- Existing role-based navigation must stay valid after cleanup.

## Assumptions

- The user request to "loại bỏ phần này" refers to removing the `/reports` module described in the previous explanation.

## Affected Areas

- Files or directories:
- `src/App.tsx`
- `src/lib/navigation.ts`
- `src/types/roleCatalog.ts`
- `src/app/reports/page.tsx`
- `src/viewmodels/useReports.ts`
- `tasks/todo.md`
- Systems touched:
- Portal routing and navigation only.

## Role Split

- Planner: Scope removal and capture workflow artifacts.
- Implementer: Remove reports module references and dead files.
- Verifier: Run TypeScript verification after cleanup.
- Reviewer: Check for residual references to `reports`.

## Implementation Plan

- [x] Record the task in shared workflow files.
- [x] Remove route, navigation, and type references for `reports`.
- [x] Delete unused reports page and viewmodel.
- [x] Verify typecheck passes and no `reports` references remain in portal code.

## Verification Plan

- Command or check 1: `npm run lint`
- Command or check 2: search for remaining `/reports` and `useReports` references in `src/`

## Review Notes

- Findings:
- `src/` no longer contains `/reports`, `useReports`, `ReportSummary`, or `ReportPeriod` references after cleanup.
- Residual risks:
- Root `npm run lint` is currently noisy from unrelated pre-existing TypeScript issues in `fdc-lan-bridge/test`, `supabase/functions`, and `to be intergrate/`, so repository-wide typecheck is not a clean signal for this task.

## Closeout

- Final status: done
- Follow-up tasks: none
