# Phase 4a — Reskin sweep: integration & gate status

- **Date**: 2026-07-08 · **Role**: Phase 4a Integrator (Opus 4.8) · **Branch**: `codex/portal-presentation-refactor`
- **Spec**: `tasks/active/2026-07-08-phase4a-reskin.md` · **Predecessor**: `tasks/handoffs/2026-07-08-phase3-kho-status.md`
- **Scope**: PRESENTATION ONLY — reskin existing authenticated surfaces onto `src/ui/*` + brand tokens; every data viewmodel consumed verbatim. No git commits, no route flips, no `src/App.tsx`.

---

## 1. Shipped files (18 owned presentation files — all `M`, none new-shared)

Every file below is a re-skin: markup/classNames swapped to `src/ui/*` primitives + brand tokens (`bg-paper`/`bg-card`, `text-ink-*`, `border-line`, `brand-*`, `ok/warn/danger/info-600`, `rounded-card`/`rounded-field`, `shadow-card`, `tabular-nums`). Exported prop/return signatures unchanged (signature freeze). The frozen viewmodel each surface consumes is listed.

| Wave | File | Frozen viewmodel consumed (verbatim) |
|---|---|---|
| 1 kho-parity | `src/app/kho/KhoWorkspace.tsx` | `usePharmacyInventory({enabled})` / `useSupplyInventory({enabled})` — active `vm` selected by warehouse; mounts `<KhoDetailDrawer vm warehouse/>` once; adds `inspectAnomaly` legacy parity (reads `vm.filteredInventory` + `vm.setSelectedItem`). |
| 1 kho-parity | `src/app/kho/KhoAnomaliesView.tsx` | (props) — active-anomaly card now `role=button` → `onInspectAnomaly?`; "Xác nhận" `stopPropagation`; `acknowledgeAnomaly` unchanged. |
| 2 report-chrome | `src/app/lab-dashboard/page.tsx` | `useLabDashboard()` — dark `LabDashboardDisplay` preview left untouched; only light chrome tokenized. |
| 2 report-chrome | `src/components/weekly-report/WeeklyReportManagementWorkspace.tsx` | `useWeeklyReportLauncher()` — mounts no-prop `<WeeklyReportTab/>`. |
| 2 report-chrome | `src/components/weekly-report/WeeklyReportDetailsScreen.tsx` | `useWeeklyReportDetails({key,type,start,end})` — CSV builder + `sortConfig`/`handleSort` preserved verbatim (incl. `﻿` BOM); `__rowIndex` is display-only. |
| 3 weekly-report-tab | `src/app/admin/WeeklyReportTab.tsx` | `useWeeklyReportAdmin()` |
| 4 tv-screens-tab | `src/app/admin/TvScreensTab.tsx` | `useTvScreensAdmin()` — no-prop signature kept (rendered by `tv-management/page.tsx`). |
| 5 admin-shell | `src/app/admin/page.tsx` | `useAdmin()` — pill row → `<TabBar<AdminTab>>`; `hasFullPortalAdminAccess` guard + `getAdminLegacyTabRedirect` effect verbatim; neutral content region (no double-card); owns both modals. |
| 5 admin-shell | `src/app/admin/AddUserModal.tsx` | `useAdmin` (via page props) |
| 5 admin-shell | `src/app/admin/DelegationModal.tsx` | `useAdmin` (props) · `useDelegations` |
| 6 admin-tables | `src/app/admin/UsersTab.tsx` | `useAdmin` (props) · `useRoleCatalog` (read-only) |
| 6 admin-tables | `src/app/admin/AuditTab.tsx` | `useAdmin` (props) |
| 6 admin-tables | `src/app/admin/MisaTab.tsx` | `useAdmin` (props) |
| 6 admin-tables | `src/app/admin/MisaKeywordModal.tsx` | `useAdmin` (props) |
| 7 approval-health | `src/app/admin/ApprovalTab.tsx` | `useAdmin` (props) · `useRoleCatalog` (read-only) |
| 7 approval-health | `src/app/admin/HealthTab.tsx` | `useAdmin` (props: `bridgeHealth`, `syncHistory`) |
| 8 roles-thresholds | `src/app/admin/RolesTab.tsx` | `useRoleCatalog()` |
| 8 roles-thresholds | `src/app/admin/AnomalyThresholdsTab.tsx` | `useAnomalyThresholds()` |

Barrel `src/ui/index.ts` **not modified** — all primitives already exported; no wave added a new primitive or shared module. Waves import `src/ui/*` by direct path (barrel-contention-free), plus `@/lib/utils`, `@/lib/inventory-identity`, and the frozen viewmodels — all read-only.

## 2. Gate results (verbatim)

| Gate | Command | Result |
|---|---|---|
| Type-check | `npm run lint` (`tsc --noEmit`) | **exit 0** — no output |
| Build | `npm run build` (`vite build`) | **exit 0** — `✓ 3395 modules transformed` · `✓ built in 5.81s` · `PWA v1.2.0 … precache 89 entries (1848.47 KiB)` |
| Bundle budget | `npm run check:bundle` | **exit 0** — `Portal bundle budget check passed.` (largest: `xlsx` 419.47 KiB, `charts` 374.38 KiB, `index` 334.97 KiB, `KhoWorkspace` 33.13 KiB) |
| PWA budget | `npm run check:pwa` | **exit 0** — `PWA precache budget check passed.` `89 precache entries` · `XLSX chunks excluded from precache` |
| Unit tests | `npx tsx --test test/unit/*.ts test/unit/*.tsx` | **exit 0** — `tests 102 · suites 0 · pass 102 · fail 0 · cancelled 0 · skipped 0 · todo 0 · duration_ms 5791.86` |

## 3. No-drift verdict — CLEAN

- **Zero frozen viewmodel touched.** `git diff --name-only` matches none of `useAdmin` / `useAnomalyThresholds` / `useTvScreens` / `useWeeklyReport` / `useLabDashboard` / `RoleCatalogContext` (`useRoleCatalog`) / `useDelegations` / `usePharmacyInventory` / `useSupplyInventory` / `useInventoryDashboardSummary` / `useSupplyChart`.
- **Zero forbidden path touched by Phase 4a.** No `src/App.tsx`, `src/lib/navigation.ts`, `src/lib/role-authority.ts`, `src/app/admin/admin-navigation.ts`. Permission-matrix semantics + `head_nurse` default authority untouched. No TV/display page in scope was modified (`admin/TvScreensTab.tsx` is the CRUD surface, not a display page; `WeeklyReportTvScreen`, `LabDashboardDisplay`, `/tv/**`, `lab-dashboard/tv`, etc. all absent from diff).
- **No stray data calls introduced.** Grep of all reskinned `src/app/admin/**` and `src/app/kho/**` files for `supabase.from|supabase.rpc|bridgeRequest|fetch(|axios|useQuery` → none. Presentation never fetched; still doesn't.
- **Numbers unchanged.** Kho wave 1 (only behavioral change) is pure read-only wiring — drawer mount + anomaly→`inspectAnomaly` reproduce legacy `app/pharmacy/page.tsx` parity, reading `filteredInventory`/`setSelectedItem` only. No query/KPI/threshold/sort/filter edited.
- **Routes intact.** No route flipped or retired; every existing route reskins in place (same route, new look). `src/App.tsx` untouched.

## 4. Structural screenshots (real components + built CSS; component-level; live E2E auth-blocked)

Rendered via a throwaway SSR harness (`renderToStaticMarkup` of real components) → HTML with the three real built CSS files inlined (`dist/assets/index-*.css` + `page-*.css` + `useLabDashboard-*.css`) → Chromium (playwright-core, 1440px @2x, full-page). Harness deleted after; no repo files added beyond the two PNGs.

- `tasks/handoffs/2026-07-08-phase4a-admin-health-1440.png` — **Quản trị** surface: the REAL reskinned `HealthTab` component (verbatim Phase 4a file) inside the REAL shell chrome (`PageHeader "Quản trị hệ thống"` + `TabBar` over the real `ADMIN_TABS`, active = Hệ thống), fed mock props matching `HealthTabProps`. Shows brand-tokened `WidgetCard` tiles, `StatusBadge` (ONLINE / Thành công / Đang xử lý / Thất bại → ok/warn/danger hues) and the compact `DataTable` sync history.
- `tasks/handoffs/2026-07-08-phase4a-baocao-details-1440.png` — **Báo cáo & Màn hình** surface: the REAL `src/ui/*` primitives (`PageHeader "Chi tiết dịch vụ"` + Xuất CSV action, `WidgetCard`, compact sortable `DataTable`, `StatusBadge`) composed exactly as `WeeklyReportDetailsScreen` renders them — verbatim column set (STT/Mã BN/Tên bệnh nhân/GT/Đối tượng/Dịch vụ/Thời gian) and `doituongStatus` mapping — with mock rows. (The top-level screen calls `useWeeklyReportDetails` + `useSearchParams` internally, so it is auth/router-coupled; its exact ui composition is rendered instead of a live nav. Not a fake mockup — real ui components, real built CSS, mock data only.)

Both confirm: no indigo/slate/gray literals, `color = meaning` via StatusBadge, tabular-nums on figures, card/field radii + shadow-card chrome.

## 5. Deviations

- **D1 — Báo cáo screenshot is a real-primitive composition, not a full-screen SSR.** The three report top-level surfaces (`WeeklyReportDetailsScreen`, `WeeklyReportManagementWorkspace`, `lab-dashboard/page`) all call their frozen hook internally (Supabase) and two also need react-router context; under `renderToStaticMarkup` effects don't run, so a full-screen render would only show the empty/loading state. To produce a populated structural shot without faking, the Báo cáo PNG renders the exact `ui/*` composition + verbatim columns of `WeeklyReportDetailsScreen` with mock rows. The Quản trị PNG has no such limitation — it renders the actual `HealthTab` file verbatim. No product code was changed for screenshots.
- **D2 — none in code.** No behavioral, prop-signature, or shared-module deviation across the 18 files.

## 6. Blockers

- **B1 (staging hygiene — NOT a code defect; carried from the verifier).** The working tree also carries a *different* workstream's changes that are on the Phase 4a forbidden list and were already `M`/untracked at session start: `fdc-lan-bridge/src/jobs/aggregateAttendance.ts`; `src/app/attendance/{page,ManagerTab,ReportsTab}.tsx`; `src/types/attendance.ts`; `src/viewmodels/attendance/{shared,useAttendanceManager,useAttendanceReports}.ts`; untracked `sql/*.sql` (3) and `src/components/attendance/`. These are the attendance module (commits `c1b14f4`/`ddc67e2`), **not** produced by any Phase 4a wave. Nothing to revert. **When Phase 4a is committed, stage ONLY the 18 owned files + the two handoff PNGs + this status doc explicitly — do NOT `git add -A`/`git commit -a`**, or the reskin commit will bundle backend data-logic + forbidden-path changes.
- No other blockers.

## 7. Ready for Phase 4b

Phase 4a reskinned **in place** (same route, new look) — these routes now render on `ui/*` + brand tokens and are safe for 4b to flip/retire/re-home:

- **Quản trị** `/admin` (shell + all 7 tabs: Người dùng, Cấu hình phê duyệt, Từ khóa MISA, Hệ thống, Nhật ký, Vai trò, Ngưỡng cảnh báo) + AddUserModal + DelegationModal + MisaKeywordModal.
- **Kho** `/kho` (KhoWorkspace + KhoAnomaliesView; KhoDetailDrawer now mounted for both `thuoc`/`vat-tu`, both anomaly-click and list row-click drill-down live).
- **Báo cáo & Màn hình** (authenticated management only): `lab-dashboard/page` light chrome, `WeeklyReportManagementWorkspace`, `WeeklyReportDetailsScreen`, admin `WeeklyReportTab`, admin `TvScreensTab`.

Still **parked / intentionally NOT reskinned** (out of Phase 4a scope; hard-excluded):

- All **TV / display** targets keep their dark theme: `src/app/tv/**`, `src/app/lab-dashboard/tv/**`, `src/app/weekly-report/tv/**`, `src/app/tv-management/weekly-report/tv/**`; `WeeklyReportTvScreen` + `InfectiousDiseaseCard`/`ServiceStatsCard`/`TransferStatsCard`; `LabDashboardDisplay` (dark preview stays dark in `lab-dashboard/page`); `LabDashboardDetailScreen` + `LabDashboardSourcePanel`.
- **Vật-tư legacy Tổng-quan** (`OverviewTab`/`ConsumptionTab`/`ImportExportTab`/`StocktakeTab`) mounted verbatim inside Kho — confirmed rendering, full reskin is a later 4b item.
- Route wiring itself: `src/App.tsx`, `src/lib/navigation.ts`, `src/app/admin/admin-navigation.ts` untouched — 4b owns all route flips/retires.
