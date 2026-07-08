# Phase 4b — Structural consolidation: FLIP · RETIRE · HOIST · router-gap TIGHTEN

- **Date**: 2026-07-08 · **Role**: Phase 4b architect (Opus 4.8)
- **Predecessors**: `tasks/active/2026-07-08-ux-redesign-user-centric.md` §4.1/§4.2 · `tasks/handoffs/2026-07-08-phase2-flow-status.md` §3 (flip recipe) · `tasks/handoffs/2026-07-08-phase3-kho-status.md` §6/§9 (valuation URL map + flip pointer)
- **THE ONE RULE inherited**: `/kho` is the KTT financial workspace; numbers are already proven unchanged (Phase 3 §3). This phase moves ROUTES and COLLAPSES CHANNELS only — it edits **no** data viewmodel logic.

## What 4b does / does not

DOES: (1) FLIP primary routes to the new workspaces; (2) RETIRE the 5 now-unrouted top-level pages; (3) HOIST the duplicated approvals+notifications realtime subscriptions into one shared context feeding both the nav badge and the inbox; (4) TIGHTEN two ungated in-shell routes + widen `RequireAuth`'s moduleKey typing.

DOES NOT: merge `usePharmacyInventory`/`useSupplyInventory` (Phase 4c, behind equivalence proof); change permission-matrix semantics; alter `head_nurse` authority; touch TV/print routes; edit any viewmodel's data logic.

Frozen (verified untouched): `src/app/attendance/**`, `src/viewmodels/attendance/**`, `src/types/attendance.ts`, `src/components/attendance/**`, `fdc-lan-bridge/**`, `sql/**`, `.worktrees/**`, all TV pages (`src/app/tv/**`, `**/tv/**`, `*TvScreen*`, `LabDashboard*Display/DetailScreen/SourcePanel`).

---

## 1. FLIP recipe (wave a — owns `src/App.tsx`)

All five source routes stay registered; only their `element` changes. `/workflow`, `/inbox`, `/kho` stay working. `/requests/create`, `/requests/:id`, `/requests/:id/print` are distinct routes with their own elements — **untouched** (React Router v6 matches exact `/requests` separately from its children, so swapping the `/requests` element does not affect them).

| Route | Before | After |
|---|---|---|
| `/requests` | `RequireAuth moduleKey="requests"` → `<RequestsPage/>` | same gate → `<WorkflowWorkspace defaultLens="cua-toi"/>` |
| `/approvals` | `RequireAuth moduleKey="approvals"` → `<ApprovalsPage/>` | same gate → `<WorkflowWorkspace defaultLens="cho-toi"/>` |
| `/pharmacy` | `RequireAuth moduleKey="pharmacy"` → `<PharmacyPage/>` | `<Navigate to="/kho?wh=thuoc" replace/>` (ungated — dest enforces) |
| `/inventory` | `RequireAuth moduleKey="inventory"` → `<InventoryPage/>` | `<Navigate to="/kho?wh=vat-tu" replace/>` |
| `/valuation` | `RequireAuth moduleKey="inventory"` → `<ValuationPage/>` | `<ValuationRedirect/>` (ungated) |

`WorkflowWorkspace` (line 37) and `KhoWorkspace` (line 23) are already imported. `Navigate` is already imported (line 7).

**`ValuationRedirect`** — a tiny component defined at module scope in `App.tsx` (needs `useSearchParams`; keep it inside wave-a's owned file):
```tsx
function ValuationRedirect() {
  const [params] = useSearchParams();          // add useSearchParams to the react-router-dom import
  const wh = params.get('module') === 'inventory' ? 'vat-tu' : 'thuoc';
  return <Navigate to={`/kho?wh=${wh}&tab=gia-tri`} replace />;
}
```
Maps `?module=inventory → wh=vat-tu`; every other value (null / `pharmacy` / `chooser`) → `wh=thuoc`; always `tab=gia-tri`. `khoTabs.coerceWarehouse`/`coerceTab` accept `vat-tu` and `gia-tri` verbatim (verified) so all three redirect URLs land on real Kho surfaces.

**Drop the now-dead lazy consts** in `App.tsx`: `RequestsPage`, `ApprovalsPage`, `PharmacyPage`, `InventoryPage`, `ValuationPage` (each referenced only by its old route element, which is now replaced). `tsconfig` has no `noUnusedLocals`, but remove them so the retire wave's file deletions don't leave dangling `import('@/app/…/page')` (that WOULD break the build). **This is the flip↔retire seam the integrator reconciles last.**

**Reachability proof for the three inventory redirects (no role loses access):** every role that can currently reach a source also passes `/kho`'s `moduleKey="inventory"` gate.
- `pharmacy.view` roles `{head_nurse, pharmacy_head, pharmacy_staff, director, chairman, super_admin}` ⊆ `inventory` module roles `{+accountant, +internal_accountant}`. ✓
- `/inventory` → `/kho`: identical gate. ✓
- `valuation.view` roles `{accountant, internal_accountant, director, chairman, super_admin}` ⊆ inventory-module roles. ✓

Note (carry-over, NOT introduced here): the single-gate Kho lets an `inventory`-only role (e.g. `accountant`) reach the Thuốc warehouse via the switcher — a widening that already exists the moment `/kho` is reachable (Phase 3). Fine-grained per-warehouse gating is **Phase 4c** (Phase 3 §9). Matrix semantics untouched; no role loses reachability.

`WorkflowWorkspace` lens contract confirmed: `defaultLens?: 'cua-toi' | 'cho-toi'`, reads `?lens=` override, single-lens (no tab) for pure-staff. `/requests` (gate `requests`, `requests.view_own`='all' → all staff) and `/approvals` (gate `approvals` → approver roles) preserve today's exact reachability.

### Nav repoint (wave a — owns `src/lib/navigation.ts`)

`resolveWorkspace`'s KTT branch returns `workspaceSlot('inventory', 'Kho')` whose path derives from `MODULE_NAV_META.inventory.path = '/inventory'`. Repoint the **path only** to `/kho`, keeping `moduleKey:'inventory'` (so reachability, the used-key dedup, and the gate are unchanged). Add an optional `pathOverride` param to `workspaceSlot`:
```ts
function workspaceSlot(moduleKey, label, pathOverride?) {
  const meta = MODULE_NAV_META[moduleKey];
  return { slot:'workspace', label, icon: meta.icon, path: pathOverride ?? meta.path, moduleKey };
}
// KTT branch:
if (can(role,'inventory.view') && can(role,'valuation.view')) return workspaceSlot('inventory','Kho','/kho');
```
Do **not** touch `MODULE_NAV_META.inventory` (keeps the Tra cứu "Kho vật tư" → `/inventory` link, which now just redirects). Leaving `moduleKey:'inventory'` means valuation/pharmacy stay in Tra cứu for KTT personas → `navReachability` test 1 stays green.

### Router-gap tighten (wave a — owns `src/components/auth/RequireAuth.tsx` + `navigation.ts`)

Two in-shell routes render with **no `RequireAuth`** today (ungated to any authenticated user):
- `/lab-dashboard` (line 288) → wrap in `<RequireAuth moduleKey="lab_dashboard">`.
- in-shell `/weekly-report` (line 264-267, element `WeeklyReportPage`) → wrap in `<RequireAuth moduleKey="weekly_report">`. (Leave the top-level `/weekly-report/tv` and `/weekly-report/details` outside AppShell alone — TV/print.)

`lab_dashboard` is a `PermissionModuleKey` but **not** a `roleCatalog.ModuleKey`, and `RequireAuth.moduleKey` + `canRoleAccessModule` are typed `ModuleKey`. Widen both to `PermissionModuleKey` (which is `ModuleKey | 'valuation' | 'lab_dashboard' | 'org_chart'`):
- `RequireAuth.tsx`: change the prop type `moduleKey?: ModuleKey` → `moduleKey?: PermissionModuleKey` (import from `@/types/permissions`).
- `navigation.ts`: `canRoleAccessModule(role, moduleKey: ModuleKey)` → `PermissionModuleKey`. Its body already calls `canAccessModule`, whose `MODULE_ACCESS_ACTIONS` map is keyed by `PermissionModuleKey` and already has `lab_dashboard`/`valuation`/`org_chart` entries — no logic change, only the parameter type widens.

The `/valuation` "gated by inventory instead of valuation.view" audit bug is **dissolved** by the flip (the route becomes an ungated redirect); no re-gate needed, and re-gating it to `valuation.view` would *remove* access for `head_nurse`/`pharmacy_head`/`pharmacy_staff` who can reach `/valuation` today — that would be a semantics change, out of scope.

### Tests wave a must update (owns them via navigation.ts)
- `test/unit/navReachability.test.ts` lines 80-86: `workspacePath('accountant'|'internal_accountant'|'director'|'chairman'|'head_nurse')` `'/inventory'` → `'/kho'` (5 assertions + the "KTT → Kho" comment). The `business_head`/`lab_head`/`pharmacy_head` → `/attendance` and `clinic_staff`/`pharmacy_staff` → `/requests` assertions stay. Test 1 (reachability), test 3 (no dup paths — `/kho` unique among the 4 pathed slots), test 4 (one badge) stay green unchanged.
- `test/unit/navigation.test.ts`: **no change** — it only exercises the legacy `getVisibleNavItems`/`NAV_ITEMS`, which this phase does not touch.

---

## 2. RETIRE list (wave c — deletes files + one test edit)

Delete exactly these 5 page components (each proven imported **only** by `src/App.tsx`; `grep` over `src/**` confirms no other importer):

| File | Sole importer (pre-flip) | Post-flip status | Children — DO NOT delete |
|---|---|---|---|
| `src/app/requests/page.tsx` | App.tsx:36 | `/requests` → WorkflowWorkspace | (imports only shared `Badges`/`EmptyState`/`useRequests` — nothing unique) |
| `src/app/approvals/page.tsx` | App.tsx:18 | `/approvals` → WorkflowWorkspace | (shared components + `useApprovals` only) |
| `src/app/pharmacy/page.tsx` | App.tsx:28 | `/pharmacy` → redirect | `@/app/pharmacy/Pharmacy{AnomalySections,Charts,DetailDrawer,Filters,InventoryTable,KpiGrid}` become orphaned but are **test-pinned** by `portalPresentationComponents.test.ts` — leave them |
| `src/app/inventory/page.tsx` | App.tsx:22 | `/inventory` → redirect | **`OverviewTab`, `ConsumptionTab`, `ImportExportTab`, `StocktakeTab`** are siblings mounted VERBATIM by `KhoWorkspace`/`KhoOverviewView` — leave them |
| `src/app/valuation/page.tsx` | App.tsx:43 | `/valuation` → redirect | (imports only viewmodels/supabase — nothing unique) |

Deleting a `page.tsx` does not touch its sibling child files. The Kho-mounted `app/inventory/{OverviewTab,ConsumptionTab,ImportExportTab,StocktakeTab}.tsx` and the test-pinned `app/pharmacy/Pharmacy*.tsx` / `app/inventory/overview/*` remain.

**Test edit (wave c):** `test/unit/portalPresentationComponents.test.ts` — the `countLines("src/app/pharmacy/page.tsx") < 500` budget assertion (lines 40-43) will throw ENOENT once the file is deleted. Remove that single assertion; keep the `OverviewTab < 550` assertion (file survives) and the whole `componentBoundaries` existence test (all listed files survive).

Out of scope (Phase 4c cleanup): deleting the orphaned `app/pharmacy/Pharmacy*` presentation children and the legacy formatter copies — deferred so this wave stays a pure, reversible route/page retire.

---

## 3. HOIST design — `ActionableDataContext` (wave b)

### Problem
`useActionableCount` (badge) and `useInbox` (inbox list) EACH instantiate their own `useApprovals({enabled}) + useNotifications()`. `useHomeToday` calls `useActionableCount` too. So on `/inbox` there are 2 `public:fdc_approvals` channels + 2 `public:fdc_notifications:<uid>` channels (AppShell badge + InboxPage); on `/dashboard`, 2 sets (AppShell badge + Home strip). The badge↔inbox agreement is held today by a **replicated predicate** ("keep these two in sync" comment) — fragile.

### Design
One provider mounted inside `AppShell` (user guaranteed) wrapping the entire shell chrome, holding **one** `useApprovals` + **one** `useNotifications`; both `useActionableCount` and `useInbox` become thin context consumers. Agreement then holds by **shared reference**, not replication.

New file `src/contexts/ActionableDataContext.tsx`:
```tsx
const Ctx = createContext<ActionableData | null>(null);

export function ActionableDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const approvalEnabled = Boolean(user && (
    can(user.role,'approvals.review_assigned') ||
    can(user.role,'approvals.receive_handoff') ||
    can(user.role,'room_management.review_group_queue')));   // the ONE canonical predicate
  const approvals = useApprovals({ enabled: approvalEnabled });
  const notifications = useNotifications();
  const value = useMemo(() => ({ approvals, notifications, approvalEnabled }),
    [approvals, notifications, approvalEnabled]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActionableData(): ActionableData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useActionableData must be used within ActionableDataProvider');
  return v;
}
```
Expose the **full** `useApprovals` return in the context (so `useInbox` gets `approvalWorkQueue` + `approveRequest`/`rejectRequest`/`updateHandoffStatus`, and a future wave can migrate `WorkflowWorkspace`/`ChoBanDuyet` too) and the full `useNotifications` return (`notifications`, `unreadCount`, `markAsRead`).

`AppShell.tsx` — split so the provider wraps both the nav (needs `total`) and the `<Outlet/>` (children need the context):
```tsx
export function AppShell() {
  const { user } = useAuth();
  if (!user) return null;
  return <ActionableDataProvider><AppShellChrome/></ActionableDataProvider>;
}
function AppShellChrome() {
  const { total } = useActionableCount();   // now reads context
  /* …existing Sidebar/TopBar/Outlet/BottomNav JSX, pendingCount={total}… */
}
```

`useActionableCount.ts` — drop `useAuth`/`useApprovals`/`useNotifications`; read the context. Same return shape (`{ approvalCount, notificationCount, total }`) so `AppShell` + `useHomeToday` are **unchanged**:
```ts
export function useActionableCount(): ActionableCount {
  const { approvals, notifications, approvalEnabled } = useActionableData();
  const approvalCount = approvalEnabled ? approvals.approvalWorkQueue.totalCount : 0;
  const notificationCount = notifications.unreadCount;
  return useMemo(() => ({ approvalCount, notificationCount, total: approvalCount + notificationCount }),
    [approvalCount, notificationCount]);
}
```

`useInbox.ts` — drop `useAuth`/`can`/`useApprovals`/`useNotifications`; read the context for data + action fns; **keep** its local optimistic `dismissed` set + `buildInbox` map + all wrapper callbacks (approve/reject/receiveHandoff/completeHandoff/markRead) exactly as they are. Same `UseInboxResult` shape → `InboxPage` unchanged.

### Invariant preserved (`buildInbox().length === useActionableCount().total`)
Both now derive from the SAME `approvals.approvalWorkQueue` and `notifications.notifications`:
- `total = (approvalEnabled ? workQueue.totalCount : 0) + unreadCount`
- `buildInbox(workQueue, notifications).length = workQueue.totalCount + unreadCount` (pure; when `!approvalEnabled`, `useApprovals` returns an empty queue so `totalCount === 0`).
`test/unit/inboxCount.test.ts` tests `buildInbox` purely (no hook mount) and needs **no change** — it still passes, and the hoist makes the runtime equality hold by construction rather than by a hand-synced predicate.

### Consumers (all inside the provider tree — verified)
`useActionableCount`: `AppShell` + `useHomeToday` (dashboard page, a route child). `useInbox`: `InboxPage` (route child). No consumer lives outside `AppShell`'s subtree, so the throwing context hook is safe. `WorkflowWorkspace`/`ChoBanDuyet` keep their own `useApprovals` (out of wave-b ownership) — the badge↔inbox collapse is the mandated scope; full collapse is a later wave.

---

## 4. Waves & exclusive file ownership

All waves `opus` (structural risk). **hoist (b) and retire (c) run in parallel; flip (a) depends on nothing but the integrator reconciles it LAST** (its App.tsx import removals must line up with wave c's file deletions before `lint`/`build`).

- **Wave a — flip + nav + router-gaps.** Owns: `src/App.tsx`, `src/lib/navigation.ts`, `src/components/auth/RequireAuth.tsx`, `test/unit/navReachability.test.ts`. (Reserve `src/types/permissions.ts`/`roleCatalog.ts` — no edit expected; `PermissionModuleKey` already exists.)
- **Wave b — hoist.** Owns: `src/contexts/ActionableDataContext.tsx` (new), `src/components/layout/AppShell.tsx`, `src/viewmodels/useActionableCount.ts`, `src/viewmodels/useInbox.ts`.
- **Wave c — retire.** Owns: deletes `src/app/{requests,approvals,pharmacy,inventory,valuation}/page.tsx`; edits `test/unit/portalPresentationComponents.test.ts`.

No file is owned by two waves.

## 5. Integrator checklist
1. Apply b + c (parallel), then reconcile a. Confirm `App.tsx` has no `import('@/app/{requests,approvals,pharmacy,inventory,valuation}/page')` left (else missing-module build error).
2. `npm run lint` (tsc --noEmit) → 0 errors. `npm run build` → green.
3. `npx tsx --test test/unit/*.ts test/unit/*.tsx` → navReachability (`/kho`), navigation, inboxCount, portalPresentationComponents all green.
4. Non-blocking follow-up (env-gated live smoke, NOT a wave edit): `src/lib/portal-auth-smoke.ts` still lists `/inventory` + `/pharmacy` as rendering routes; when the live auth smoke is next run, update their `expectedUrlPath` to `/kho?wh=vat-tu` / `/kho?wh=thuoc`. The unit assertion at `authenticatedRouteSmoke.test.ts:25` checks only the `.path` array (unchanged) so it stays green now.
