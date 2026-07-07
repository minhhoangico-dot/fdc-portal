# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**FDC Portal** is a React + Supabase web app for Phòng khám Gia Đình (a family clinic): approval workflows, inventory/pharmacy visibility, attendance, room management, weekly reports, org chart, TV dashboards, and admin. It reads data synchronized from on-prem **HIS** (Hospital Information System, PostgreSQL) and **MISA** (accounting, SQL Server) by **fdc-lan-bridge**, a separate Node.js service in this same repo. Attendance comes from Hikvision access-control devices via the bridge.

The two projects are deployed separately: the **portal** to Vercel (cloud), the **bridge** on-prem on the clinic LAN.

---

## Commands

### Portal (root)
```bash
npm run dev              # Vite dev server on http://localhost:3000 (also proxies /api/bridge → the bridge)
npm run build            # Production build
npm run preview          # Serve the production build locally
npm run lint             # Type-check only (tsc --noEmit) — there is NO portal unit-test suite
npm run check:bundle     # Enforce per-chunk JS bundle budget (scripts/check-portal-bundle-budget.mjs)
npm run check:pwa        # Enforce PWA precache size budget (scripts/check-pwa-precache-budget.mjs)
npm run check:auth-smoke # Smoke-test that authenticated routes resolve (scripts/check-authenticated-routes.ts)
npm run clean            # Remove dist/
```
`lint` is the only correctness gate on the portal side — run it after changes. `check:bundle`/`check:pwa` guard build size and will fail CI if a change bloats a chunk or the service-worker precache; keep route chunks lean.

### fdc-lan-bridge
```bash
cd fdc-lan-bridge
npm run dev                          # Run with ts-node (development)
npm run build                        # Compile TypeScript → dist/
npm start                            # Run compiled output
npm test                             # Run all tests (Jest + ts-jest)
npx jest test/unit/syncLog.test.ts   # Run a single test file
```

---

## Conventions

- **Path alias**: `@/` maps to `src/` (configured in both `tsconfig.json` and `vite.config.ts`). Always use `@/` imports in the portal, not relative paths.
- **License header**: Portal source files start with an `@license SPDX-License-Identifier: Apache-2.0` comment block. New portal files should include it.
- **Vietnamese UI**: All user-facing strings are Vietnamese. Role/status/type **labels come from catalogs and constants — never hardcode a label string** (see Authorization and `src/lib/constants.ts`).
- **Deployment**: Portal → Vercel (SPA rewrite in `vercel.json`). Bridge → on-prem.

---

## Architecture — Portal (MVVM)

Pages (`src/app/**/page.tsx`) are thin UI. Data fetching, state, and business logic live in **viewmodels** — custom hooks in `src/viewmodels/`, either a single file (`useApprovals.ts`) or a folder for larger modules (`viewmodels/attendance/`, `viewmodels/inventory/`). Viewmodels query Supabase, call the bridge, and subscribe to Supabase Realtime (Postgres Changes) for live updates.

### Providers & routing
`src/App.tsx` is the root: `<AuthProvider>` → `<RoleCatalogProvider>` → `<BrowserRouter>`. `RoomManagementProvider` wraps only the `/room-management/*` routes. **All route pages are `React.lazy()` code-split** behind a single `<React.Suspense fallback={<RouteFallback />}>`, so each page is its own chunk (this is why the bundle budget matters).

Routes fall into two groups:
- **Public / unauthenticated**: `/login`, the TV signage routes (`/tv/:slug`, `/lab-dashboard/tv`, `/weekly-report/tv`, …) — rendered outside `AppShell`.
- **Authenticated**: everything else, nested under `<RequireAuth><AppShell/></RequireAuth>`. `AppShell` provides the sidebar, top bar, and bottom nav.

### Authorization (this is central — the old "check user.role" model is gone)
Authorization is a fine-grained **action → module** permission system, not ad-hoc role checks:

- **`src/lib/permissions/matrix.ts`** — `PERMISSION_MATRIX` maps each `PermissionAction` (e.g. `approvals.approve`, `attendance.view_team`, `inventory.operate`) to `'all'` or an allowed-roles list.
- **`src/lib/permissions/access.ts`** — `can(role, action)` is the primitive. Actions are grouped into modules (`MODULE_ACCESS_ACTIONS`); `canAccessModule(role, moduleKey)` returns true if the role has any action in that module.
- **`src/lib/navigation.ts`** — `NAV_ITEMS` (the sidebar) and `getVisibleNavItems(role)`; `canRoleAccessModule` wraps `canAccessModule`.
- **`src/lib/role-authority.ts`** — `FULL_ACCESS_ROLES` (`super_admin`, `head_nurse`) bypass module gating via `hasFullPortalAdminAccess`.

Enforce access at three levels: route (`<RequireAuth moduleKey="attendance">`), and inside pages/tabs with `can(user.role, action)` (see `src/app/attendance/page.tsx` filtering its tabs). `ModuleKey` is defined in `src/types/roleCatalog.ts`; modules: `dashboard, requests, approvals, pharmacy, inventory, room_management, weekly_report, tv_management, org_chart, attendance, portal, admin` (plus `valuation`, `lab_dashboard` as permission modules).

**Roles** (`src/types/user.ts`): `super_admin, director, chairman, head_nurse, business_head, lab_head, pharmacy_head, accountant, internal_accountant, pharmacy_staff, lab_staff, business_staff, clinic_staff`. Role **display names/order/active-state are runtime-configurable** via `RoleCatalogContext` (loaded from the `fdc_role_catalog` table, falling back to `DEFAULT_ROLE_CATALOG` in `src/lib/role-catalog.ts`). Use `useRoleCatalog().getRoleLabel(...)` for labels; the raw `Role` union is the stable key.

### Access gates (`src/components/auth/`)
- **`RequireAuth`** — redirects to `/login` when unauthenticated; renders `<AccessDenied/>` when the role lacks the `moduleKey`/`roles` prop.
- **`OnsiteAccessGate surface="admin" | "tv_management"`** — gates the Admin and TV-management surfaces to **physically on-site** users: it asks the bridge (`/tv-access/check`) whether the client is on an allowed network, and if not falls back to browser **geolocation** vs. configured sites (haversine distance, `src/lib/tv-access.ts`). Only `ONSITE_ACCESS_BYPASS_ROLES` (`super_admin`) skip the check.
- **`TvAccessGate`** — protects public digital-signage routes.

### Supabase client
`src/lib/supabase.ts`, initialized from Vite env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). `AuthContext` maps the Supabase auth UID → a clinic staff record in `fdc_user_mapping` and exposes a typed `User` (with `role`, `department`, `hikvisionEmployeeId`) via `useAuth()`.

### Talking to the bridge (HTTP) — two channels
1. **Direct HTTP** via `src/lib/bridge-client.ts` `bridgeRequest(path, init)`. Base URL: in dev, the Vite proxy `/api/bridge` (configured in `vite.config.ts`, target = `VITE_BRIDGE_URL` or `http://localhost:3333`); in prod, `VITE_BRIDGE_URL` directly. Used for admin manual syncs (`POST /sync/:type`), on-site checks (`/tv-access/check`), attendance settings/employees, and the lab dashboard.
2. **Via Supabase** for health: the bridge writes a heartbeat row to `fdc_sync_health`; the portal reads it and computes staleness with `isBridgeHeartbeatStale` (`src/lib/bridge.ts`). The shared `BRIDGE_HEALTH_ROW_ID` constant **must stay identical** to `fdc-lan-bridge/src/lib/bridgeHealth.ts` — there's a comment marking this coupling.

### UI utilities & constants
`src/lib/constants.ts` (label/color maps for request types, statuses, priorities), `src/lib/utils.ts` (`cn()`, `formatVND()`, `formatDate()`, `formatTimeAgo()`). Charts use `recharts`; icons `lucide-react`; animation `motion`; Excel export `xlsx`. The app is a PWA (`vite-plugin-pwa`, push via `public/sw-push.js`).

---

## Architecture — fdc-lan-bridge (Sync Service)

Node.js microservice pulling from HIS (PostgreSQL) and MISA (SQL Server) and upserting into Supabase with the **service-role key** (unrestricted).

```
src/
├── index.ts        # Startup: validate config, test DB connections, start server + scheduler
├── server.ts       # Express: GET /health, POST /sync/:type, /tv-access/check, lab-dashboard & weekly-report endpoints
├── scheduler.ts    # node-cron registrations (see below)
├── config.ts       # Env var validation
├── db/             # his.ts (pg pool), misa.ts (mssql pool), supabase.ts (service-role client)
├── jobs/           # One file per sync task (syncInventory, syncAttendance, aggregateAttendance, syncEmployees, detectAnomalies, syncMisaSupplies, syncSupply*, generateWeeklyReport, …)
├── labDashboard/   # Lab dashboard service + loaders (queue, abnormal, reagents, TAT)
├── weeklyReport/   # Weekly-report queries (examination, imaging, laboratory, infectious, procedures, transfer) + store
├── tvAccess/       # On-site access check service
└── lib/            # logger (Winston daily-rotate), syncLog (→ fdc_sync_logs), bridgeHealth, hikvision (attendance devices), anomalyThresholds, *InventorySync
```

**Scheduler (`scheduler.ts`) — actual cron registrations:**
| Cadence | Jobs |
|---|---|
| Every 1 min | `updateHealth` (heartbeat) |
| Every 5 min | `syncMisaPayments`, `scanMisaPhieuchi` |
| Every 15 min | `syncAttendance` → `aggregateAttendance` |
| Daily 03:00 | `syncEmployees` |
| Daily 06:00 | `syncInventory` (medicine) → `syncMisaSupplies` → `detectAnomalies` → `syncPatientVolume` → `syncMedicineImports` → `syncSupplyConsumption` → `syncSupplyInward` → `syncSupplyMonthlyStats` |
| Daily 23:00 | `generateWeeklyReport` |

Any job can also be triggered on demand through `POST /sync/:type` (the Admin page uses this). Attendance backfills must **chunk per-day and throttle** — large sweeps have caused Hikvision device lag.

---

## Key Supabase Tables

All app tables are `fdc_`-prefixed. Representative, grouped by domain:

| Domain | Tables |
|---|---|
| Auth & roles | `fdc_user_mapping`, `fdc_role_catalog` |
| Approvals / requests | `fdc_approval_requests`, `fdc_approval_steps`, `fdc_approval_templates`, `fdc_request_attachments`, `fdc_request_handoffs`, `fdc_delegations`, `fdc_audit_log` |
| Notifications | `fdc_notifications`, `fdc_push_subscriptions` |
| Inventory / pharmacy | `fdc_inventory_snapshots`, `fdc_inventory_daily_value`, `fdc_medicine_imports`, `fdc_analytics_anomalies`, `fdc_anomaly_thresholds`, `fdc_supply_*` (`consumption_daily`, `inward_daily`, `monthly_stats`, `voucher_lines`, `item_history`), `fdc_stocktake_sessions` / `fdc_stocktake_items` |
| Attendance | `fdc_emp_attendance`, `fdc_attendance_employees`, `fdc_attendance_records`, `fdc_attendance_schedule`, `fdc_attendance_schedule_override` |
| Room management | `fdc_room_intakes`, `fdc_room_intake_items`, `fdc_room_intake_links` |
| TV / weekly report | `fdc_tv_screens` (weekly-report data is bridge-generated) |
| MISA scanning | `fdc_misa_phieuchi_scan`, `fdc_misa_scan_keywords` |
| Bridge health | `fdc_sync_health`, `fdc_sync_logs` |

SQL migrations for schema changes live in `sql/` at the repo root.

---

## Environment Setup

**Portal** (`.env.local`, based on `.env.example`):
```
VITE_SUPABASE_URL=https://supabase.fdc-nhanvien.org
VITE_SUPABASE_ANON_KEY=
VITE_VAPID_PUBLIC_KEY=            # push public key
VITE_BRIDGE_URL=https://bridge.fdc-nhanvien.org   # bridge base URL (dev proxy target for /api/bridge)
```

**Bridge** (`fdc-lan-bridge/.env`, based on its `.env.example`):
```
SUPABASE_URL=http://192.168.1.9:8000
SUPABASE_SERVICE_ROLE_KEY=
HIS_DB_HOST= HIS_DB_PORT= HIS_DB_NAME= HIS_DB_USER= HIS_DB_PASSWORD=
MISA_DB_SERVER= MISA_DB_PORT= MISA_DB_NAME= MISA_DB_USER= MISA_DB_PASSWORD=
HIKVISION_HOST= HIKVISION_USERNAME= HIKVISION_PASSWORD=
PORT=3333
```

---

## Workflow Orchestration

- For any non-trivial task, read `WORKFLOW.md` before implementation.
- Use `tasks/todo.md` as the live checklist, `tasks/active/` for task specs, and `tasks/handoffs/` for continuation notes between agents.
- Read `tasks/lessons.md` before similar work and append a new lesson after any user correction or avoidable miss.
- Use `tasks/decisions.md` for durable architecture and process choices.
- Use `agents/registry.yaml` to split work into non-overlapping write scopes.
