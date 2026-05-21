# Head Nurse Full Access With Onsite Admin And TV Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `head_nurse` behave like `super_admin` for portal authorization while keeping `super_admin` as the only role that bypasses onsite checks, and require onsite access for `head_nurse` on `/admin`, `/tv-management`, and all TV display routes.

**Architecture:** Mirror `super_admin` access through shared authorization helpers instead of copying role arrays everywhere, so module visibility, action checks, and UI overrides stay aligned. Extract the current TV-only onsite logic into a reusable onsite gate, then wrap `/admin` and `/tv-management` with that gate while preserving real workflow records that still intentionally target the literal `super_admin` role.

**Tech Stack:** React, React Router, TypeScript, node:test via `tsx --test`, Vite, existing bridge-backed TV access endpoint `/tv-access/check`

---

### Task 1: Workflow Tracking Setup

**Files:**
- Create: `tasks/active/2026-04-09-head-nurse-full-access-onsite-admin-tv.md`
- Modify: `tasks/todo.md`
- Reference: `docs/superpowers/specs/2026-04-09-head-nurse-full-access-onsite-admin-tv-design.md`

- [ ] **Step 1: Create the focused task spec in `tasks/active/`**

Write a short execution spec that captures:
- approved scope from the design doc
- in-scope files
- verification commands
- explicit warning that persisted workflow targets using `approver_role: 'super_admin'` must not be rewritten unless they are only UI permission shortcuts

- [ ] **Step 2: Update `tasks/todo.md` with the live checklist**

Add a new current-task block for this work with checklist items for:
- auth helper parity
- onsite gate extraction
- admin and TV route protection
- targeted tests
- build verification
- workflow closeout

### Task 2: Full-Access Authorization Foundation

**Files:**
- Create: `test/unit/roleAccess.test.ts`
- Modify: `src/lib/role-access.ts`
- Modify: `src/lib/permissions/access.ts`
- Modify: `test/unit/permissionMatrix.test.ts`
- Modify: `test/unit/navigation.test.ts`

- [ ] **Step 1: Write the failing helper and permission tests**

Add `test/unit/roleAccess.test.ts` with assertions like:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasFullPortalAdminAccess,
  canBypassOnsiteAccess,
} from '@/lib/role-access';

test('head_nurse has full portal admin access but no onsite bypass', () => {
  assert.equal(hasFullPortalAdminAccess('head_nurse'), true);
  assert.equal(canBypassOnsiteAccess('head_nurse'), false);
  assert.equal(canBypassOnsiteAccess('super_admin'), true);
});
```

Extend `test/unit/permissionMatrix.test.ts` and `test/unit/navigation.test.ts` with assertions like:

```ts
assert.equal(can('head_nurse', 'admin.manage'), true);
assert.equal(can('head_nurse', 'tv_management.view'), true);
assert.equal(canAccessModule('head_nurse', 'admin'), true);
assert.equal(getVisibleNavItems('head_nurse').some((item) => item.path === '/admin'), true);
assert.equal(getVisibleNavItems('head_nurse').some((item) => item.path === '/tv-management'), true);
```

- [ ] **Step 2: Run the targeted test command and confirm red**

Run:

```bash
cmd /c npx tsx --test test\\unit\\roleAccess.test.ts test\\unit\\permissionMatrix.test.ts test\\unit\\navigation.test.ts
```

Expected:
- `roleAccess.test.ts` fails because the new helpers do not exist yet
- permission/navigation assertions fail because `head_nurse` still cannot manage admin/TV surfaces

- [ ] **Step 3: Implement shared full-access helpers**

In `src/lib/role-access.ts`, add or update helpers like:

```ts
export const FULL_ACCESS_ROLES: readonly Role[] = ['super_admin', 'head_nurse'];

export function hasFullPortalAdminAccess(role: Role): boolean {
  return FULL_ACCESS_ROLES.includes(role);
}

export function canBypassOnsiteAccess(role: Role): boolean {
  return role === 'super_admin';
}
```

Keep any workflow-target helper that truly means "real super admin identity" separate from `hasFullPortalAdminAccess`.

- [ ] **Step 4: Mirror `super_admin` action grants in `src/lib/permissions/access.ts`**

Update `can(role, action)` so `head_nurse` inherits any action explicitly granted to `super_admin` without duplicating every matrix row:

```ts
export function can(role: Role, action: PermissionAction): boolean {
  const visibility = PERMISSION_MATRIX[action];
  if (visibility === 'all') return true;
  if (visibility.includes(role)) return true;
  return hasFullPortalAdminAccess(role) && visibility.includes('super_admin');
}
```

This keeps `PERMISSION_MATRIX` as the source of truth while making `head_nurse` track `super_admin` automatically.

- [ ] **Step 5: Re-run the targeted test command and confirm green**

Run:

```bash
cmd /c npx tsx --test test\\unit\\roleAccess.test.ts test\\unit\\permissionMatrix.test.ts test\\unit\\navigation.test.ts
```

Expected: all targeted tests pass, and `head_nurse` now sees admin and TV management as accessible modules.

- [ ] **Step 6: Commit the authorization foundation**

Run:

```bash
git add test/unit/roleAccess.test.ts test/unit/permissionMatrix.test.ts test/unit/navigation.test.ts src/lib/role-access.ts src/lib/permissions/access.ts
git commit -m "feat: mirror super admin portal access for head nurse"
```

### Task 3: Shared Onsite Gate Extraction

**Files:**
- Create: `src/lib/onsite-access.ts`
- Create: `src/components/auth/OnsiteAccessDenied.tsx`
- Create: `src/components/auth/OnsiteAccessGate.tsx`
- Modify: `src/components/auth/TvAccessGate.tsx`
- Modify: `src/lib/tv-access.ts`
- Create: `test/unit/onsiteAccess.test.ts`

- [ ] **Step 1: Write the failing onsite-access tests**

Add `test/unit/onsiteAccess.test.ts` with pure-function coverage for bypass and copy decisions:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canBypassOnsiteAccess,
  getOnsiteAccessCopy,
} from '@/lib/onsite-access';

test('only super_admin bypasses onsite access', () => {
  assert.equal(canBypassOnsiteAccess('super_admin'), true);
  assert.equal(canBypassOnsiteAccess('head_nurse'), false);
});

test('admin and tv management use onsite-specific deny copy', () => {
  const copy = getOnsiteAccessCopy('admin', 'outside_allowed_networks');
  assert.match(copy.title, /Khong the mo/);
  assert.match(copy.description, /onsite|Phong kham|Chi nhanh/i);
});
```

- [ ] **Step 2: Run the onsite test command and confirm red**

Run:

```bash
cmd /c npx tsx --test test\\unit\\onsiteAccess.test.ts
```

Expected: failures because `src/lib/onsite-access.ts` and the new generic helpers do not exist yet.

- [ ] **Step 3: Extract reusable onsite-access primitives**

Create `src/lib/onsite-access.ts` with:
- a typed surface key such as `'admin' | 'tv_management' | 'tv_display'`
- `canBypassOnsiteAccess(role)` re-export or shared implementation
- a `getOnsiteAccessCopy(surface, reason)` helper that returns title and description without hardcoding TV-only text for admin pages

Keep bridge/geolocation data fetches in `src/lib/tv-access.ts`, but make that file surface-neutral enough to support the generic gate.

- [ ] **Step 4: Build generic deny and gate components**

Create `src/components/auth/OnsiteAccessDenied.tsx` and `src/components/auth/OnsiteAccessGate.tsx`.

`OnsiteAccessGate` should:
- read `user` from `useAuth()`
- bypass immediately only when `canBypassOnsiteAccess(user.role)` is `true`
- reuse the existing bridge/geolocation flow from `src/lib/tv-access.ts`
- render `OnsiteAccessDenied` with surface-specific copy on deny

Then simplify `src/components/auth/TvAccessGate.tsx` to:

```tsx
export function TvAccessGate({ children }: { children: React.ReactNode }) {
  return <OnsiteAccessGate surface="tv_display">{children}</OnsiteAccessGate>;
}
```

- [ ] **Step 5: Re-run the onsite tests and confirm green**

Run:

```bash
cmd /c npx tsx --test test\\unit\\onsiteAccess.test.ts
```

Expected: the bypass and copy tests pass.

- [ ] **Step 6: Commit the onsite gate extraction**

Run:

```bash
git add test/unit/onsiteAccess.test.ts src/lib/onsite-access.ts src/lib/tv-access.ts src/components/auth/OnsiteAccessDenied.tsx src/components/auth/OnsiteAccessGate.tsx src/components/auth/TvAccessGate.tsx
git commit -m "feat: extract reusable onsite access gate"
```

### Task 4: Route And UI Wiring

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/viewmodels/useDashboard.ts`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/viewmodels/useApprovals.ts`
- Modify: `src/components/weekly-report/WeeklyReportTvScreen.tsx`

- [ ] **Step 1: Protect admin and TV management routes with the onsite gate**

In `src/App.tsx`, wrap these routes with `OnsiteAccessGate`:

```tsx
<RequireAuth moduleKey="admin">
  <OnsiteAccessGate surface="admin">
    <AdminPage />
  </OnsiteAccessGate>
</RequireAuth>
```

and:

```tsx
<RequireAuth moduleKey="tv_management">
  <OnsiteAccessGate surface="tv_management">
    <TvManagementPage />
  </OnsiteAccessGate>
</RequireAuth>
```

Also wrap `/tv-management/weekly-report` with the same gate so the full management area follows the same onsite rule.

- [ ] **Step 2: Remove literal `super_admin` page blocks where the intent is portal-level authority**

Update `src/app/admin/page.tsx`, `src/viewmodels/useDashboard.ts`, `src/app/dashboard/page.tsx`, and `src/components/weekly-report/WeeklyReportTvScreen.tsx` to use `hasFullPortalAdminAccess(user.role)` instead of hardcoded `user.role === 'super_admin'` where the behavior is:

- admin page visibility
- dashboard system widgets / quick actions
- weekly report settings shortcut

Do not touch logic that still intentionally targets the real `super_admin` role as a workflow assignee or persisted approver.

- [ ] **Step 3: Expand universal approval overrides only where they are permission shortcuts**

In `src/viewmodels/useApprovals.ts`, replace the "current viewer can act because they are super admin" branches with `hasFullPortalAdminAccess(user.role)` only for live permission checks such as:

- `canTakeAction`
- `getDelegatedActorName`
- any equivalent runtime override for viewing/acting

Do not rewrite:

```ts
approver_role: 'super_admin'
resolveRoleTarget('super_admin')
pendingStep?.approverRole === 'super_admin'
```

unless the specific line is only being used as a UI shortcut rather than a real workflow target.

- [ ] **Step 4: Run the combined targeted test suite**

Run:

```bash
cmd /c npx tsx --test test\\unit\\roleAccess.test.ts test\\unit\\permissionMatrix.test.ts test\\unit\\navigation.test.ts test\\unit\\onsiteAccess.test.ts
```

Expected: all targeted tests pass after route/UI wiring.

- [ ] **Step 5: Run the production build**

Run:

```bash
cmd /c npm run build
```

Expected: Vite production build completes successfully.

- [ ] **Step 6: Commit the wiring pass**

Run:

```bash
git add src/App.tsx src/app/admin/page.tsx src/viewmodels/useDashboard.ts src/app/dashboard/page.tsx src/viewmodels/useApprovals.ts src/components/weekly-report/WeeklyReportTvScreen.tsx
git commit -m "feat: gate head nurse admin and tv access onsite"
```

### Task 5: Verification Record And Closeout

**Files:**
- Modify: `tasks/active/2026-04-09-head-nurse-full-access-onsite-admin-tv.md`
- Modify: `tasks/todo.md`
- Optional: `tasks/lessons.md`

- [ ] **Step 1: Record the exact verification evidence**

Write down:
- the targeted `tsx --test` command
- whether it passed
- the `npm run build` command and result
- any residual risk, especially around workflow paths that still intentionally use the literal `super_admin` role

- [ ] **Step 2: Mark the workflow checklist complete**

Update `tasks/todo.md` and the active task spec so another engineer can see:
- what shipped
- what was verified
- what was deliberately left unchanged

- [ ] **Step 3: Add a lesson only if a preventable issue shows up during implementation**

If implementation reveals a new failure mode, append it to `tasks/lessons.md` with:
- context
- what went wrong
- preventive rule
- trigger to re-read
- verification to add next time
