# Weekly Report TV Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move weekly report management under TV management, add a dedicated settings action for the weekly report TV row, and turn legacy weekly report/admin routes into redirects.

**Architecture:** Keep bridge APIs and weekly-report data hooks intact. Move the management entry point to a new `tv_management` sub-route, preserve TV/detail access under `weekly_report`, and use `fdc_tv_screens.settings.featureKey` as the stable way to identify the weekly report TV screen. Add a small compatibility layer for legacy `/weekly-report/tv` rows until SQL backfill is applied.

**Tech Stack:** React 19, React Router, TypeScript, Supabase client, node:test via `tsx`

---

### Task 1: Capture workflow state and RED tests for the new routing rules

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md`
- Create: `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-25-weekly-report-tv-management.md`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\test\unit\navigation.test.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\test\unit\tvScreenLinks.test.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\test\unit\weeklyReportLinks.test.ts`

- [ ] **Step 1: Write the failing navigation assertions**

```ts
test('weekly report is removed from the visible nav', () => {
  const items = getVisibleNavItems('super_admin');
  assert.equal(items.some((item) => item.path === '/weekly-report'), false);
});
```

- [ ] **Step 2: Write the failing TV row helper assertions**

```ts
test('weekly report screens expose a management settings link', () => {
  assert.equal(getTvScreenSettingsHref(screen), '/tv-management/weekly-report');
});
```

- [ ] **Step 3: Write the failing weekly report URL helper assertions**

```ts
test('tv/details URLs use the tv-management namespace', () => {
  assert.match(buildWeeklyReportTvUrl(date), /^\/tv-management\/weekly-report\/tv\?/);
});
```

- [ ] **Step 4: Run the targeted tests to verify RED**

Run: `cmd /c npx tsx --test test\unit\navigation.test.ts test\unit\tvScreenLinks.test.ts test\unit\weeklyReportLinks.test.ts`
Expected: FAIL because nav, TV helper, and URL helper behavior still point at the legacy weekly report flow.

### Task 2: Implement helper-level behavior for the new flow

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\lib\navigation.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\lib\tv-screen-links.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\lib\weekly-report.ts`

- [ ] **Step 1: Remove the weekly report nav item but keep module visibility for guards**
- [ ] **Step 2: Add TV screen feature helpers for `settings.featureKey` plus the legacy weekly-report URL fallback**
- [ ] **Step 3: Move weekly report URL builders to `/tv-management/weekly-report/*`**
- [ ] **Step 4: Add a helper for detail back-target selection**
- [ ] **Step 5: Re-run the targeted tests and confirm GREEN**

Run: `cmd /c npx tsx --test test\unit\navigation.test.ts test\unit\tvScreenLinks.test.ts test\unit\weeklyReportLinks.test.ts`
Expected: PASS

### Task 3: Implement the unified TV-management weekly report experience

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\App.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\app\tv-management\weekly-report\page.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\app\tv-management\weekly-report\tv\page.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\app\tv-management\weekly-report\details\page.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\components\weekly-report\WeeklyReportManagementWorkspace.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\components\weekly-report\WeeklyReportTvScreen.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\components\weekly-report\WeeklyReportDetailsScreen.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\weekly-report\page.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\weekly-report\tv\page.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\weekly-report\details\page.tsx`

- [ ] **Step 1: Add the new management, TV, and detail routes**
- [ ] **Step 2: Extract reusable screen components for TV and detail pages**
- [ ] **Step 3: Create the unified management workspace that combines launcher + settings**
- [ ] **Step 4: Turn legacy weekly report routes into redirects that preserve query params**
- [ ] **Step 5: Update weekly report custom-report drilldown to return to the new management page**

### Task 4: Remove the old admin entry and wire the TV row action

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\admin\page.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useAdmin.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\admin\TvScreensTab.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useTvScreens.ts`

- [ ] **Step 1: Remove the `weekly_report` admin tab from the visible admin UI**
- [ ] **Step 2: Redirect `admin?tab=weekly_report` to `/tv-management/weekly-report`**
- [ ] **Step 3: Preserve `settings` through TV row edit/save**
- [ ] **Step 4: Add the row-level `Cài đặt báo cáo giao ban` action for weekly report screens**
- [ ] **Step 5: Update internal-route placeholder copy to the new TV path**

### Task 5: Backfill the weekly report TV row and verify end-to-end

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\sql\20260325_weekly_report_tv_management.sql`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-25-weekly-report-tv-management.md`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md`

- [ ] **Step 1: Add idempotent SQL to set `settings.featureKey` and move the TV route to the new namespace**
- [ ] **Step 2: Run targeted unit verification**

Run: `cmd /c npx tsx --test test\unit\navigation.test.ts test\unit\tvScreenLinks.test.ts test\unit\weeklyReportLinks.test.ts`
Expected: PASS

- [ ] **Step 3: Run portal build verification**

Run: `cmd /c npm run build`
Expected: PASS

- [ ] **Step 4: Record verification evidence and residual risks in the workflow files**
