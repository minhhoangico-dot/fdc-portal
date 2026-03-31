# TV Management Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated `/tv-management` portal route and navigation item for TV screen management while preserving the existing admin tab entry.

**Architecture:** Keep the underlying TV CRUD logic where it already lives (`TvScreensTab` + `useTvScreens`). Introduce a new module key and route only for navigation/authorization purposes, then mount a thin page wrapper that reuses the existing tab component. Preserve the legacy admin tab so current deep links and operator habits still work.

**Tech Stack:** React 19, React Router, TypeScript, node:test via `tsx`

---

### Task 1: Capture workflow + RED test for navigation visibility

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-25-tv-management-route.md`
- Create: `C:\Users\Minh\Desktop\ERP_v1\test\unit\navigation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('super_admin sees tv management in nav', () => {
  const items = getVisibleNavItems('super_admin');
  assert.equal(items.some((item) => item.path === '/tv-management'), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cmd /c npx tsx --test test\unit\navigation.test.ts`
Expected: FAIL because `tv_management` is not in the current module key/nav map.

### Task 2: Add the module key and route

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\types\roleCatalog.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\lib\navigation.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\App.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\app\tv-management\page.tsx`

- [ ] **Step 1: Add the new module key**

Extend `ModuleKey` with `tv_management`.

- [ ] **Step 2: Wire permission visibility + nav item**

Add `tv_management: ['super_admin']` to `ROLE_MODULE_VISIBILITY` and add a nav item pointing at `/tv-management`.

- [ ] **Step 3: Add the dedicated route**

Mount `/tv-management` inside the authenticated shell behind `RequireAuth moduleKey="tv_management"`.

- [ ] **Step 4: Reuse the existing TV admin tab in a thin page**

Create a page component that renders `TvScreensTab` directly.

- [ ] **Step 5: Run the RED test again to verify GREEN**

Run: `cmd /c npx tsx --test test\unit\navigation.test.ts`
Expected: PASS

### Task 3: Verify portal compilation and update task record

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-25-tv-management-route.md`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md`

- [ ] **Step 1: Run build verification**

Run: `cmd /c npm run build`
Expected: PASS

- [ ] **Step 2: Record verification**

Write the test/build results into the task spec and checklist.
