# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**FDC Portal** is a React + Supabase web app for approval workflows, inventory visibility, and operational dashboards for Phòng khám Gia Đình (a family clinic). It connects to data synchronized from on-prem HIS (Hospital Information System) and MISA (accounting) via **fdc-lan-bridge**, a separate Node.js bridge service in this repo.

---

## Commands

### Portal (root)
```bash
npm run dev        # Dev server on http://localhost:3000
npm run build      # Production build
npm run lint       # TypeScript type-check (tsc --noEmit)
npm run clean      # Remove dist/
```

### fdc-lan-bridge
```bash
cd fdc-lan-bridge
npm run dev        # Run with ts-node (development)
npm run build      # Compile TypeScript
npm start          # Run compiled output
npm test           # Run all tests (Jest + ts-jest)
npx jest test/unit/syncLog.test.ts   # Run a single test file
```

---

## Conventions

- **Path alias**: `@/` maps to `src/` (configured in both `tsconfig.json` and `vite.config.ts`). Always use `@/` imports, not relative paths.
- **License header**: Source files use `@license SPDX-License-Identifier: Apache-2.0` comment at the top.
- **Deployment**: Portal deploys to Vercel (SPA rewrite in `vercel.json`). The bridge runs on-prem.

---

## Architecture

### Portal: MVVM Pattern

Pages (`src/app/**/page.tsx`) are thin UI components. All data fetching, state, and business logic live in **viewmodels** (`src/viewmodels/use*.ts`), which are custom React hooks that query Supabase and manage local state.

- **AuthContext** (`src/contexts/AuthContext.tsx`) is the root session manager. It maps a Supabase auth UID to a clinic staff record via the `fdc_user_mapping` table and exposes a typed `User` object (with `role`, `department`, etc.) via `useAuth()`.
- **AppShell** wraps all authenticated routes; it contains the sidebar, top bar, and bottom nav.
- **Routing** (`src/App.tsx`): `<AuthProvider>` → `<BrowserRouter>` → routes. All non-login routes are children of AppShell.
- **Supabase client** (`src/lib/supabase.ts`): initialized with Vite env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Viewmodels also subscribe to Supabase Realtime (Postgres Changes) for live updates.
- **Role-based UI**: Pages check `user.role` to show different content. Roles: `super_admin`, `director`, `chairman`, `dept_head`, `accountant`, `staff`, `doctor`.
- **Constants** (`src/lib/constants.ts`): label/color mappings for request types, statuses, priorities, roles — use these for UI display, not raw strings.
- **Utilities** (`src/lib/utils.ts`): `cn()` (Tailwind class merge), `formatVND()`, `formatDate()`, `formatTimeAgo()`.

### fdc-lan-bridge: Sync Service

A Node.js microservice that pulls data from HIS (PostgreSQL) and MISA (SQL Server) and upserts it into Supabase.

```
src/
├── index.ts        # Startup: validates config, tests DB connections, starts server + scheduler
├── server.ts       # Express: GET /health, POST /sync/:type
├── scheduler.ts    # node-cron jobs (1min heartbeat, 5min MISA, 15min attendance, 6am daily batch)
├── config.ts       # Env var validation
├── db/
│   ├── his.ts      # PostgreSQL pool (HIS)
│   ├── misa.ts     # MSSQL pool (MISA)
│   └── supabase.ts # Supabase client (service role key — unrestricted)
├── jobs/           # Individual sync tasks (syncInventory, syncAttendance, detectAnomalies, etc.)
└── lib/
    ├── logger.ts   # Winston with daily rotation
    ├── syncLog.ts  # Records sync attempts to fdc_sync_logs
    └── hikvision.ts # Hikvision access control API
```

The portal's Admin page talks to the bridge via its HTTP endpoints (`/health`, `/sync/:type`) to show bridge status and trigger manual syncs.

---

## Key Supabase Tables

| Table | Purpose |
|---|---|
| `fdc_user_mapping` | Maps Supabase auth UID → clinic staff (role, department) |
| `fdc_approval_requests` / `fdc_approval_steps` | Approval workflow |
| `fdc_notifications` | In-app notifications |
| `fdc_inventory_snapshots` / `fdc_inventory_daily_value` | Stock data from HIS |
| `fdc_analytics_anomalies` | Detected stock anomalies |
| `fdc_sync_health` / `fdc_sync_logs` | Bridge heartbeat & sync history |
| `fdc_approval_templates` | Configurable workflow templates |
| `fdc_delegations` | Approval authority delegation |
| `fdc_audit_log` | Audit trail |
| `fdc_misa_phieuchi_scan` / `fdc_misa_scan_keywords` | MISA payment voucher scanning |

---

## Environment Setup

**Portal** (`.env.local` based on `.env.example`):
```
VITE_SUPABASE_URL=https://supabase.fdc-nhanvien.org
VITE_SUPABASE_ANON_KEY=
VITE_VAPID_PUBLIC_KEY=
```

**Bridge** (`fdc-lan-bridge/.env` based on `.env.example`):
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
