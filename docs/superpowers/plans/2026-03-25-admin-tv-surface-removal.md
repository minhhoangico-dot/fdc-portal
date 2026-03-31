# Admin TV Surface Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the duplicate TV management tab from `/admin` and redirect old `admin?tab=tv_screens` deep links to `/tv-management`.

**Architecture:** Centralize admin tab metadata and legacy redirect logic in a small helper module, then let `AdminPage` and tests share that behavior. Keep `/tv-management` as the only TV management surface and delete the obsolete `tv_screens` admin tab state.

**Tech Stack:** React, React Router, TypeScript, Node test runner, tsx

---

### Task 1: Add regression coverage for admin TV surface behavior

**Files:**
- Create: `test/unit/adminNavigation.test.ts`
- Create: `src/app/admin/admin-navigation.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('legacy tv_screens admin tab redirects to /tv-management', () => {
  assert.equal(getAdminLegacyTabRedirect('tv_screens'), '/tv-management');
});

test('admin tabs no longer include tv_screens', () => {
  assert.equal(ADMIN_TABS.some((tab) => tab.id === 'tv_screens'), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cmd /c npx tsx --test test\unit\adminNavigation.test.ts`
Expected: FAIL because `src/app/admin/admin-navigation.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/app/admin/admin-navigation.ts` exporting the admin tab list and a `getAdminLegacyTabRedirect()` helper that redirects `weekly_report` and `tv_screens`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cmd /c npx tsx --test test\unit\adminNavigation.test.ts`
Expected: PASS.

### Task 2: Remove the TV tab from Admin

**Files:**
- Modify: `src/app/admin/page.tsx`
- Modify: `src/viewmodels/useAdmin.ts`

- [ ] **Step 1: Update `AdminPage` to use the shared helper**

Remove the inline TV tab entry and route `tv_screens` deep links to `/tv-management`.

- [ ] **Step 2: Remove obsolete admin tab state**

Drop `tv_screens` from `AdminTab` in `useAdmin.ts`.

- [ ] **Step 3: Run targeted tests**

Run: `cmd /c npx tsx --test test\unit\adminNavigation.test.ts test\unit\navigation.test.ts`
Expected: PASS.

- [ ] **Step 4: Run build verification**

Run: `cmd /c npm run build`
Expected: PASS.
