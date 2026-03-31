# Task Spec: weekly-report-tv-management

## Goal

- Problem: `Bao cao giao ban` was split between the main `/weekly-report` module, the admin `weekly_report` tab, and TV management, which made the operator flow fragmented.
- Desired outcome: move the full weekly-report management flow under `/tv-management/weekly-report`, add a row-level settings action on the weekly-report TV screen, and turn legacy routes into redirects.

## Scope

- In scope:
  - remove `Bao cao giao ban` from the main navigation
  - remove the admin `weekly_report` tab and redirect the legacy deep link
  - add the unified route `/tv-management/weekly-report`
  - add new TV/detail routes under `/tv-management/weekly-report/*`
  - identify the weekly-report TV row through `settings.featureKey`
  - preserve `settings` during TV row edit/save
  - backfill or seed the weekly-report row in `fdc_tv_screens`
- Out of scope:
  - changing bridge endpoints under `/weekly-report/*`
  - changing TV/detail auth from `weekly_report` to `tv_management`
  - redesigning the entire `TvScreensTab` UI

## Constraints

- Technical constraints:
  - page components stay thin; data logic remains in `useWeeklyReport*` and `useTvScreens`
  - use `@/` imports
  - editing a TV row must not drop `settings.featureKey`
- Product or operational constraints:
  - legacy routes must still work as redirects so old bookmarks/public aliases do not break
  - weekly-report TV/detail access must keep the existing `weekly_report` + `TvAccessGate` protection

## Assumptions

- The unified management page is super-admin managed because it now lives under `tv_management`.
- The weekly-report TV screen should stay an `internal` TV entry.

## Affected Areas

- Files or directories:
  - `src/App.tsx`
  - `src/lib/navigation.ts`
  - `src/lib/tv-screen-links.ts`
  - `src/lib/weekly-report.ts`
  - `src/app/admin/**`
  - `src/app/tv-management/**`
  - `src/app/weekly-report/**`
  - `src/components/weekly-report/**`
  - `src/viewmodels/useAdmin.ts`
  - `src/viewmodels/useTvScreens.ts`
  - `test/unit/*.test.ts`
  - `sql/*.sql`
- Systems touched:
  - portal routing
  - TV management UI
  - weekly-report operator/admin UI
  - Supabase TV screen config data

## Role Split

- Planner: capture scope, assumptions, and verification plan
- Implementer: routes, redirects, helpers, unified management page, TV row action, SQL migration
- Verifier: run targeted tests/build and record rollout evidence
- Reviewer: check navigation, route guards, and live TV row risk

## Implementation Plan

- [x] Write workflow files for the weekly-report-under-TV-management task
- [x] Add failing tests for nav visibility, weekly-report URL helpers, and TV row settings detection
- [x] Switch helpers/navigation to the new namespace
- [x] Create `/tv-management/weekly-report` plus new TV/detail routes
- [x] Convert legacy routes to redirects
- [x] Remove the old admin tab and redirect `admin?tab=weekly_report`
- [x] Preserve `settings` on TV row edit and add the row-level settings action
- [x] Add SQL backfill/seed logic for `fdc_tv_screens`
- [x] Run verification and record results
- [x] Deploy the portal bundle and verify the live TV row exists

## Verification Plan

- Command or check 1: `cmd /c npx tsx --test test\unit\navigation.test.ts test\unit\tvScreenLinks.test.ts test\unit\weeklyReportLinks.test.ts`
- Command or check 2: `cmd /c npm run build`
- Command or check 3: `cmd /c npx wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true`
- Command or check 4: verify the live bundle and `public.fdc_tv_screens` row via `POST /pg/query`

## Review Notes

- Findings:
  - Production `fdc_tv_screens` did not contain any weekly-report row, so the original update-only SQL backfill would not make the feature appear under `/tv-management` until a row was seeded.
- Residual risks:
  - Browser smoke is still pending for `/tv-management/weekly-report`, `admin?tab=weekly_report`, and the public alias `/tv/weekly-report`.

## Closeout

- Final status: done, deployed, and seeded live TV config
- Follow-up tasks:
  - browser smoke `/tv-management`
  - browser smoke `/tv-management/weekly-report`
  - browser smoke `/tv/weekly-report`

## Verification Evidence

- `cmd /c npx tsx --test test\unit\navigation.test.ts test\unit\tvScreenLinks.test.ts test\unit\weeklyReportLinks.test.ts`: passed, 13/13 tests covering nav removal, TV row settings detection, legacy weekly-report fallback, and the new `/tv-management/weekly-report/*` helper URLs.
- `cmd /c npm run build`: passed, Vite production build completed successfully; the existing large-chunk warning remains.
- `cmd /c npx wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true`: passed; deployment URL `https://2c28fa65.fdc-portal.pages.dev`.
- Live bundle check on `2026-03-25`: both `https://2c28fa65.fdc-portal.pages.dev/` and `https://portal.fdc-nhanvien.org/` serve `assets/index-Cs7T1ENy.js`, which contains the `/tv-management/weekly-report` routing changes.
- Live Supabase verification via `POST /pg/query` on `2026-03-25`: production initially had no weekly-report row in `public.fdc_tv_screens`; after the seed/upsert, slug `weekly-report` exists with `content_url = /tv-management/weekly-report/tv`, `feature_key = weekly_report`, `is_active = true`, and `updated_at = 2026-03-25 12:00:08.015144+00`.
