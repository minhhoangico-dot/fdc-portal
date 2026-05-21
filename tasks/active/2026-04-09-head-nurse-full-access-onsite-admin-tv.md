# Task Spec: head-nurse-full-access-onsite-admin-tv

## Goal

- Problem: `head_nurse` still lacks the same effective portal access as `super_admin`, while onsite gating only protects TV-facing routes and does not cover `/admin` or `/tv-management`.
- Desired outcome: Give `head_nurse` the same portal-level access as `super_admin`, but keep `super_admin` as the only onsite bypass role so `head_nurse` still needs onsite access for `/admin`, `/tv-management`, and TV display surfaces.

## Scope

- In scope:
  - shared portal-level full-access helper for `super_admin` and `head_nurse`
  - permission and navigation parity for `head_nurse`
  - reusable onsite gate extracted from the current TV-only flow
  - onsite protection for `/admin`, `/tv-management`, and existing TV display routes
  - targeted regression tests and build verification
- Out of scope:
  - changing stored user roles in Supabase
  - rewriting persisted workflow steps that intentionally target the real `super_admin`
  - changing bridge allowlist/site configuration values

## Constraints

- Technical constraints:
  - The source repo was dirty on `main`, so implementation was first validated in an isolated worktree before being copied back into the main workspace.
  - Existing workflow paths that use `approver_role: 'super_admin'` as real business ownership must not be broadened accidentally.
  - On Windows, targeted tests should use the local `tsx.cmd` binary from `node_modules\.bin` because `npx tsx` can resolve package exports incorrectly in the worktree.
- Product or operational constraints:
  - `super_admin` keeps full bypass behavior.
  - `head_nurse` must still be onsite to access `/admin`.
  - `head_nurse` must still be onsite to access `/tv-management`.
  - TV display routes remain onsite-only for non-`super_admin` users.

## Assumptions

- Portal-level "same access as `super_admin`" means module access, navigation visibility, dashboard/admin UI, and runtime action overrides, not reassignment of persisted workflow ownership.
- `/tv-management/weekly-report` should follow the same onsite rule as the rest of `/tv-management`.

## Affected Areas

- Files or directories:
  - `src/lib/role-access.ts`
  - `src/lib/role-authority.ts`
  - `src/lib/permissions/access.ts`
  - `src/lib/onsite-access.ts`
  - `src/App.tsx`
  - `src/app/admin/page.tsx`
  - `src/viewmodels/useDashboard.ts`
  - `src/app/dashboard/page.tsx`
  - `src/viewmodels/useApprovals.ts`
  - `src/components/weekly-report/WeeklyReportTvScreen.tsx`
  - `src/components/auth/**`
  - `test/unit/**`
  - `tasks/**`
- Systems touched:
  - Portal frontend only
  - Bridge TV access endpoint reused via existing client call, but not modified in this task

## Role Split

- Planner: design and implementation plan already captured in `docs/superpowers/`.
- Implementer: add helper parity, onsite gate reuse, route wiring, and tests.
- Verifier: run targeted `tsx` tests with the local binary plus `npm run build`.
- Reviewer: confirm that real workflow ownership still stays literal `super_admin` where intended.

## Implementation Plan

- [x] Add workflow tracking and targeted regression tests.
- [x] Implement shared full-access portal helper and permission parity for `head_nurse`.
- [x] Extract reusable onsite gate logic from the TV-only flow.
- [x] Protect `/admin`, `/tv-management`, and existing TV display routes with the onsite gate.
- [x] Update hardcoded `super_admin` UI/runtime permission branches that are only portal-level shortcuts.
- [x] Run targeted verification and record evidence.

## Verification Plan

- `cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\roleAccess.test.ts test\unit\permissionMatrix.test.ts test\unit\navigation.test.ts test\unit\onsiteAccess.test.ts`
- `cmd /c npm.cmd run build`

## Verification Evidence

- `cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\roleAccess.test.ts test\unit\permissionMatrix.test.ts test\unit\navigation.test.ts test\unit\onsiteAccess.test.ts`: passed with `18` tests and `0` failures.
- `cmd /c npm.cmd run build`: passed; emitted `dist/assets/index-DIfePsHY.js` and `dist/assets/index-Bo6voCTa.css`. The existing large-chunk warning remains.

## Review Notes

- Findings:
  - none
- Residual risks:
  - Browser smoke is still needed to confirm the shared onsite gate feels correct on `/admin`, `/tv-management`, and TV display routes with real geolocation/browser permission states.
  - Persisted workflow steps that intentionally target literal `super_admin` remain unchanged by design; any future request to broaden escalation ownership would need a separate review.

## Closeout

- Final status: verified
- Follow-up tasks:
  - browser smoke for onsite gating on `/admin`, `/tv-management`, and TV display routes
  - deploy the updated portal bundle when the user wants this change live
