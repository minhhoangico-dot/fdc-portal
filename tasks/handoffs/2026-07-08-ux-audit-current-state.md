# FDC Portal — Current-State UX + Architecture Audit

- **Date**: 2026-07-08
- **Purpose**: Ground the user-centric UX + architecture redesign (`tasks/active/2026-07-08-ux-redesign-user-centric.md`). Cross-references that doc's 6 workspaces (Phê duyệt & Đề nghị, Kho & Dược, Nhân sự, Vận hành, Báo cáo & Màn hình, Quản trị), the 5-item nav (Hôm nay / Cần xử lý / [Workspace] / Tra cứu / Cá nhân), and its 4-phase strangler plan.
- **Source**: merge of 4 auditor reports (Surfaces / Duplication / Roles / Data-layer), reconciled against code where reports disagreed.
- **Reconciliations applied** (auditor vs. actual code):
  - `/tv-management/weekly-report` (management workspace) is gated by `moduleKey="tv_management"` + `OnsiteAccessGate`, **not** `weekly_report` as Report A's table claimed (`src/App.tsx:227-232`). The `weekly_report` gate applies only to the public boards `/tv-management/weekly-report/tv` and `/details` (`App.tsx:71,81`).
  - `NAV_ITEMS` confirmed at exactly 11 items (`src/lib/navigation.ts:32-54`); `weekly_report`, `valuation`, `lab_dashboard` confirmed absent from it.
  - `FULL_ACCESS_ROLES = ['super_admin','head_nurse']`, `ONSITE_ACCESS_BYPASS_ROLES = ['super_admin']` confirmed (`src/lib/role-authority.ts:8-9`).

---

## 1. Executive summary

- **Module-first shell, not user-first.** 11 fixed `NAV_ITEMS` render a directory of systems; a nurse and the chief accountant see nearly the same shell. This is the core problem the 5-item role-composed nav must solve.
- **One approval object, two pages.** `requests` ("của tôi") and `approvals` ("chờ tôi") are two surfaces over the *same* `fdc_approval_requests`/`fdc_approval_steps`, with overlapping realtime subscriptions (see §5). This is the highest-value merge (redesign Phase 2, "Phê duyệt & Đề nghị").
- **Three-to-four near-clone dashboard stacks.** `usePharmacyInventory` (643 LOC) and `useSupplyInventory` (679 LOC) are ~65% identical; page shells, KPI grids, charts, badges, and detail drawers are hand-rolled twice (plus `valuation` re-fetching pharmacy data inline, plus `dashboard`). ~350-400 duplicated viewmodel LOC alone. This is Phase 3 ("Kho & Dược"), KTT's workspace and the biggest dedup.
- **No design system.** Ad-hoc Tailwind per page, indigo `#4f46e5` default; tab bars hand-rolled 3×, KPI cards ~11×, status/severity badges 8×, `formatVND` reimplemented 13×, `formatCompact` 7×, `formatLocalDate` 4×. Every one is a token/primitive the redesign's `src/ui/` collapses.
- **Three permission-backed modules are nav-orphaned.** `weekly_report`, `valuation`, `lab_dashboard` exist in the permission matrix but have **no `NAV_ITEMS` entry** — reachable only by hardcoded link/direct URL. lab_staff's *only* differentiating screen (`lab_dashboard`) is invisible in nav, so lab_staff's product is functionally identical to clinic_staff.
- **Router-level permission gaps.** `/lab-dashboard` and the `/weekly-report*` legacy stubs have **no `moduleKey`** on their `<Route>`, so their finer-grained `.view` permissions are unenforced at the router. `/valuation` is gated by `moduleKey="inventory"`, not the `valuation.view` permission that exists for it.
- **head_nurse is an accidental second super_admin — then blocked at the door.** Via `FULL_ACCESS_ROLES` bypass it silently gains every `['super_admin']`-only action (admin.*, tv_management.view) and an identical 11-item nav, but `OnsiteAccessGate` (bypass = super_admin only) then denies `/admin` and `/tv-management`. Nav promises access the gate revokes — a live inconsistency the redesign must resolve deliberately.
- **One layer-leak page.** `src/app/inventory/StocktakeTab.tsx` is the only page doing its own `supabase.from().insert/update` (6 call sites, `fdc_stocktake_sessions`/`fdc_stocktake_items`) with no viewmodel — the cleanest, most isolated seam to fix.
- **No shared query/cache layer.** No react-query/SWR; ~25 viewmodels each hand-roll `isLoading`/`error`/`useEffect`-fetch/realtime scaffolding. The shared `subscribe` helper (`src/lib/supabase-realtime.ts`) is the clean seam to grow a `useRealtimeQuery` on top of — the redesign's `src/lib/data/`.
- **Role logic is centralized in the matrix but re-derived in ≥8 files.** `useApprovals.ts` (~15 role literals), `useDashboard.ts` + `dashboard/page.tsx` (duplicated widget-gating arrays), org-chart, room-management routing, request previews all re-hardcode role→behavior. The widget registry (redesign §4.3) must key off matrix *actions*, and any role rename/merge must sweep all 8.
- **Bridge contract is stable and must not move.** Portal↔bridge is HTTP via `bridgeRequest` (`src/lib/bridge-client.ts`) for lab-dashboard, weekly-report, attendance-sync, hikvision, manual sync; bridge *health* is read from Supabase (`fdc_sync_health`), not HTTP. `weekly-report.ts`/`hikvision.ts`/`useAdmin.ts` bypass `bridgeRequest` with raw fetch — dedup opportunity, but endpoints/paths are a frozen contract (redesign rule: never edit `fdc-lan-bridge` for UI reasons).
- **Realtime usage is disciplined.** Every subscription goes through the one shared helper; no raw `supabase.channel()` outside it; cleanup verified. The only issues are naming drift (2 channels) and the approvals/requests overlap — a *non-issue to preserve*, not a rewrite target.

---

## 2. Surface inventory (condensed)

Legend: **daily** = primary-nav candidate; **non-nav** = TV/print/admin/orphan.

| Route | Page file | Purpose | Role gate (actual) | Redesign workspace | Class |
|---|---|---|---|---|---|
| `/login` | `app/login/page.tsx` | Auth | public | — | daily |
| `/dashboard` | `app/dashboard/page.tsx` | Home overview | `dashboard` (all 13) | **Hôm nay** | daily |
| `/requests`, `/requests/create`, `/requests/:id` | `app/requests/**` | My requests + create + detail | `requests` (all 13) | **Phê duyệt & Đề nghị** | daily |
| `/approvals` | `app/approvals/page.tsx` | Approval queue | `approvals` (9 reviewer roles) | **Phê duyệt & Đề nghị** | daily |
| `/inventory` (6 tabs) | `app/inventory/page.tsx` | Supply inventory | `inventory` (8 roles) | **Kho & Dược** | daily |
| `/pharmacy` (3 tabs) | `app/pharmacy/page.tsx` | Pharmacy stock | `pharmacy` (6 roles) | **Kho & Dược** | daily |
| `/valuation` | `app/valuation/page.tsx` | Stock valuation | `inventory` gate (**not** `valuation.view`); **not in NAV** | **Kho & Dược** | orphan |
| `/attendance` (6 tabs) | `app/attendance/page.tsx` | Timekeeping | `attendance` (all 13, tabs re-gate) | **Nhân sự** | daily |
| `/org-chart` | `app/org-chart/page.tsx` | Static org tree | `org_chart` (all 13) | **Nhân sự** / Tra cứu | daily |
| `/portal` | `app/portal/page.tsx` | Personal hub | `portal` (all 13) | **Cá nhân** | daily |
| `/room-management`, `/maintenance` | `app/room-management/**` | Floor-plan map + maintenance kanban | `room_management` (all 13) | **Vận hành** | daily |
| `/room-management/print/materials` | `.../print/materials/page.tsx` | Printable materials | `room_management` | Vận hành (print) | non-nav |
| `/tv-management` | `app/tv-management/page.tsx` | TV screen config | `tv_management` (super_admin + head_nurse-bypass) + `OnsiteAccessGate` | **Quản trị** | non-nav |
| `/tv-management/weekly-report` | `.../weekly-report/page.tsx` | Weekly-report CRUD workspace | **`tv_management`** + `OnsiteAccessGate` (corrected) | **Báo cáo & Màn hình** | non-nav |
| `/tv-management/weekly-report/tv`, `/details` | `.../weekly-report/{tv,details}/page.tsx` | Weekly-report boards/print | `weekly_report` (7 roles) + `TvAccessGate` | Báo cáo & Màn hình | non-nav (TV/print) |
| `/lab-dashboard` | `app/lab-dashboard/page.tsx` | Lab ops dashboard | **no `moduleKey`** (`lab_dashboard.view` unenforced); **not in NAV** | **Báo cáo & Màn hình** | orphan |
| `/lab-dashboard/tv` | `app/lab-dashboard/tv/page.tsx` | Lab TV board | `TvAccessGate` only | Báo cáo & Màn hình | non-nav (TV) |
| `/tv/:slug` | `app/tv/[slug]/page.tsx` | Public TV resolver | `TvAccessGate` only | Báo cáo & Màn hình | non-nav (TV) |
| `/weekly-report`, `/weekly-report/tv`, `/weekly-report/details` | `app/weekly-report/**` | Legacy redirect stubs | none (target re-gates) | — (keep URLs) | non-nav (redirect) |
| `/admin` (7 tabs) | `app/admin/page.tsx` | System admin | `admin` (super_admin + head_nurse-bypass) + `OnsiteAccessGate` | **Quản trị** | non-nav |

**Multi-tab pages (>1 app inside one page):** `/admin` (7: Người dùng, Cấu hình phê duyệt, Từ khóa MISA, Hệ thống, Nhật ký, Vai trò, Ngưỡng cảnh báo), `/attendance` (6: Đi muộn, Báo cáo, Lịch sử, Nhân viên, Lịch riêng, Cài đặt), `/inventory` (6: Tổng quan, Danh sách, Tiêu thụ, Nhập xuất, Kiểm kê, Bất thường), `/pharmacy` (3: Tổng quan, Danh sách, Bất thường).

---

## 3. Role/persona reality vs. needs

Nav is computed by `getVisibleNavItems()` (`src/lib/navigation.ts:60`) → `canAccessModule()` (`src/lib/permissions/access.ts:63`) over `PERMISSION_MATRIX`, plus the `FULL_ACCESS_ROLES` bypass. Mobile `BottomNav` shows only the **first 4** visible items; the rest go behind a "More" sheet (`src/components/layout/BottomNav.tsx:25-26`) — so light staff roles already push attendance/portal into overflow.

| Persona (redesign) | Roles | Nav items today | Landing | Top daily jobs | Friction today |
|---|---|---|---|---|---|
| **Lãnh đạo** | director, chairman | 9 | `/dashboard` + `directorPendingRequests`/`deptStaffCounts` widgets | Duyệt nhanh; clinic health in 3s | `valuation` (in their permission set) has **no nav entry**; approvals queue mixes all types with no seniority triage |
| **Trưởng bộ phận** | head_nurse, business_head, lab_head, pharmacy_head | 7–11 (asymmetric) | `/dashboard` + `deptPendingApprovals` | Khoa approvals; ai đi muộn; dept dashboard; material/room intake | business_head/lab_head locked out of inventory/pharmacy though `room_management.create_material_intake` is `all`; lab_head's real surface (`lab_dashboard`) invisible in nav; head_nurse = nav-super_admin but onsite-gate-denied |
| **Kế toán (primary client)** | accountant, internal_accountant | 8 each | `/dashboard` | Tồn kho value, anomalies, MISA phiếu chi, valuation; dense tables + export | `valuation` (their core report) nav-orphaned for both; both see "Phê duyệt" but internal_accountant only has `receive_handoff`, not review/approve — same label, different capability |
| **Nhân viên** | clinic/lab/pharmacy/business_staff | 6–8 | `/dashboard` | Tạo đề nghị + theo dõi; chấm công/lịch của tôi | lab_staff's only differentiator (`lab_dashboard.view`) not in nav → UI identical to clinic_staff; 6–8 items overflow into mobile "More" |
| **Quản trị** | super_admin | 11 | `/dashboard` + sync/MISA widgets | Sync health, users, config, template design | Shares nav shape 1:1 with head_nurse via bypass — redesign must decide if head_nurse is "super_admin minus onsite" or a distinct persona |

**Redesign implication:** the 5-item role-composed nav + widget-registry Home directly fix the orphan-module and same-shell-for-everyone problems. The **[Workspace]** slot (§4.1) must resolve from the role's dominant permission (Kho for KTT, Chấm công for heads, Đề nghị for staff). The head_nurse full-access vs. onsite-gate split is an **open decision to make explicit**, not inherit.

---

## 4. Duplication heatmap (ranked, LOC estimates)

| # | Duplication | Files | Est. LOC | Risk | Redesign home |
|---|---|---|---|---|---|
| 1 | `usePharmacyInventory` ≈ `useSupplyInventory` (same state/fetch/derive, differ ~240/680 lines) → one parameterized `useInventoryModule(config)` | `viewmodels/usePharmacyInventory.ts` (643), `viewmodels/useSupplyInventory.ts` (679) | ~350-400 | Med (medicine-only expiry fields; 3 consumers) | Phase 3 Kho, `src/lib/data/` |
| 2 | Page shell duplicated: tab bar, detail drawer, KPI grid, value-trend chart across pharmacy vs inventory pages | `app/pharmacy/page.tsx` (444), `app/inventory/page.tsx` (400), `PharmacyDetailDrawer.tsx` (290), `Pharmacy/InventoryKpiGrid.tsx`, `Pharmacy/InventoryCharts.tsx` | ~250+ | Med | Phase 1 `src/ui/` + Phase 3 |
| 3 | `formatVND` reimplemented 13× (identical `Intl.NumberFormat("vi-VN",…VND)`) instead of `src/lib/utils.ts:formatVND` | inventory/* (6), pharmacy/* (5), valuation, `lib/supplyInventoryKpiDetails.ts` | ~50 | Low | Phase 1 shared formatters |
| 4 | Status/anomaly-severity badges hand-rolled 8× vs the one `components/shared/Badges.tsx` (used only by requests) | attendance/ManagerTab, inventory/{page,StocktakeTab}, pharmacy/{page,DetailDrawer,InventoryTable}, requests/{page,[id]} | ~150 | Med — pharmacy folds anomalies into derived status (`lib/pharmacyInventoryPresentation.ts`), supply uses raw status; reconcile derivation before merging | Phase 1 `StatusBadge` primitive |
| 5 | KPI card shell (`bg-white rounded-2xl border…`) hand-rolled ~11× | admin/HealthTab, dashboard, inventory (4), pharmacy (2), portal, requests/[id], valuation | ~100 | Low | Phase 1 `KpiCard` |
| 6 | Tab bar markup hand-rolled 3× (identical Tailwind) | attendance/page, inventory/page, pharmacy/page | ~90 | Low | Phase 1 `TabBar` |
| 7 | `formatCompact` (tỷ/tr/k) reimplemented 7× | inventory (5), pharmacy/PharmacyCharts, `lib/labDashboardDisplayModel.ts` | ~35 | Low | Phase 1 shared formatters |
| 8 | Valuation re-fetches pharmacy `fdc_medicine_imports` last-10 inline — dup of pharmacy page's inline query → shared `useMedicineImportHistory` | `valuation/page.tsx:52-79`, `pharmacy/page.tsx:131-151` | ~40 | Low | Phase 3 |
| 9 | `formatLocalDate` (tz-safe yyyy-MM-dd) reimplemented verbatim 4× | `attendance/useAttendanceManager`, `inventory/shared`, `useImportExport`, `usePortal` | ~30 | Low | Phase 1 shared formatters |
| 10 | `ACCOUNT_LABELS` (1521/1522/1523) duplicated | `inventory/StocktakeTab.tsx`, `viewmodels/useImportExport.ts` | ~15 | Low | move to `lib/constants.ts` |

---

## 5. Data-layer seams

**Layering:** MVVM is followed everywhere except **one page-level violation** — `src/app/inventory/StocktakeTab.tsx` does inline `useState`/`useEffect`/`supabase.from().insert/update` on `fdc_stocktake_sessions`/`fdc_stocktake_items` (6 call sites). No stocktake viewmodel exists. Highest-value, lowest-risk seam: extract `useStocktake.ts` mirroring `useSupplyInventory` — props/JSX unchanged.

**Realtime:** single shared helper `src/lib/supabase-realtime.ts` (`subscribeToPostgresChanges`), 12 call sites/9 files, all cleanup-verified. No raw `channel()` outside it. Issues: (a) channel-name drift in `useImportExport.ts`/`useSupplyChart.ts`; (b) **overlap** — `useApprovals` (`public:fdc_approvals`) and `useRequests` (`public:fdc_approval_requests`) both subscribe to the same 3 tables under different channels and are mounted together (dashboard composes `useApprovals` while requests render) → two channels for the same events. The Phase-2 approval/requests merge naturally fixes this; (c) **coverage gaps** — `useRoomWorkflow` and the whole attendance domain have no realtime (manual refetch only); `RoleCatalogContext` has no realtime on `fdc_role_catalog`.

**Bridge:** HTTP via `bridgeRequest`/`buildBridgeUrl` (`src/lib/bridge-client.ts`) for `tv-access`, `sync/employees`, `sync/attendance-aggregate`, `hikvision/users/validate`, `sync/:type`, `lab-dashboard/current|details`. Bridge **health** is read from **Supabase** (`fdc_sync_health` keyed by `BRIDGE_HEALTH_ROW_ID`, `fdc_sync_logs`) via constants in `src/lib/bridge.ts` — a *different file* from `bridge-client.ts` (easy to confuse). Duplication: `weekly-report.ts` (`weeklyReportRequest`), `hikvision.ts`, and `useAdmin.ts` reimplement fetch+parse+throw with raw `fetch(buildBridgeUrl(...))` instead of `bridgeRequest`. RPC calls only 2 portal sites: `active_employee_nos_since` (attendance), `get_inventory_filtered_history` (supply).

**Contexts:** `AuthContext` and `RoleCatalogContext` are coherent single-purpose. `RoomManagementContext` has **scope creep** — simultaneously a `useRoomWorkflow` wrapper (data), a `useReducer` UI-state store (selected floor/room, drawer tab), and a presentation layer (`buildRoomSummaryMap`, `buildMaintenanceBoard`, `buildPrintableSupplyGroups` via `useMemo`). It's route-level (not app-root), which is fine, but it's a de facto feature module, not a peer context.

**No shared query/cache layer** (no react-query/SWR): ~17 viewmodels hand-roll loading, 14 hand-roll error, 23 use `useEffect` fetch-on-mount.

**Five cleanest seams for the redesign's `src/lib/data/`:**
1. Grow `useRealtimeQuery(channel, subs, fetcher)` on top of `supabase-realtime.ts` — all 12 sites adopt without changing viewmodel return shapes.
2. Typed per-domain bridge wrappers funneling through `bridgeRequest` (retire the 3 raw-fetch dups) — zero page changes.
3. Consolidate the 4 `formatLocalDate` copies + formatters into `viewmodels/{inventory,attendance}/shared.ts` / `lib/utils.ts` — pure internal.
4. Absorb `ACCOUNT_LABELS`/`TIME_RANGE_LABELS` into `lib/constants.ts` — additive.
5. Extract `useStocktake.ts` from `StocktakeTab.tsx` — the one page-level DB access, isolated.

**`fdc_*` tables by workspace:** Approvals/Requests → `fdc_approval_requests`, `fdc_approval_steps`, `fdc_request_attachments`, `fdc_request_handoffs`, `fdc_delegations`, `fdc_audit_log`, `fdc_notifications`, `fdc_push_subscriptions`, `fdc_user_mapping`. Inventory/Pharmacy → `fdc_inventory_snapshots`, `fdc_inventory_daily_value`, `fdc_analytics_anomalies`, `fdc_anomaly_thresholds`, `fdc_supply_*` (voucher_lines/inward_daily/consumption_daily/monthly_stats/item_history), `fdc_stocktake_sessions`, `fdc_stocktake_items`. Attendance → `fdc_attendance_*`, `fdc_emp_attendance` (+ bridge RPC `process_daily_attendance`). Room → `fdc_room_intakes`, `fdc_room_intake_items` (maintenance + material via `intake_type`). TV → `fdc_tv_screens` (weekly-report content is bridge-HTTP, no table). Admin → `fdc_approval_templates`, `fdc_misa_phieuchi_scan`, `fdc_misa_scan_keywords`, `fdc_sync_health`, `fdc_sync_logs`. Lab dashboard → **no tables**, 100% bridge HTTP.

---

## 6. Hardcoded-role landmines (outside matrix/catalog/authority)

The matrix is clean and central, but ≥8 files re-derive role→behavior independently. Any role rename/merge or change to the `FULL_ACCESS_ROLES`/`ONSITE_ACCESS_BYPASS_ROLES` split must sweep all of these or silently diverge:

- `src/viewmodels/useApprovals.ts` — **densest concentration** (~15 role literals): `user.role !== 'accountant'` gate (:366), `escalateTo || 'chairman'` (:509), `'super_admin'`/`'internal_accountant'` chief-accountant handoff (:603-802). **Top cleanup target.**
- `src/viewmodels/useDashboard.ts:33,142,165,204-205` + `src/app/dashboard/page.tsx:145,171,297` — widget-gating arrays (`director`/`chairman`, `['business_head','pharmacy_head','lab_head','head_nurse']`) **duplicated across viewmodel and view**. The redesign's permission-keyed widget registry must replace both. **Second cleanup target.**
- `src/lib/role-access.ts:14-27,43-55` — duplicate `ALL_ROLES` + `DEPT_HEAD_MAP` with fallback `?? 'head_nurse'`.
- `src/lib/room-management/routing.ts:33-45` — `getReviewerRoleForGroup` hardcodes per-group reviewer roles; `workflow.ts:165` fallback `|| 'head_nurse'`.
- `src/lib/approvals/workqueue.ts:36` — special-cases `approverRole === 'super_admin'`.
- `src/lib/org-chart-data.ts` + `src/components/org-chart/OrgChartTree.tsx:14-20` — static tree hardcodes all 13 role keys + leadership/dept-head arrays, separate from `role-catalog.ts`.
- `src/viewmodels/useRequests.ts:34-53,108` — hardcoded preview approval chains per leave-type + fallback `'head_nurse'`.
- `src/app/requests/[id]/page.tsx:526`, `src/app/requests/create/page.tsx:144` — inline UI role gates.
- `src/lib/approval-config.ts:82,84` — default step role `'business_head'`, default recipient `'director'`.
- `src/types/request.ts:51`, `src/types/roomWorkflow.ts:51` — role-literal unions that should reference `Role`.

**Bypass mechanics to preserve deliberately:** `FULL_ACCESS_ROLES = ['super_admin','head_nurse']` (`role-authority.ts:8`) auto-passes any action whose allow-list is `['super_admin']` (`permissions/access.ts:56-60`); `ONSITE_ACCESS_BYPASS_ROLES = ['super_admin']` (:9) gates `OnsiteAccessGate`. These two lists are the crux of the head_nurse ambiguity (§3).

---

## 7. Constraints that must NOT break

- **Every URL stays valid (PWA + bookmarks).** The redesign shell must preserve all current paths, redirecting where consolidated. Load-bearing: `/dashboard`, `/requests[/create|/:id]`, `/approvals`, `/inventory`, `/pharmacy`, `/valuation`, `/attendance`, `/org-chart`, `/portal`, `/room-management[/maintenance|/print/materials]`, `/tv-management[/weekly-report[/tv|/details]]`, `/lab-dashboard[/tv]`, `/tv/:slug`, and the 3 `/weekly-report*` redirect stubs. `App.tsx` is an SPA with `vercel.json` rewrite — deep links must keep resolving.
- **Permission matrix semantics are law.** `PERMISSION_MATRIX` (`src/lib/permissions/matrix.ts`), `canAccessModule`/`can` (`access.ts`), and both bypass lists (`role-authority.ts`) keep their exact meaning. The widget registry and 5-item nav must *derive from* the matrix, never fork it. Do not "fix" the head_nurse bypass or the onsite split as a side effect — that's an explicit open decision (§3, direction §8).
- **Router guards keep semantics.** `RequireAuth` (+ `moduleKey`), `OnsiteAccessGate` (surfaces `admin`/`tv_management`), `TvAccessGate` (network/geo). The known gaps (`/lab-dashboard`, `/valuation`, `/weekly-report*` stubs unenforced/mis-gated) are pre-existing — decide intentionally whether to tighten during the sweep, don't loosen anything.
- **Bridge HTTP contract is frozen.** Endpoint paths and shapes in `bridge-client.ts` consumers are the on-prem bridge's API; **never edit `fdc-lan-bridge` for UI reasons** (direction §7). Bridge health continues to be read from Supabase `fdc_sync_health`, not HTTP.
- **Vietnamese labels are product copy.** Nav labels (`Trang chủ`, `Đề nghị của tôi`, `Phê duyệt`, `Kho thuốc`, `Kho vật tư`, `Quản lý phòng`, `Quản lý TV`, `Sơ đồ tổ chức`, `Chấm công`, `Cá nhân`, `Quản trị`), tab names, status/severity labels, and error strings are user-facing and calibrated to clinic staff. New nav (`Hôm nay / Cần xử lý / [Workspace] / Tra cứu / Cá nhân`) is a deliberate rename — preserve the calm-clinical VN register (sentence case, plain verbs) and keep `Be Vietnam Pro`-safe diacritics.
- **Realtime discipline stays.** All subscriptions through `supabase-realtime.ts`; the approvals/requests channel overlap is *acceptable* until the Phase-2 merge removes it structurally — don't introduce raw `channel()` calls.

---

## 8. Recommended build-order inputs for Phase 1 (shell / tokens / home)

**Verified shell architecture:** `App.tsx` (all routes) → outer `RequireAuth` → `<AppShell />` (outlet) → `Sidebar` (desktop) / `BottomNav` (mobile, first-4 + More) / `TopBar` + `NotificationCenter`. Nav is data-driven from `NAV_ITEMS` via `getVisibleNavItems(role)`. Home is `dashboard/page.tsx` composing `useDashboard` (aggregator of `useApprovals`/`useRequests`/`useInventoryDashboardSummary`/`useAdmin`/attendance).

**Exact files a shell rewrite touches:**

*Navigation model (11-item → 5-item role-composed):*
- `src/lib/navigation.ts` — replace flat `NAV_ITEMS` with the 5 slots + a `[Workspace]` resolver keyed off the role's dominant permission; keep `getVisibleNavItems` signature so callers don't churn.
- `src/lib/permissions/access.ts`, `src/lib/permissions/matrix.ts` — **read-only** in Phase 1 (widget registry + workspace resolver key off them; do not change semantics).
- `src/lib/role-authority.ts` — **read-only** unless the head_nurse open decision is resolved.

*Shell components (visual + structure):*
- `src/components/layout/AppShell.tsx` — shell frame, applies tokens/paper background.
- `src/components/layout/Sidebar.tsx` — desktop 5-item nav + admin footer for `admin.view`.
- `src/components/layout/BottomNav.tsx` — mobile 5-item bar + inbox badge (retire the first-4/More overflow).
- `src/components/layout/TopBar.tsx` — greeting + VN date + sync-freshness dot.
- `src/components/layout/NotificationCenter.tsx` — folds into the "Cần xử lý" inbox model.
- `src/components/layout/RouteFallback.tsx` — restyle to token loading state.
- `src/App.tsx` — add the 5-workspace route structure + redirect stubs for consolidated paths; **preserve every existing path** and all `RequireAuth`/`OnsiteAccessGate`/`TvAccessGate` wrappers verbatim.

*New (create):*
- `src/ui/tokens.css` — the `@theme` tokens from direction §5.1 (paper/ink, brand green, status, radius/shadow, `Be Vietnam Pro`).
- `src/ui/` primitives — `PageHeader`, `KpiCard`, `DataTable`, `FilterBar`, `StatusBadge`, `TabBar`, `Drawer/Sheet`, `EmptyState`, `ChartFrame`, `InboxItem`, `ApprovalCard`, `SealMark` (zero business logic). These retire the duplication in §4 items 3–7.
- Widget registry (Home) — keyed by permission *actions* (`approvals.review_assigned`, `attendance.view_team`, `inventory.view`/`pharmacy.view`, `requests.view_own`, `admin.view`), **not** hardcoded per role — must replace the duplicated role arrays in `useDashboard.ts` + `dashboard/page.tsx` (§6).

*Home "Hôm nay" rebuild:*
- `src/app/dashboard/page.tsx` — recompose as header + inbox strip + permission-driven widget grid + good-news empty state.
- `src/viewmodels/useDashboard.ts` — feed the widget registry; strip the inline role-array gating (derive from matrix actions).

*Do NOT touch in Phase 1:* `fdc-lan-bridge/*`, the permission matrix semantics, existing feature pages (they render inside the new shell untouched per the strangler plan), bridge-client endpoints.

**Phase-1 gates (from direction §7):** `lint` · `check:bundle` · `check:pwa` · `check:auth-smoke` · per-persona screenshots. Watch the PWA/bundle gate against the `Be Vietnam Pro` woff2 subset (~90KB, open decision §8.2).

**Sequencing recommendation:** tokens.css + primitives first (unblocks everything, resolves §4 items 3–7) → nav model + shell components (preserving URLs/guards) → widget registry + Home (resolves the §6 duplication) → screenshots per persona. This orders Phase 1 so the design-system layer lands before the shell that consumes it, and the widget registry lands last since it depends on both.
