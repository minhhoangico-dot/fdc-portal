# Task Spec: admin-tv-surface-removal

## Goal

- Problem: TV management is available in both `/admin` and `/tv-management`, but the desired state is to keep it only under `/tv-management`.
- Desired outcome: remove the `Màn hình TV` admin tab and redirect `admin?tab=tv_screens` to `/tv-management`.

## Scope

- In scope:
  - remove the TV tab from `/admin`
  - redirect legacy `tv_screens` admin deep links
  - remove obsolete `tv_screens` admin tab typing/state
- Out of scope:
  - changes to `/tv-management`
  - changes to TV CRUD logic

## Affected Areas

- `src/app/admin/page.tsx`
- `src/viewmodels/useAdmin.ts`
- `src/app/admin/admin-navigation.ts`
- `test/unit/adminNavigation.test.ts`

## Verification Plan

- `cmd /c npx tsx --test test\unit\adminNavigation.test.ts test\unit\navigation.test.ts`
- `cmd /c npm run build`

## Review Notes

- Findings:
  - none during the targeted admin navigation/build verification pass
- Residual risks:
  - browser smoke is still useful for `/admin?tab=tv_screens` to confirm the redirect lands on `/tv-management` in-app

## Closeout

- Final status: done and deployed
- Follow-up tasks:
  - optional browser smoke for `/admin?tab=tv_screens`

## Verification Evidence

- `cmd /c npx tsx --test test\unit\adminNavigation.test.ts`: passed, 3/3 tests covering the weekly report redirect, the legacy `tv_screens` redirect, and the removed admin tab list entry.
- `cmd /c npx tsx --test test\unit\adminNavigation.test.ts test\unit\navigation.test.ts`: passed, 6/6 tests including the dedicated `/tv-management` navigation checks.
- `cmd /c npm run build`: passed, Vite production build completed successfully; the existing large-chunk warning remains.
- `cmd /c npx wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true`: passed; deployment URL `https://713c48b6.fdc-portal.pages.dev`.
- Live bundle check on `2026-03-25`: both `https://713c48b6.fdc-portal.pages.dev/` and `https://portal.fdc-nhanvien.org/` serve `assets/index-CEz0pAN3.js`, which contains the `admin?tab=tv_screens -> /tv-management` redirect logic and the reduced admin tab list.
