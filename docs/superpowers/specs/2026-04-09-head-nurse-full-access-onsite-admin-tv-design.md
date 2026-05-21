# Head Nurse Full Portal Access With Onsite Admin And TV Gating

## Goal

Give `head_nurse` the same effective portal access as `super_admin` without changing the stored role itself, while keeping:

- `super_admin` as the only role that fully bypasses onsite checks
- `/admin` and `/tv-management` restricted to onsite access for `head_nurse`
- existing TV display routes restricted to onsite access for every non-`super_admin` user

## Problem

The current portal has two separate limitations:

1. `head_nurse` still lacks many permissions that `super_admin` has in module access, dashboard actions, and hardcoded page logic.
2. onsite gating only exists for TV-facing routes, not for `/admin` or `/tv-management`.

If this is solved only in the permission matrix, the role will still be blocked by hardcoded `user.role === 'super_admin'` checks. If this is solved only by adding more route guards, `head_nurse` still will not see or use the full management surface.

## Scope

### In Scope

- Treat `head_nurse` as a full-access portal role anywhere the app currently uses `super_admin` as a portal-level override
- Expose `/admin` and `/tv-management` to `head_nurse`
- Apply onsite gating to `/admin` and `/tv-management`
- Keep existing onsite gating on:
  - `/tv/:slug`
  - `/lab-dashboard/tv`
  - `/tv-management/weekly-report/tv`
  - `/tv-management/weekly-report/details`
- Keep `super_admin` as the only role that bypasses onsite gating
- Add regression coverage for permission, navigation, and onsite gating behavior

### Out Of Scope

- Changing any stored user role from `head_nurse` to `super_admin`
- Rewriting approval step data so `approver_role = 'super_admin'` becomes `head_nurse`
- Changing bridge allowlist/site configuration values
- Redesigning the TV access policy itself beyond reusing the current onsite check

## User-Approved Constraints

- `head_nurse` should behave like `super_admin` for portal access
- `super_admin` keeps full bypass behavior
- `head_nurse` must still be onsite to open `/admin`
- `head_nurse` must still be onsite to open `/tv-management`
- TV routes remain onsite-only for non-`super_admin` users

## Current Architecture Baseline

The relevant access decisions are currently split across several layers:

- `src/lib/permissions/matrix.ts` defines action-level access
- `src/lib/permissions/access.ts` derives module access from those actions
- `src/lib/navigation.ts` exposes modules in sidebar and bottom nav
- `src/components/auth/RequireAuth.tsx` blocks routes by module key or explicit roles
- `src/components/auth/TvAccessGate.tsx` performs onsite checks, but only for TV routes
- several screens and viewmodels still use hardcoded `role === 'super_admin'` branches

This split means `head_nurse` cannot become "super-admin-like" through a single array edit. The change must unify:

- action permissions
- module visibility
- route access
- in-page overrides
- onsite gating

## Chosen Approach

Introduce a shared concept of "full portal admin access" for UI and route logic, but keep onsite gating as a separate concern.

That means:

1. `head_nurse` joins `super_admin` in a shared full-access helper used by portal authorization logic.
2. onsite checks remain an independent gate that still bypasses only for `super_admin`.
3. `/admin` and `/tv-management` get the same onsite gate behavior as TV routes.
4. workflow records that explicitly target the real `super_admin` role remain unchanged unless the code path is only using that role as a UI permission shortcut.

This preserves the real business role model while delivering the user-requested behavior.

## High-Level Design

### 1. Shared full-access helper

Create or extend a single helper that answers whether a role has full portal admin access.

This helper should be used for:

- permission shortcuts that currently hardcode `super_admin`
- dashboard/admin/TV management UI branches
- global action overrides such as universal approval handling

The helper should return `true` for:

- `super_admin`
- `head_nurse`

It should not replace the stored role value. The app still knows which users are true `super_admin` records.

### 2. Permission and navigation expansion

Update the centralized permission layer so `head_nurse` can access every module and action currently reserved for `super_admin`, including:

- `tv_management.view`
- `admin.view`
- `admin.manage`
- any module/action path where only `super_admin` currently appears as the operational override

Navigation should then derive automatically from the updated module access rules, which makes `/admin` and `/tv-management` visible to `head_nurse`.

### 3. Shared onsite gate for admin and TV surfaces

Refactor the current TV-only gate into a reusable onsite gate backed by the same bridge endpoint and geolocation flow:

- network allowlist check from bridge
- fallback geolocation check when configured
- session cache for successful onsite geolocation
- `super_admin` bypass

Apply that gate to:

- `/admin`
- `/tv-management`
- `/tv-management/weekly-report`
- existing TV-facing routes already protected today

This avoids duplicating bridge/geolocation logic and keeps the onsite rule consistent across all protected surfaces.

### 4. Preserve real workflow targets

Some paths in approvals and room workflows currently use the literal role `super_admin` as a workflow destination or escalation target. Those usages fall into two categories:

- true workflow targets that should stay as real `super_admin`
- UI/permission shortcuts that should become "full portal admin access"

Only the second category should change.

Examples that should remain unchanged in intent:

- inserted approval steps with `approver_role: 'super_admin'`
- helper queries that intentionally resolve the real `super_admin` assignee

Examples that should change:

- "can this current user act anyway because they have full admin authority?"
- "should this dashboard/admin widget be shown?"

### 5. Route behavior after the change

Expected runtime behavior:

- `super_admin`
  - can open `/admin` anywhere
  - can open `/tv-management` anywhere
  - can open TV display routes anywhere
- `head_nurse`
  - can see and use `/admin` only when onsite
  - can see and use `/tv-management` only when onsite
  - can open TV display routes only when onsite
- other roles
  - remain limited by existing module permissions
  - still need onsite access for TV display routes if they can reach them at all

## Files Likely To Change

- `src/lib/permissions/matrix.ts`
  - expand `head_nurse` access to match `super_admin` where this is portal authorization, not persisted workflow identity
- `src/lib/permissions/access.ts`
  - reuse the centralized access model without special-case drift
- `src/lib/role-access.ts`
  - define shared full-access helper(s) for portal logic
- `src/lib/navigation.ts`
  - ensure nav derives correctly once permissions change
- `src/components/auth/TvAccessGate.tsx`
  - either become a generic onsite gate or delegate to one
- `src/lib/tv-access.ts`
  - support gate reuse cleanly without TV-only naming assumptions leaking everywhere
- `src/components/auth/RequireAuth.tsx`
  - likely unchanged for module access, unless an additional wrapper is needed
- `src/App.tsx`
  - wrap `/admin` and `/tv-management` routes with the shared onsite gate
- `src/viewmodels/useApprovals.ts`
  - replace portal-level `super_admin` overrides with the shared full-access helper where appropriate
- `src/viewmodels/useDashboard.ts`
  - align quick actions and summary panels with the new helper
- `src/components/weekly-report/WeeklyReportTvScreen.tsx`
  - align settings visibility with the new helper if intended

## Verification

- Add or update unit tests for permission behavior so `head_nurse` matches `super_admin` in portal access
- Add or update navigation tests so `head_nurse` sees `/admin` and `/tv-management`
- Add focused tests for onsite gate decision logic:
  - `super_admin` bypasses
  - `head_nurse` does not bypass
  - protected admin/TV routes require onsite for non-`super_admin`
- Run the targeted unit test suite for permissions/navigation/onsite access
- Run `npm run build` after the final code change set

## Risks And Guardrails

- The biggest risk is confusing "full portal access" with "real workflow role identity". The implementation must not silently rewrite workflow ownership rules that are intentionally tied to `super_admin`.
- A second risk is widening `/admin` and `/tv-management` access in navigation but forgetting the onsite gate, which would create an offsite access regression.
- A third risk is keeping the gate TV-specific in naming or messaging, which would make `/admin` and `/tv-management` use the wrong access copy or duplicate logic.
