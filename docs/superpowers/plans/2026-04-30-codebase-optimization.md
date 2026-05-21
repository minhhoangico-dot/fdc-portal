# Codebase Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce frontend load cost, restore reliable verification, and make the largest portal and bridge modules easier to change without altering clinic-facing behavior.

**Architecture:** Start with verification because optimization work is unsafe while the baseline checks are red. Then split the portal by route and vendor chunk, move optional export code out of the startup path, and refactor large UI/viewmodel/bridge files behind existing public interfaces. Query and schema changes are evidence-gated: measure first, change only when the current SQL or Supabase payload shape proves wasteful.

**Tech Stack:** React 19, Vite 6, TypeScript 5, Supabase, Recharts, XLSX, Node.js bridge, Jest/ts-jest, node:test/tsx.

---

## Baseline Observed On 2026-04-30

- `cmd /c npm.cmd run build` at the portal root passes, but emits a large chunk warning:
  - `assets/index-DIfePsHY.js`: 1,454.65 kB minified, 389.26 kB gzip.
  - `assets/xlsx-CkFp8p6R.js`: 429.53 kB minified, 143.08 kB gzip.
  - CSS: 102.34 kB minified, 17.93 kB gzip.
  - PWA precache: 18 entries, 1,977.43 KiB.
- `cmd /c npm.cmd run build` in `fdc-lan-bridge` passes.
- `cmd /c npm.cmd run lint` at the portal root currently fails because the root TypeScript project compiles bridge Jest tests and the `to be intergrate` Next prototype.
- `cmd /c npm.cmd test -- --runInBand` in `fdc-lan-bridge` currently fails in `test/unit/labDashboardSourceProvenance.test.ts` because several TAT fixtures are missing the now-required `testName` property.
- The git worktree is already dirty with prior portal, bridge, task, and test changes. Do not revert unrelated changes.

## Success Criteria

- Portal build main startup chunk is below 950 kB minified after route splitting, and no single non-export route chunk exceeds 500 kB without a documented reason.
- XLSX remains dynamically loaded and is not required for first paint.
- PWA precache stays below 1.4 MiB unless an explicit offline requirement overrides it.
- `cmd /c npm.cmd run lint` at the portal root passes for the portal-owned TypeScript surface.
- `cmd /c npm.cmd run build` passes in both portal and bridge.
- `cmd /c npm.cmd test -- --runInBand` passes in `fdc-lan-bridge`.
- Existing root targeted unit tests for affected portal helpers pass.
- Large files are reduced by extraction where it lowers risk:
  - `src/App.tsx` owns route wiring, not all page loading.
  - `src/app/pharmacy/page.tsx` and `src/app/inventory/OverviewTab.tsx` delegate repeated UI sections to local components.
  - `src/viewmodels/useApprovals.ts` and `src/viewmodels/useAdmin.ts` move non-hook business actions into testable helpers.
  - `fdc-lan-bridge/src/labDashboard/service.ts` remains a facade over smaller loaders.

---

### Task 1: Restore Verification Baseline

**Files:**
- Modify: `tsconfig.json`
- Modify: `fdc-lan-bridge/test/unit/labDashboardSourceProvenance.test.ts`
- Modify: `package.json` only if a separate portal typecheck script is needed
- Update: `tasks/active/2026-04-30-codebase-optimization.md`
- Update: `tasks/todo.md`

- [ ] **Step 1: Create the repo workflow task spec**

Create `tasks/active/2026-04-30-codebase-optimization.md` from `tasks/templates/task-spec.template.md`.

Record:
- Problem: optimization work is blocked by noisy verification and an oversized portal bundle.
- Desired outcome: reliable checks plus measurable bundle/module improvements.
- Out of scope: product behavior changes, visual redesigns, and live database indexes without evidence.

- [ ] **Step 2: Update the shared task board**

Update `tasks/todo.md` current task to `codebase-optimization` and add checklist items for each task in this plan.

- [ ] **Step 3: Re-run the known failing checks**

Run:

```powershell
cmd /c npm.cmd run lint
cmd /c npm.cmd test -- --runInBand
```

Expected before fixes:
- Root lint fails on bridge Jest globals and `to be intergrate/**` missing Next/prototype dependencies.
- Bridge tests fail in `fdc-lan-bridge/test/unit/labDashboardSourceProvenance.test.ts` with missing `testName`.

- [ ] **Step 4: Narrow the portal TypeScript project**

Preserve existing `compilerOptions` in `tsconfig.json`, then add explicit project boundaries:

```json
{
  "include": ["src", "test", "vite.config.ts"],
  "exclude": [
    "dist",
    "node_modules",
    "fdc-lan-bridge",
    "to be intergrate",
    ".worktrees",
    ".wrangler"
  ]
}
```

If TypeScript complains about root tests that are intentionally executed through `tsx --test`, keep `test` in the project only if it compiles cleanly; otherwise create `tsconfig.portal.json` for `src` and point `npm run lint` at it.

- [ ] **Step 5: Fix the bridge TAT provenance fixtures**

In each TAT fixture object missing `testName` in `fdc-lan-bridge/test/unit/labDashboardSourceProvenance.test.ts`, add explicit names:

```ts
testName: 'CBC',
```

Use distinct names only if the assertions depend on them.

- [ ] **Step 6: Verify the baseline is green**

Run:

```powershell
cmd /c npm.cmd run lint
cmd /c npm.cmd run build
cmd /c npm.cmd run build
cmd /c npm.cmd test -- --runInBand
```

Run the first two commands at the repo root. Run the last two from `fdc-lan-bridge` for bridge build/test.

Expected:
- Portal lint passes for the portal project.
- Portal build still passes, possibly with the existing large chunk warning.
- Bridge build passes.
- Bridge tests pass.

- [ ] **Step 7: Commit**

```powershell
git add tsconfig.json package.json tasks/active/2026-04-30-codebase-optimization.md tasks/todo.md fdc-lan-bridge/test/unit/labDashboardSourceProvenance.test.ts
git commit -m "chore: restore optimization verification baseline"
```

---

### Task 2: Add Bundle Budget Checks

**Files:**
- Create: `scripts/check-portal-bundle-budget.mjs`
- Create: `scripts/check-pwa-precache-budget.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing bundle budget script**

Create `scripts/check-portal-bundle-budget.mjs`:

```js
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const assetsDir = join(process.cwd(), 'dist', 'assets');
const maxMainBytes = 950 * 1024;
const maxRouteBytes = 500 * 1024;

const jsFiles = readdirSync(assetsDir).filter((file) => file.endsWith('.js'));
const main = jsFiles.find((file) => /^index-[\w-]+\.js$/.test(file));

if (!main) {
  throw new Error('Could not find portal main index chunk in dist/assets.');
}

const failures = [];
const mainBytes = statSync(join(assetsDir, main)).size;

if (mainBytes > maxMainBytes) {
  failures.push(`${main} is ${mainBytes} bytes; budget is ${maxMainBytes} bytes.`);
}

for (const file of jsFiles) {
  if (file === main || file.startsWith('xlsx-')) continue;
  const size = statSync(join(assetsDir, file)).size;
  if (size > maxRouteBytes) {
    failures.push(`${file} is ${size} bytes; route/vendor budget is ${maxRouteBytes} bytes.`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`PASS: ${main} is ${mainBytes} bytes and route chunks are within budget.`);
```

- [ ] **Step 2: Write the failing PWA precache budget script**

Create `scripts/check-pwa-precache-budget.mjs`:

```js
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const sw = readFileSync(join(process.cwd(), 'dist', 'sw.js'), 'utf8');
const maxPrecacheBytes = 1400 * 1024;
const urls = [...sw.matchAll(/"url":"([^"]+)","revision":"([^"]+)"/g)].map((match) => match[1]);

if (urls.some((url) => /assets\/xlsx-[\w-]+\.js$/.test(url))) {
  throw new Error('XLSX export chunk is precached; keep it runtime-loaded only.');
}

const byteMatches = [...sw.matchAll(/"size":(\d+)/g)].map((match) => Number(match[1]));
const total = byteMatches.reduce((sum, value) => sum + value, 0);

if (byteMatches.length > 0 && total > maxPrecacheBytes) {
  throw new Error(`PWA precache is ${total} bytes; budget is ${maxPrecacheBytes} bytes.`);
}

console.log(`PASS: ${urls.length} precache URLs and no XLSX export chunk.`);
```

If the generated service worker does not expose sizes, keep the XLSX exclusion assertion and record the VitePWA-reported precache size from `npm run build`.

- [ ] **Step 3: Add scripts**

Modify `package.json`:

```json
{
  "scripts": {
    "check:bundle": "node scripts/check-portal-bundle-budget.mjs",
    "check:pwa": "node scripts/check-pwa-precache-budget.mjs"
  }
}
```

- [ ] **Step 4: Run the scripts against the current build**

Run:

```powershell
cmd /c npm.cmd run build
cmd /c npm.cmd run check:bundle
cmd /c npm.cmd run check:pwa
```

Expected:
- `check:bundle` fails before route splitting because the current main chunk is about 1.45 MB.
- `check:pwa` may fail because the current precache includes the dynamically loaded XLSX chunk.

- [ ] **Step 5: Commit**

```powershell
git add package.json scripts/check-portal-bundle-budget.mjs scripts/check-pwa-precache-budget.mjs
git commit -m "test: add portal bundle budgets"
```

---

### Task 3: Split Portal Routes And Vendor Chunks

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/layout/RouteFallback.tsx`
- Modify: `vite.config.ts`

- [ ] **Step 1: Add a route fallback component**

Create `src/components/layout/RouteFallback.tsx`:

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function RouteFallback() {
  return (
    <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">
      Loading...
    </div>
  );
}
```

If project styling already has a shared loading indicator, use that instead and keep this component minimal.

- [ ] **Step 2: Convert page imports to lazy imports**

In `src/App.tsx`, keep only synchronous imports for providers, route guards, layout, and React Router. Convert page imports to `React.lazy`:

```tsx
const AdminPage = React.lazy(() => import('@/app/admin/page'));
const ApprovalsPage = React.lazy(() => import('@/app/approvals/page'));
const DashboardPage = React.lazy(() => import('@/app/dashboard/page'));
const InventoryPage = React.lazy(() => import('@/app/inventory/page'));
const LabDashboardPage = React.lazy(() => import('@/app/lab-dashboard/page'));
const LabDashboardTvPage = React.lazy(() => import('@/app/lab-dashboard/tv/page'));
const LoginPage = React.lazy(() => import('@/app/login/page'));
const OrgChartPage = React.lazy(() => import('@/app/org-chart/page'));
const PharmacyPage = React.lazy(() => import('@/app/pharmacy/page'));
const PortalPage = React.lazy(() => import('@/app/portal/page'));
const RoomManagementPage = React.lazy(() => import('@/app/room-management/page'));
const RequestsPage = React.lazy(() => import('@/app/requests/page'));
const TvManagementPage = React.lazy(() => import('@/app/tv-management/page'));
const ValuationPage = React.lazy(() => import('@/app/valuation/page'));
```

Include every current page import from `src/App.tsx`, including dynamic route pages under `[id]` and `[slug]`.

- [ ] **Step 3: Wrap routes in Suspense**

Wrap the `<Routes>` tree with:

```tsx
<React.Suspense fallback={<RouteFallback />}>
  <Routes>
    ...
  </Routes>
</React.Suspense>
```

Keep `AuthProvider`, `RoleCatalogProvider`, and `BrowserRouter` outside the suspense boundary.

- [ ] **Step 4: Add manual vendor chunks**

In `vite.config.ts`, add `build.rollupOptions.output.manualChunks`:

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        react: ['react', 'react-dom', 'react-router-dom'],
        supabase: ['@supabase/supabase-js'],
        charts: ['recharts'],
        icons: ['lucide-react'],
      },
    },
  },
},
```

If this makes route chunks worse, replace the object with a function that keeps route code separate and groups only stable third-party dependencies.

- [ ] **Step 5: Verify bundle budget**

Run:

```powershell
cmd /c npm.cmd run build
cmd /c npm.cmd run check:bundle
```

Expected:
- Portal build passes.
- Main chunk is below 950 kB.
- No route/vendor chunk over 500 kB except `xlsx`, which remains explicitly dynamic.

- [ ] **Step 6: Commit**

```powershell
git add src/App.tsx src/components/layout/RouteFallback.tsx vite.config.ts
git commit -m "perf: split portal route bundles"
```

---

### Task 4: Keep Optional Export Code Out Of PWA Precache

**Files:**
- Modify: `vite.config.ts`
- Verify: `src/components/lab-dashboard/LabDashboardDetailScreen.tsx`
- Verify: `src/lib/labDashboardDetailExport.ts`

- [ ] **Step 1: Confirm XLSX is dynamically imported**

Inspect:

```powershell
Select-String -Path src\components\lab-dashboard\LabDashboardDetailScreen.tsx,src\lib\labDashboardDetailExport.ts -Pattern "import\('xlsx'\)"
```

Expected:
- XLSX is imported only through `await import('xlsx')`.
- No static `import ... from 'xlsx'` remains in source.

- [ ] **Step 2: Exclude optional XLSX chunks from Workbox precache**

In `vite.config.ts`, inside `VitePWA({ workbox: { ... } })`, add:

```ts
globIgnores: ['**/xlsx-*.js'],
maximumFileSizeToCacheInBytes: 1024 * 1024,
```

Do not exclude route chunks required for normal app navigation unless product explicitly accepts online-only route loading.

- [ ] **Step 3: Verify PWA budget**

Run:

```powershell
cmd /c npm.cmd run build
cmd /c npm.cmd run check:pwa
```

Expected:
- Build passes.
- The generated service worker does not precache `assets/xlsx-*.js`.
- VitePWA-reported precache size is below 1.4 MiB.

- [ ] **Step 4: Commit**

```powershell
git add vite.config.ts
git commit -m "perf: keep export chunk out of pwa precache"
```

---

### Task 5: Extract Pharmacy And Inventory Presentation Components

**Files:**
- Modify: `src/app/pharmacy/page.tsx`
- Create: `src/app/pharmacy/PharmacyFilters.tsx`
- Create: `src/app/pharmacy/PharmacyKpiGrid.tsx`
- Create: `src/app/pharmacy/PharmacyInventoryTable.tsx`
- Create: `src/app/pharmacy/PharmacyCharts.tsx`
- Modify: `src/app/inventory/OverviewTab.tsx`
- Create: `src/app/inventory/overview/InventoryKpiGrid.tsx`
- Create: `src/app/inventory/overview/InventoryCharts.tsx`
- Create: `src/app/inventory/overview/InventoryAlertsPanel.tsx`
- Test: existing `test/unit/pharmacyInventoryPresentation.test.ts`
- Test: existing `test/unit/inventoryDashboardSummary.test.ts`

- [ ] **Step 1: Write component boundary notes in the task spec**

In `tasks/active/2026-04-30-codebase-optimization.md`, record that this task is a behavior-preserving extraction. No Supabase queries or business rules should move into page components.

- [ ] **Step 2: Extract pharmacy filters**

Move filter controls and filter prop wiring from `src/app/pharmacy/page.tsx` into `src/app/pharmacy/PharmacyFilters.tsx`.

Expected component shape:

```tsx
export interface PharmacyFiltersProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

export function PharmacyFilters(props: PharmacyFiltersProps) {
  // Render the same controls currently owned by PharmacyPage.
}
```

- [ ] **Step 3: Extract pharmacy KPI and table sections**

Move KPI cards into `PharmacyKpiGrid.tsx` and inventory rows/table rendering into `PharmacyInventoryTable.tsx`.

Keep derived data in the existing viewmodel or existing helper files such as `src/lib/pharmacyInventoryPresentation.ts`.

- [ ] **Step 4: Extract pharmacy charts**

Move Recharts-dependent chart markup into `PharmacyCharts.tsx`. This keeps chart imports out of the top of the page file and makes later chart-level lazy loading possible.

- [ ] **Step 5: Verify pharmacy behavior**

Run:

```powershell
cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\pharmacyInventoryPresentation.test.ts
cmd /c npm.cmd run build
```

Expected:
- Tests pass.
- Build passes.
- `src/app/pharmacy/page.tsx` drops below 500 lines.

- [ ] **Step 6: Extract inventory overview sections**

Split `src/app/inventory/OverviewTab.tsx` into:
- `InventoryKpiGrid.tsx` for KPI cards.
- `InventoryCharts.tsx` for Recharts markup.
- `InventoryAlertsPanel.tsx` for anomaly/alert panels.

Keep data shaping in `src/viewmodels/useInventoryDashboardSummary.ts` and `src/lib/inventory-dashboard-summary.ts`.

- [ ] **Step 7: Verify inventory behavior**

Run:

```powershell
cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\inventoryDashboardSummary.test.ts
cmd /c npm.cmd run build
```

Expected:
- Tests pass.
- Build passes.
- `src/app/inventory/OverviewTab.tsx` drops below 550 lines.

- [ ] **Step 8: Commit**

```powershell
git add src/app/pharmacy src/app/inventory test/unit/pharmacyInventoryPresentation.test.ts test/unit/inventoryDashboardSummary.test.ts
git commit -m "refactor: split inventory presentation components"
```

---

### Task 6: Extract Approval And Admin Business Helpers

**Files:**
- Modify: `src/viewmodels/useApprovals.ts`
- Create: `src/lib/approval-actions.ts`
- Create: `test/unit/approvalActions.test.ts`
- Modify: `src/viewmodels/useAdmin.ts`
- Create: `src/lib/admin-approval-template-draft.ts`
- Test: existing `test/unit/approvalConfigState.test.ts`

- [ ] **Step 1: Add failing approval action tests**

Create `test/unit/approvalActions.test.ts` around pure payload builders, not live Supabase calls.

Cover:
- Material consolidation groups rows by request/material identity.
- Batch approval rejects empty selections.
- Forwarding chooses the selected reviewer and preserves request context.

Expected pre-implementation failure:
- `src/lib/approval-actions.ts` does not exist.

- [ ] **Step 2: Move pure approval helpers**

Create `src/lib/approval-actions.ts` with pure functions used by `useApprovals.ts`:

```ts
export function assertNonEmptySelection(ids: string[]): string[] {
  if (ids.length === 0) {
    throw new Error('No approval requests selected.');
  }

  return ids;
}
```

Move only deterministic grouping and payload-building logic first. Leave Supabase mutation sequencing in the viewmodel until tests cover the helper boundary.

- [ ] **Step 3: Rewire useApprovals**

Import helper functions with `@/` aliases from `src/viewmodels/useApprovals.ts`.

The hook should still own:
- React state.
- Supabase calls.
- Realtime subscription setup until Task 7.

- [ ] **Step 4: Extract admin approval-template draft helpers**

If `src/lib/approval-config.ts` already owns the draft behavior, do not duplicate it. Otherwise create `src/lib/admin-approval-template-draft.ts` for immutable update helpers used by `src/viewmodels/useAdmin.ts`.

- [ ] **Step 5: Verify approval/admin behavior**

Run:

```powershell
cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\approvalActions.test.ts test\unit\approvalConfigState.test.ts
cmd /c npm.cmd run build
```

Expected:
- Tests pass.
- Build passes.
- `src/viewmodels/useApprovals.ts` and `src/viewmodels/useAdmin.ts` both lose non-hook helper code without changing exported hook names.

- [ ] **Step 6: Commit**

```powershell
git add src/viewmodels/useApprovals.ts src/viewmodels/useAdmin.ts src/lib/approval-actions.ts src/lib/admin-approval-template-draft.ts test/unit/approvalActions.test.ts
git commit -m "refactor: extract approval and admin helpers"
```

---

### Task 7: Consolidate Supabase Realtime Subscriptions

**Files:**
- Create: `src/lib/supabase-realtime.ts`
- Create: `test/unit/supabaseRealtime.test.ts`
- Modify: `src/viewmodels/useApprovals.ts`
- Modify: `src/viewmodels/useRequests.ts`
- Modify: `src/viewmodels/useImportExport.ts`
- Modify: `src/viewmodels/useInventoryDashboardSummary.ts`
- Modify: `src/viewmodels/usePharmacyInventory.ts`
- Modify: `src/viewmodels/useSupplyInventory.ts`
- Modify: `src/viewmodels/useSupplyChart.ts`
- Modify: `src/viewmodels/useNotifications.ts`

- [ ] **Step 1: Write failing realtime helper tests**

Create `test/unit/supabaseRealtime.test.ts` with a fake Supabase client/channel.

Assert:
- Each table subscription calls `.on('postgres_changes', config, callback)`.
- The helper calls `.subscribe()`.
- The returned cleanup calls `supabase.removeChannel(channel)`.

- [ ] **Step 2: Implement the helper**

Create `src/lib/supabase-realtime.ts`:

```ts
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface PostgresChangeSubscription {
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  schema?: string;
  table: string;
  filter?: string;
}

export function subscribeToPostgresChanges(
  supabase: Pick<SupabaseClient, 'channel' | 'removeChannel'>,
  channelName: string,
  subscriptions: PostgresChangeSubscription[],
  onChange: () => void,
): () => void {
  const channel = supabase.channel(channelName);

  for (const subscription of subscriptions) {
    channel.on(
      'postgres_changes',
      {
        event: subscription.event ?? '*',
        schema: subscription.schema ?? 'public',
        table: subscription.table,
        ...(subscription.filter ? { filter: subscription.filter } : {}),
      },
      onChange,
    );
  }

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
```

Adjust the type if the Supabase client generic makes this too strict; do not use `any` outside the helper.

- [ ] **Step 3: Migrate hooks in small groups**

Group 1:
- `src/viewmodels/useRequests.ts`
- `src/viewmodels/useNotifications.ts`

Group 2:
- `src/viewmodels/useInventoryDashboardSummary.ts`
- `src/viewmodels/useSupplyChart.ts`
- `src/viewmodels/useImportExport.ts`

Group 3:
- `src/viewmodels/useApprovals.ts`
- `src/viewmodels/usePharmacyInventory.ts`
- `src/viewmodels/useSupplyInventory.ts`

Run tests/build after each group.

- [ ] **Step 4: Verify realtime helper**

Run:

```powershell
cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\supabaseRealtime.test.ts
cmd /c npm.cmd run build
```

Expected:
- Tests pass.
- Build passes.
- Existing subscription behavior remains table-equivalent.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/supabase-realtime.ts src/viewmodels test/unit/supabaseRealtime.test.ts
git commit -m "refactor: share supabase realtime setup"
```

---

### Task 8: Split Lab Dashboard Bridge Loaders

**Files:**
- Modify: `fdc-lan-bridge/src/labDashboard/service.ts`
- Create: `fdc-lan-bridge/src/labDashboard/loaders/queue.ts`
- Create: `fdc-lan-bridge/src/labDashboard/loaders/tat.ts`
- Create: `fdc-lan-bridge/src/labDashboard/loaders/abnormal.ts`
- Create: `fdc-lan-bridge/src/labDashboard/loaders/reagents.ts`
- Create: `fdc-lan-bridge/src/labDashboard/loaders/shared.ts`
- Modify only if needed: `fdc-lan-bridge/src/labDashboard/detailHelpers.ts`
- Test: existing `fdc-lan-bridge/test/unit/labDashboardService.test.ts`
- Test: existing `fdc-lan-bridge/test/unit/labDashboardDetails.test.ts`
- Test: existing `fdc-lan-bridge/test/integration/server.test.ts`

- [ ] **Step 1: Freeze current bridge behavior with targeted tests**

Run:

```powershell
cmd /c npx.cmd jest test/unit/labDashboardService.test.ts test/unit/labDashboardDetails.test.ts test/integration/server.test.ts --runInBand
```

Expected:
- All pass after Task 1.

- [ ] **Step 2: Move queue loader code**

Move queue-specific SQL, row mapping, and detail loading from `service.ts` into `loaders/queue.ts`.

Export only the functions consumed by the facade:

```ts
export async function loadQueueSummary(input: LabDashboardLoaderInput): Promise<QueueSummary> {
  // Existing behavior moved from service.ts.
}

export async function loadQueueDetail(input: LabDashboardDetailLoaderInput): Promise<LabDashboardDetailPayload> {
  // Existing behavior moved from service.ts.
}
```

- [ ] **Step 3: Move TAT, abnormal, and reagent loaders one at a time**

After each loader move, run:

```powershell
cmd /c npx.cmd jest test/unit/labDashboardService.test.ts --runInBand
cmd /c npm.cmd run build
```

Expected:
- No behavior changes.
- `service.ts` remains the public facade for `getLabDashboardCurrent()` and `getLabDashboardDetails()`.

- [ ] **Step 4: Extract shared loader types**

Put shared date/window/database input types in `loaders/shared.ts`.

Do not move externally consumed API types out of `fdc-lan-bridge/src/labDashboard/types.ts`.

- [ ] **Step 5: Verify full bridge dashboard surface**

Run:

```powershell
cmd /c npx.cmd jest test/unit/labDashboardService.test.ts test/unit/labDashboardDetails.test.ts test/unit/labDashboardSourceProvenance.test.ts test/integration/server.test.ts --runInBand
cmd /c npm.cmd run build
```

Expected:
- Tests pass.
- Build passes.
- `fdc-lan-bridge/src/labDashboard/service.ts` drops below 450 lines.

- [ ] **Step 6: Commit**

```powershell
git add fdc-lan-bridge/src/labDashboard fdc-lan-bridge/test
git commit -m "refactor: split lab dashboard bridge loaders"
```

---

### Task 9: Split Weekly Report Queries And Tighten Supabase Payloads

**Files:**
- Modify: `fdc-lan-bridge/src/weeklyReport/queries.ts`
- Create: `fdc-lan-bridge/src/weeklyReport/queries/examination.ts`
- Create: `fdc-lan-bridge/src/weeklyReport/queries/laboratory.ts`
- Create: `fdc-lan-bridge/src/weeklyReport/queries/imaging.ts`
- Create: `fdc-lan-bridge/src/weeklyReport/queries/procedures.ts`
- Create: `fdc-lan-bridge/src/weeklyReport/queries/infectious.ts`
- Create: `fdc-lan-bridge/src/weeklyReport/queries/transfer.ts`
- Modify: `fdc-lan-bridge/src/weeklyReport/store.ts`
- Test: existing `fdc-lan-bridge/test/unit/weeklyReportQueries.test.ts`

- [ ] **Step 1: Freeze weekly report behavior**

Run:

```powershell
cmd /c npx.cmd jest test/unit/weeklyReportQueries.test.ts --runInBand
```

Expected:
- Passes after Task 1.

- [ ] **Step 2: Move one query family at a time**

For each query family, move the current SQL and mapping into its own file under `fdc-lan-bridge/src/weeklyReport/queries/`.

Keep `queries.ts` as a barrel/facade:

```ts
export { getExaminationStats } from './queries/examination';
export { getLaboratoryStats } from './queries/laboratory';
```

Preserve existing exported function names so callers do not change.

- [ ] **Step 3: Replace `select("*")` in weekly report store**

In `fdc-lan-bridge/src/weeklyReport/store.ts`, replace broad selects with explicit column constants:

```ts
const WEEKLY_REPORT_SNAPSHOT_COLUMNS = [
  'id',
  'week_number',
  'year',
  'start_date',
  'end_date',
  'payload',
  'generated_at',
].join(', ');
```

Use the actual column names already returned by the current store. Do not drop any field consumed by the portal.

- [ ] **Step 4: Verify weekly report behavior**

Run:

```powershell
cmd /c npx.cmd jest test/unit/weeklyReportQueries.test.ts --runInBand
cmd /c npm.cmd run build
```

Expected:
- Tests pass.
- Build passes.
- `fdc-lan-bridge/src/weeklyReport/queries.ts` becomes a small facade.

- [ ] **Step 5: Commit**

```powershell
git add fdc-lan-bridge/src/weeklyReport fdc-lan-bridge/test/unit/weeklyReportQueries.test.ts
git commit -m "refactor: split weekly report queries"
```

---

### Task 10: Evidence-Gated Query And Index Optimization

**Files:**
- Create only if evidence supports it: `sql/20260430_codebase_optimization_indexes.sql`
- Modify only if evidence supports it: high-volume portal viewmodels under `src/viewmodels/`
- Modify only if evidence supports it: high-volume bridge jobs under `fdc-lan-bridge/src/jobs/`

- [ ] **Step 1: Inventory high-volume broad selects**

Inspect broad Supabase selects:

```powershell
Get-ChildItem -Path src,fdc-lan-bridge\src -Recurse -File -Include *.ts,*.tsx |
  Select-String -Pattern 'select\("\*"\)', "select\('\*'\)"
```

Record each broad select in the task spec with:
- Table name.
- Consumer.
- Columns actually used.
- Estimated row count or live query impact if available.

- [ ] **Step 2: Tighten payloads where usage is obvious**

For obvious high-volume reads, replace `select("*")` with explicit column lists.

Example pattern:

```ts
const INVENTORY_COLUMNS = [
  'id',
  'his_medicineid',
  'name',
  'warehouse',
  'current_stock',
  'unit',
  'snapshot_date',
].join(', ');
```

Do not tighten queries that feed generic JSON/export surfaces until tests assert all required columns.

- [ ] **Step 3: Measure before adding indexes**

For slow live Supabase queries, collect `EXPLAIN` evidence through the approved project database path before creating SQL.

Do not add indexes based only on code inspection.

- [ ] **Step 4: Add indexes only when proven**

If evidence supports indexes, create `sql/20260430_codebase_optimization_indexes.sql` with additive indexes only:

```sql
-- Add only after EXPLAIN confirms this query shape is slow.
create index concurrently if not exists idx_fdc_sync_logs_started_at
on public.fdc_sync_logs (started_at desc);
```

Use exact table/index names from the measured query. Include rollback notes as SQL comments.

- [ ] **Step 5: Verify data behavior**

Run the affected targeted tests plus:

```powershell
cmd /c npm.cmd run build
cmd /c npm.cmd run build
```

Run the second command in `fdc-lan-bridge`.

Expected:
- Builds pass.
- Targeted tests prove no consumed field was removed.

- [ ] **Step 6: Commit**

```powershell
git add src fdc-lan-bridge/src sql tasks/active/2026-04-30-codebase-optimization.md
git commit -m "perf: tighten measured data paths"
```

---

### Task 11: Final Verification And Closeout

**Files:**
- Update: `tasks/active/2026-04-30-codebase-optimization.md`
- Update: `tasks/todo.md`
- Update only if a durable decision was made: `tasks/decisions.md`
- Update only after a correction or avoidable miss: `tasks/lessons.md`

- [ ] **Step 1: Run full portal verification**

Run at the repo root:

```powershell
cmd /c npm.cmd run lint
cmd /c npm.cmd run build
cmd /c npm.cmd run check:bundle
cmd /c npm.cmd run check:pwa
```

Expected:
- All pass.
- Record final main chunk, largest route/vendor chunks, CSS size, XLSX chunk size, and PWA precache size.

- [ ] **Step 2: Run affected portal unit tests**

Run:

```powershell
cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\pharmacyInventoryPresentation.test.ts test\unit\inventoryDashboardSummary.test.ts test\unit\approvalActions.test.ts test\unit\approvalConfigState.test.ts test\unit\supabaseRealtime.test.ts
```

Expected:
- All pass.

- [ ] **Step 3: Run bridge verification**

Run in `fdc-lan-bridge`:

```powershell
cmd /c npm.cmd run build
cmd /c npm.cmd test -- --runInBand
```

Expected:
- Build passes.
- All Jest suites pass.

- [ ] **Step 4: Smoke key routes in a browser**

Start the portal:

```powershell
cmd /c npm.cmd run dev
```

Smoke:
- `/login`
- `/dashboard`
- `/inventory`
- `/pharmacy`
- `/lab-dashboard/tv`
- `/weekly-report`
- `/admin`

Expected:
- Lazy routes load.
- Route fallback appears only while chunks load.
- Existing auth/onsite gates still behave as before.

- [ ] **Step 5: Record final evidence**

Update `tasks/active/2026-04-30-codebase-optimization.md` with:
- Commands run.
- Results.
- Bundle numbers before/after.
- Files intentionally split.
- Any checks blocked and why.
- Residual risks.

- [ ] **Step 6: Commit closeout**

```powershell
git add tasks/active/2026-04-30-codebase-optimization.md tasks/todo.md tasks/decisions.md tasks/lessons.md
git commit -m "docs: record codebase optimization verification"
```

---

## Implementation Notes

- Use `@/` imports in portal code.
- Keep license headers in new source files.
- Do not change business rules while extracting code.
- Do not rename exported functions used by existing route/viewmodel callers unless the same task updates every caller and test.
- Do not add live SQL indexes without measurement evidence.
- Because the current worktree is dirty, inspect `git diff -- <path>` before editing any already-modified file and avoid reverting unrelated changes.
