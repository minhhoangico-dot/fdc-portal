# Task Spec: head-nurse-role-and-user

## Goal

- Problem: The portal has no `Điều dưỡng trưởng` role, and the requested account `pthue` cannot exist with non-admin full-access behavior under the current role model.
- Desired outcome: Add a `head_nurse` role with all operational permissions except admin management, support login by short username, and create the requested live account in Supabase.

## Scope

- In scope:
  - Portal role typing, module visibility, and approval access checks
  - SQL updates for role catalog and request/attachment policies
  - Live Supabase role seed and user creation for `pthue`
  - Targeted verification
- Out of scope:
  - Broader redesign of the admin user-management UX
  - Changes to unrelated bridge or dashboard work already in progress

## Constraints

- Technical constraints:
  - Existing login flow uses Supabase email/password, not a separate username field.
  - The repo is in a dirty worktree; edits must stay narrowly scoped.
  - Live DB changes need to run against self-hosted Supabase safely and idempotently.
- Product or operational constraints:
  - `Điều dưỡng trưởng` must not receive admin/config management access.
  - The requested credential should work as `pthue` from the login screen.

## Assumptions

- `pthue` should be backed by the email alias `pthue@fdc.vn`.
- The account display name can default to `pthue` because no human-readable full name was provided.

## Affected Areas

- Files or directories:
  - `src/app/login/page.tsx`
  - `src/components/layout/AppShell.tsx`
  - `src/lib/navigation.ts`
  - `src/lib/role-catalog.ts`
  - `src/lib/weekly-report.ts`
  - `src/types/user.ts`
  - `src/viewmodels/useApprovals.ts`
  - `src/viewmodels/useDashboard.ts`
  - `src/viewmodels/useRequests.ts`
  - `sql/`
  - `tasks/`
- Systems touched:
  - Portal frontend
  - Self-hosted Supabase role catalog, functions, and policies
  - Supabase Auth + `fdc_user_mapping`

## Role Split

- Planner: Scope live role/account creation and capture verification.
- Implementer: Apply targeted portal + SQL changes and create the account.
- Verifier: Run build/type-check and inspect live Supabase rows.
- Reviewer: Note residual risks around undeployed local code and existing dirty worktree.

## Implementation Plan

- [x] Add `head_nurse` to portal role definitions and non-admin full-access checks.
- [x] Add an idempotent SQL migration for role catalog and request/attachment access.
- [x] Create the live `pthue` auth user + mapping and seed the role catalog row.
- [x] Run targeted verification and record gaps.

## Verification Plan

- Command or check 1: `npm run build`
- Command or check 2: Query Supabase for `fdc_role_catalog`, `fdc_user_mapping`, and auth user state for `pthue`.

## Review Notes

- Findings: none specific to the new `head_nurse` role after targeted build, deploy, and live Supabase checks.
- Residual risks:
  - Root `npm run lint` remains noisy because the repository includes pre-existing TypeScript issues outside this task (`fdc-lan-bridge` tests, Supabase Deno functions, and `to be intergrate/` sources).
  - The created auth identity uses `pthue@fdc.vn` under the hood; username-only login depends on the newly deployed frontend build.

## Closeout

- Final status: portal code updated, live DB policies updated, live user created, and a new Cloudflare Pages deployment published.
- Follow-up tasks:
  - Confirm the user signs in through the deployed portal with `pthue / 123` and sees the expected non-admin module set.
