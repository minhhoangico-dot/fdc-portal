# Phase 4a — Reskin sweep: Kho parity · Báo cáo & Màn hình · Quản trị

- **Date**: 2026-07-08 · **Author**: Phase 4a Architect (Opus 4.8) · **Phase**: 4a of the user-centric redesign
- **Parent direction**: `tasks/active/2026-07-08-ux-redesign-user-centric.md` (§4.2 rows "Báo cáo & Màn hình" + "Quản trị"; §5 design system)
- **Predecessor**: `tasks/handoffs/2026-07-08-phase3-kho-status.md` (Kho shipped; Deviation 2 = `KhoDetailDrawer` built-but-unmounted)

---

## 1. Scope

**Presentation only.** Reskin existing *authenticated* surfaces onto the shipped `src/ui/*` primitive set + brand tokens, and wire the already-built `KhoDetailDrawer` into the Kho views. Every data viewmodel is consumed **verbatim** — no edit to any query, computed value, permission check, sort/filter predicate, threshold, or bridge call.

### In scope (files a wave may edit)
- **Kho parity**: `src/app/kho/KhoWorkspace.tsx`, `src/app/kho/KhoAnomaliesView.tsx` (mount + wire the drawer).
- **Báo cáo & Màn hình (authenticated management only)**: `src/app/lab-dashboard/page.tsx`; `src/components/weekly-report/WeeklyReportManagementWorkspace.tsx`; `src/components/weekly-report/WeeklyReportDetailsScreen.tsx`; `src/app/admin/WeeklyReportTab.tsx`; `src/app/admin/TvScreensTab.tsx`.
- **Quản trị**: `src/app/admin/page.tsx`; `UsersTab.tsx`; `AuditTab.tsx`; `MisaTab.tsx`; `MisaKeywordModal.tsx`; `HealthTab.tsx`; `ApprovalTab.tsx`; `RolesTab.tsx`; `AnomalyThresholdsTab.tsx`; `AddUserModal.tsx`; `DelegationModal.tsx`.

### Out of scope — NEVER touch
- Frozen viewmodel internals: `useAdmin`, `useAnomalyThresholds`, `useTvScreens`, `useWeeklyReport`, `useLabDashboard`, `useRoleCatalog` (`@/contexts/RoleCatalogContext`), `useDelegations`, `usePharmacyInventory`, `useSupplyInventory`, `useInventoryDashboardSummary`, `useSupplyChart`, and every hook's internals.
- TV / display targets (keep their own dark theme): `src/app/tv/**`, `src/app/lab-dashboard/tv/**`, `src/app/weekly-report/tv/**`, `src/app/tv-management/weekly-report/tv/**`; the display components `WeeklyReportTvScreen.tsx`, `InfectiousDiseaseCard.tsx`, `ServiceStatsCard.tsx`, `TransferStatsCard.tsx` (all only consumed by `WeeklyReportTvScreen`), `LabDashboardDisplay.tsx` (dark `mode=preview|tv` display, mounted in both the launcher preview box AND the TV route — leave dark), `LabDashboardDetailScreen.tsx` + `LabDashboardSourcePanel.tsx` (only consumed by `/lab-dashboard/tv`, `--tv` dark classes).
- `src/App.tsx`, `src/lib/navigation.ts`, `src/lib/role-authority.ts`, permission-matrix semantics, head_nurse authority (keep default). No route flips/retires (Phase 4b). No git commits/staging.
- `src/app/admin/admin-navigation.ts` stays as-is (data only; the shell keeps importing `ADMIN_TABS` + `getAdminLegacyTabRedirect`).
- The Kho sub-views already shipped and NOT reopened here: `KhoOverviewView`, `KhoInventoryListView`, `KhoValuationView`, `KhoKpiRow`, `khoInventoryColumns`, `KhoFilterBar`, `KhoDetailDrawer` (consumed, not edited), and the legacy Vật-tư tabs (`ConsumptionTab`/`ImportExportTab`/`StocktakeTab`) mounted verbatim. (Full Vật-tư `OverviewTab` reskin is a later Phase-4b item; here we only *confirm it renders*.)

---

## 2. Design system quick-reference (consume, do not edit `src/ui/*`)

Import primitives by direct path (`@/ui/PageHeader`, etc.) or the barrel `@/ui`. All are zero-business-logic and pure passthrough.

`PageHeader{title,sub?,actions?}` · `KpiCard{label,value,delta?,icon?}` · `StatusBadge{status:'ok'|'warn'|'danger'|'info'|'neutral',label}` · `TabBar<K>{tabs:{key,label,icon?}[],activeKey,onChange}` · `EmptyState{icon,title,description?}` · `WidgetCard{title?,actions?,children}` · `DataTable<Row>{columns,rows,rowKey,sortKey?,sortDir?,onToggleSort?,onRowClick?,emptyLabel,density?}` · `ChartFrame{title,subtitle?,actions?,height,isLoading?,isEmpty?,emptyLabel?}` + presets `ValueTrendChart`/`TopMaterialsChart` · `SealMark` (approval only — not used in this phase) · `InboxItem`/`ApprovalCard` (Phase 2 — not used here).

Tokens (Tailwind 4): `bg-paper`/`bg-card`, `text-ink-900|600|400`, `border-line`, `brand-500|600|700`, `ok-600`/`warn-600`/`danger-600`/`info-600`, `rounded-card`/`rounded-field`, `shadow-card`. Replace every indigo/gray-slate literal (`indigo-*`, `slate-*`, `gray-*`, `bg-white`) with these. Financial/tabular columns use `tabular-nums`. Vietnamese labels copied verbatim.

---

## 3. Kho-parity wiring plan (the one behavioral gap — presentation only)

**Deviation 2 fix.** `KhoInventoryListView` already calls `onRowClick → vm.setSelectedItem`, but no shell mounts `<KhoDetailDrawer>`, so the list/anomaly drill-down is dead. `KhoDetailDrawer` renders `null` when `selectedItem` is null and consumes only `selectedItem/setSelectedItem/itemSnapshots/isLoadingItemSnapshots/anomalies` off the active vm.

**Wiring (owner: kho-parity wave):**
1. **Mount the drawer once in `KhoWorkspace.tsx`**, after the sub-tab blocks: `<KhoDetailDrawer vm={vm} warehouse={warehouse} />`. `vm` is the active enabled-dual-hook viewmodel (`pharmacy` for `thuoc`, `supply` for `vat-tu`) — both expose the 5 drawer fields (verified: pharmacy return L622–629; supply exposes the same shape, already proven by `KhoInventoryListView`/`StocktakeTab` consuming `supply.*`). A single mount serves BOTH the Danh-sách row click and the Bất-thường anomaly click, for BOTH warehouses.
2. **Anomaly click → drawer**, reproducing the legacy `inspectAnomaly` verbatim (from `app/pharmacy/page.tsx:258–269`): in `KhoWorkspace` define
   ```ts
   const inspectAnomaly = (a: InventoryAnomaly) => {
     const found = vm.filteredInventory.find((item) => anomalyMatchesInventoryItem(a, item));
     if (found) { vm.setSelectedItem(found); setTab('danh-sach'); }
   };
   ```
   (`anomalyMatchesInventoryItem` from `@/lib/inventory-identity`; `filteredInventory` already on the vm.) Pass it down as a new **optional** prop `onInspectAnomaly?: (a: InventoryAnomaly) => void` on `KhoAnomaliesView`.
3. **`KhoAnomaliesView.tsx`**: make each active-anomaly card clickable — `role="button"`, `cursor-pointer`, `onClick={() => onInspectAnomaly?.(anomaly)}` on the card wrapper; the existing "Xác nhận" button must `e.stopPropagation()` so acknowledge does not also open the drawer. No change to `KhoAnomaliesVm` (anomalies/acknowledgeAnomaly stay); the resolution logic lives in `KhoWorkspace` which owns the full vm. Keep the local severity-fill palette as-is.
4. **Confirm** all 4 shared sub-tabs (Tổng quan / Danh sách / Giá trị / Bất thường) render for BOTH `wh=thuoc` and `wh=vat-tu` (Vật-tư Tổng-quan still mounts legacy `OverviewTab` verbatim — that is expected; do not reskin it here). No numeric change: the drawer/anomaly wiring only *reads* `filteredInventory` + `setSelectedItem`, exactly like the retired legacy pages.

No edit to `KhoInventoryListView` (already wired) or `KhoDetailDrawer` (consumed as-is).

---

## 4. Reskin mapping per surface (file → ui/* primitives → frozen viewmodel)

### Báo cáo & Màn hình
| File | Primitives | Frozen vm | Notes |
|---|---|---|---|
| `app/lab-dashboard/page.tsx` | PageHeader (title+TV/refresh actions) · KpiCard ×4 stat cards · WidgetCard for the two side panels (Tình trạng dữ liệu / Vận hành TV) · StatusBadge for section-error state | `useLabDashboard` | **Keep the dark preview box** (`LabDashboardDisplay`) untouched — only reskin the light chrome around it. |
| `components/weekly-report/WeeklyReportManagementWorkspace.tsx` | PageHeader (breadcrumb+snapshot/TV actions) · KpiCard grid for `quickStats` · WidgetCard for "Chọn tuần" + "Trạng thái snapshot" · StatusBadge for task status (SUCCESS/FAILED/pending) | `useWeeklyReport` (`useWeeklyReportLauncher`) | Mounts `<WeeklyReportTab/>` (different wave; keep the import + no-prop call). |
| `components/weekly-report/WeeklyReportDetailsScreen.tsx` | PageHeader (back + Xuất CSV) · DataTable (sortable, sticky header, `density="compact"`) replacing the hand-rolled `<table>` · StatusBadge for the `doituong` chips | `useWeeklyReport` (`useWeeklyReportDetails`) | Keep the CSV builder + `sortConfig` shape (presentation state, not vm). It renders its own full-page frame — swap `slate-*` → paper/ink. |
| `admin/WeeklyReportTab.tsx` (525 LOC — dense) | WidgetCard sections · DataTable for tabular config · StatusBadge · tokenized form controls | `useWeeklyReport` (`useWeeklyReportAdmin`) | Largest report surface; opus. |
| `admin/TvScreensTab.tsx` (383 LOC — CRUD) | PageHeader · DataTable (screens list) · StatusBadge (active/inactive) · tokenized create/edit form | `useTvScreens` (`useTvScreensAdmin`) | Rendered by `tv-management/page.tsx` (untouched passthrough). Keep `<TvScreensTab/>` no-prop signature. |

### Quản trị (control room)
| File | Primitives | Frozen vm | Notes |
|---|---|---|---|
| `admin/page.tsx` (shell) | PageHeader ("Quản trị hệ thống") · **TabBar** replacing the indigo pill row (map `ADMIN_TABS` → `{key,label,icon}`) · neutral content region (no double-card) | `useAdmin` | Keep the `hasFullPortalAdminAccess` guard + `getAdminLegacyTabRedirect` effect verbatim. Owns the two modals it controls. |
| `admin/AddUserModal.tsx` · `admin/DelegationModal.tsx` | tokenized dialog shell · StatusBadge · form fields | `useAdmin` (via page props) · `useRoleCatalog` · `useDelegations` (Delegation) | Owned by the shell wave (page controls open/close). |
| `admin/UsersTab.tsx` | DataTable (users) · StatusBadge (role/active) · search field | `useAdmin` (props) · `useRoleCatalog` (assignable roles, read-only) | |
| `admin/AuditTab.tsx` | DataTable (audit log) · StatusBadge · Xuất CSV action | `useAdmin` (props) | |
| `admin/MisaTab.tsx` · `admin/MisaKeywordModal.tsx` | WidgetCard · DataTable (keywords / scan results) · StatusBadge (active) · tokenized modal | `useAdmin` (props) | |
| `admin/HealthTab.tsx` (347 LOC) | KpiCard/WidgetCard health tiles · StatusBadge (bridge/sync status) · DataTable (sync history) · manual-sync action | `useAdmin` (props: bridgeHealth, syncHistory) | |
| `admin/ApprovalTab.tsx` (367 LOC) | WidgetCard config sections · tokenized step editor · StatusBadge · save state | `useAdmin` (props) · `useRoleCatalog` (read-only) | Dense forms; opus. |
| `admin/RolesTab.tsx` (241 LOC) | DataTable/WidgetCard role catalog · StatusBadge · tokenized editor | `useRoleCatalog` (own hook) | |
| `admin/AnomalyThresholdsTab.tsx` (339 LOC) | WidgetCard/DataTable threshold rows · tokenized numeric inputs · StatusBadge/save state | `useAnomalyThresholds` (own hook) | |

`useRoleCatalog` is a read-only context consumed by several tabs across waves — importing it is fine; nobody edits it.

---

## 5. Waves & exclusive file ownership

8 waves, mutually-exclusive files. None touch `src/App.tsx`, `src/lib/navigation.ts`, `admin-navigation.ts`, any frozen viewmodel internal, or any TV display page. Cross-wave imports exist (e.g. `WeeklyReportManagementWorkspace` imports `WeeklyReportTab`; `admin/page.tsx` imports every tab) and are safe **only because reskins preserve every component's exported prop/return signature** (see §6).

| # | Key | Surface | Model | Files |
|---|---|---|---|---|
| 1 | kho-drawer-wiring | kho-parity | opus | `src/app/kho/KhoWorkspace.tsx`, `src/app/kho/KhoAnomaliesView.tsx` |
| 2 | report-launcher-chrome | bao-cao-man-hinh | sonnet | `src/app/lab-dashboard/page.tsx`, `src/components/weekly-report/WeeklyReportManagementWorkspace.tsx`, `src/components/weekly-report/WeeklyReportDetailsScreen.tsx` |
| 3 | weekly-report-tab | bao-cao-man-hinh | opus | `src/app/admin/WeeklyReportTab.tsx` |
| 4 | tv-screens-tab | bao-cao-man-hinh | opus | `src/app/admin/TvScreensTab.tsx` |
| 5 | admin-shell-modals | quan-tri | opus | `src/app/admin/page.tsx`, `src/app/admin/AddUserModal.tsx`, `src/app/admin/DelegationModal.tsx` |
| 6 | admin-tables-misa | quan-tri | sonnet | `src/app/admin/UsersTab.tsx`, `src/app/admin/AuditTab.tsx`, `src/app/admin/MisaTab.tsx`, `src/app/admin/MisaKeywordModal.tsx` |
| 7 | admin-approval-health | quan-tri | opus | `src/app/admin/ApprovalTab.tsx`, `src/app/admin/HealthTab.tsx` |
| 8 | admin-roles-thresholds | quan-tri | opus | `src/app/admin/RolesTab.tsx`, `src/app/admin/AnomalyThresholdsTab.tsx` |

---

## 6. Integration rules

1. **Signature freeze**: a reskin must NOT change any component's exported prop interface or return type. `admin/page.tsx` renders `<UsersTab onRoleChange … />`, `<HealthTab bridgeHealth … />`, etc. with unchanged props; `<WeeklyReportTab/>` and `<TvScreensTab/>` stay no-prop. Change classNames/markup only.
2. **No double-carding**: the admin shell (wave 5) provides a neutral content region (`bg-transparent`, no border); each tab renders its own `WidgetCard`/`DataTable` chrome. Coordinate so a tab is not wrapped in two cards.
3. **No new shared files**: waves import `src/ui/*`, `@/lib/utils` formatters, `@/lib/inventory-identity`, and frozen viewmodels — all read-only. No wave adds/edits a shared module.
4. **Vietnamese verbatim**; **color = meaning** (StatusBadge is the single source of status color); numbers unchanged.

---

## 7. Gates (per wave + integrator)

- `npm run lint` (`tsc --noEmit`) exit 0 — each wave fixes its own type errors (esp. wave 1: confirm the `vm` union satisfies `KhoDetailDrawerVm`).
- `npm run build` exit 0; `npm run check:bundle`; `npm run check:pwa`.
- **Numbers-unchanged**: `git diff` touches no frozen viewmodel / query / KPI / threshold / sort / filter. Kho wave 1: drawer + anomaly wiring only *reads* `filteredInventory`/`setSelectedItem` (legacy `inspectAnomaly` parity) — zero data-logic drift.
- **Route audit**: every existing route still resolves (reskin in place = same route, new look); no route flipped/retired; `src/App.tsx` untouched.
- Structural screenshots (component-level, auth is live-blocked in this env) per surface into `tasks/handoffs/`.
