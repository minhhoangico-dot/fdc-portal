# Weekly Clinic Report — Codex Handoff Document

> **Prepared:** 2026-03-18  
> **Purpose:** Full project context for OpenAI Codex to take over management of this codebase.

---

## 1. Project Overview

**Name:** `weekly-clinic-report`  
**Type:** Full-stack web application (Next.js App Router)  
**Language:** TypeScript  
**Purpose:** A real-time dashboard for a Vietnamese outpatient clinic to display and review weekly operational statistics. The app reads from a Hospital Information System (HIS) database and shows data across five categories: Examinations, Laboratory, Imaging, Specialist Procedures, Infectious Diseases, and Patient Transfers.

The dashboard auto-refreshes every 5 minutes, supports week-by-week navigation, and has a "TV Mode" for large-screen display in the clinic.

---

## 2. Repository Layout

```
giaoban-v0/
├── weekly-clinic-report/          # ← ALL application code lives here
│   ├── app/                       # Next.js App Router pages & API routes
│   │   ├── page.tsx               # Dashboard (home page)
│   │   ├── layout.tsx             # Root layout
│   │   ├── globals.css            # Global styles + CSS variables
│   │   ├── settings/page.tsx      # Settings page
│   │   ├── report/details/        # Patient-list detail drilldown page
│   │   └── api/
│   │       ├── report/current/route.ts    # GET: fetch snapshot for a week
│   │       ├── report/generate/route.ts   # POST: generate & save snapshot
│   │       ├── report/custom/route.ts     # POST: ad-hoc date-range report
│   │       ├── report/details/route.ts    # GET: patient list for a category
│   │       ├── services/route.ts          # GET: service categories from HIS
│   │       ├── services/categories/route.ts
│   │       └── settings/icd-codes/route.ts  # CRUD: ICD10 codes
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── ServiceStatsCard.tsx       # Reusable card: name + count + trend
│   │   │   ├── InfectiousDiseaseCard.tsx  # Infectious disease table + charts
│   │   │   ├── InfectiousChart.tsx        # Recharts bar chart
│   │   │   ├── AgeGroupChart.tsx          # Recharts age-group bar chart
│   │   │   └── TransferStatsCard.tsx      # Transfer count card
│   │   ├── settings/
│   │   │   ├── IcdCodeManager.tsx         # Manage ICD10 config records
│   │   │   ├── ServiceExplorer.tsx        # Browse & configure service mappings
│   │   │   ├── CustomReportBuilder.tsx    # Ad-hoc date-range report UI
│   │   │   └── GenerateReportButton.tsx   # Trigger snapshot generation
│   │   └── ui/                            # shadcn/ui primitives (button, dialog…)
│   ├── lib/
│   │   ├── db/
│   │   │   ├── app-client.ts     # Prisma singleton → `chronic` DB (read-write)
│   │   │   └── his-client.ts     # pg Pool singleton → `pkgd` HIS DB (read-only)
│   │   ├── queries/              # Raw SQL query modules (see Section 5)
│   │   │   ├── examination.ts
│   │   │   ├── laboratory.ts
│   │   │   ├── imaging.ts
│   │   │   ├── procedures.ts     # Specialist procedures
│   │   │   ├── transfer.ts
│   │   │   └── infectious.ts     # Most complex — ICD10 + age groups
│   │   ├── scheduler.ts          # node-cron job (Sunday 23:00 auto-snapshot)
│   │   └── utils.ts              # Minor helpers
│   ├── prisma/
│   │   ├── schema.prisma         # App DB schema (5 models)
│   │   └── seed.ts               # Seed data for mappings / ICD codes
│   ├── scripts/                  # One-off exploration / migration scripts (not production)
│   ├── .env                      # Environment variables (see Section 4)
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── ecosystem.config.js       # PM2 config
│   └── his_report_logic_prompt.md  # HIS query reference doc (read this!)
└── excel_content.json            # Reference data (service mappings from Excel)
```

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.1 (App Router) |
| Language | TypeScript 5 |
| UI Library | React 19, shadcn/ui, Radix UI |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| App DB ORM | Prisma 6 (`@prisma/client`) |
| HIS DB Client | `pg` (node-postgres raw pool) |
| Scheduler | `node-cron` |
| Date utils | `date-fns` v4 (Vietnamese locale `vi`) |
| Icon set | `lucide-react` |
| Runtime | Node.js |
| Process manager | PM2 |

---

## 4. Environment Variables

File: `weekly-clinic-report/.env`

```env
# App Database (chronic) — READ-WRITE — shared app data, managed by Prisma
DATABASE_URL="postgresql://n8n:bsgd2022%40EHC@192.168.1.253:5642/chronic"

# HIS Database (pkgd) — READ-ONLY — Hospital Information System source of truth
HIS_DATABASE_URL="postgresql://n8n:bsgd2022%40EHC@192.168.1.253:5642/pkgd"
```

Both databases are on the **same PostgreSQL server** (`192.168.1.253:5642`) but different databases.

> ⚠️ **IMPORTANT:** The HIS database (`pkgd`) must **never** be written to. It is the live hospital system. All writes go to `chronic` via Prisma.

---

## 5. Database Architecture

### 5.1 App Database — `chronic` (Prisma)

Five tables, all prefixed `wcr_`:

| Model | Table | Purpose |
|---|---|---|
| `WcrReportSnapshot` | `wcr_report_snapshots` | Cached weekly report JSON blobs (unique on year+week) |
| `WcrInfectiousCode` | `wcr_infectious_codes` | Configurable ICD10 disease codes to track |
| `WcrServiceMapping` | `wcr_service_mappings` | Service name → category mappings (match by pattern) |
| `WcrAgeGroup` | `wcr_age_groups` | Age bracket configuration (0-2, 3-12, 13-18, 18-50, >50) |
| `WcrReportLog` | `wcr_report_logs` | Audit log for report generation runs |

### 5.2 HIS Database — `pkgd` (Raw SQL via `pg`)

Key tables queried (read-only):

| Table | Key Columns | Purpose |
|---|---|---|
| `tb_servicedata` | `servicedataid_master`, `servicedatausedate`, `dm_servicegroupid`, `dm_servicesubgroupid`, `patientrecordid`, `servicename` | Every service rendered to a patient |
| `tb_patientrecord` | `patientrecordid`, `receptiondate`, `dm_patientobjectid`, `dm_hinhthucravienid`, `birthdayyear` | Patient visit record |
| `tb_medicalrecord_khambenh` | `chandoanbandau_icd10` | ICD10 diagnosis codes (for infectious disease queries) |

**`dm_patientobjectid` values:**
- `1` = BHYT (National Health Insurance)
- `3` = Yêu cầu / Dịch vụ (Fee-for-service, often excluded)

**`dm_hinhthucravienid = 13`** = Patient transferred to higher-level hospital

**`servicedataid_master = 0`** = Parent/root service record (use to avoid double-counting sub-items in lab tests)

---

## 6. HIS Query Logic (Critical)

> Full reference: `weekly-clinic-report/his_report_logic_prompt.md`

All queries follow the **dual-period single-scan pattern** for performance:

```sql
-- Fetch all rows for BOTH periods in one pass
WHERE date BETWEEN $prevStart AND $currEnd
-- Then use FILTER for projection
SELECT
  COUNT(*) FILTER (WHERE date BETWEEN $currStart AND $currEnd) AS current_count,
  COUNT(*) FILTER (WHERE date BETWEEN $prevStart AND $prevEnd)  AS prev_count
```

### Service Group IDs (`dm_servicegroupid`)
| ID | Category |
|---|---|
| 1 | Examinations (Khám bệnh) |
| 3 | Laboratory (Xét nghiệm) |
| 4 | Imaging (Chẩn đoán hình ảnh) |
| 5 | Procedures/Specialist (Thủ thuật/Chuyên khoa) |

### Imaging Subgroups (`dm_servicesubgroupid`)
| ID | Modality |
|---|---|
| 401 | X-Ray (X-quang) |
| 402 | Ultrasound (Siêu âm) |
| 403 | Endoscopy (Nội soi) |
| 404 | ECG (Điện tim) |

### Specialist Subgroups
| ID | Specialty |
|---|---|
| 100000 | ENT (Tai Mũi Họng) |
| 100004 | Ear cleaning (Lấy ráy tai) |
| 501 | Dermatology (Da liễu) |
| 10001 | Vaccines |
| 100002 | Minor Surgery (Ngoại/BS) |
| 100003 | OB/GYN (Sản) |

### Laboratory Categorization
Uses `CASE` in SQL:
1. `servicename LIKE '%[G]%'` → Sent-out (Gửi ngoài)
2. `dm_patientobjectid = 1` → BHYT
3. `dm_servicesubgroupid = 303` → Hematology (Huyết học)
4. `dm_servicesubgroupid = 301` → Biochemistry (Sinh hóa)
5. `dm_servicesubgroupid = 318` → Immunology (Miễn dịch)
6. else → Other (XN Khác)

### Service Mapping (Examinations)
Examination categories are configurable via the `WcrServiceMapping` table. Each record specifies:
- `category_key`: unique slug (e.g., `kham_nhi_tw`)
- `match_type`: `contains` | `starts_with` | `regex`
- `match_value`: pattern to match against `servicename`
- `display_group`: which UI column (`kham_benh`, `xet_nghiem`, `cdha`, `chuyen_khoa`)

---

## 7. API Routes Reference

All under `/api/` (Next.js route handlers):

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/report/current?date=<ISO>` | Returns snapshot for the week of `date`. Generates on-the-fly if missing. |
| `POST` | `/api/report/generate` | Forces fresh snapshot generation for current week, saves to DB |
| `POST` | `/api/report/custom` | Ad-hoc report for arbitrary date range (no snapshot saved) |
| `GET` | `/api/report/details?category=<x>&startDate=<ISO>&endDate=<ISO>` | Raw patient list for drilldown |
| `GET` | `/api/services` | List all distinct services from HIS |
| `GET` | `/api/services/categories` | Current service mapping configuration |
| `GET/POST/PUT/DELETE` | `/api/settings/icd-codes` | Manage ICD10 infectious disease codes |

---

## 8. Frontend Pages

| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Main dashboard — 4-column layout with week navigation |
| `/settings` | `app/settings/page.tsx` | Configuration panel (ICD codes, service mappings, custom reports) |
| `/report/details` | `app/report/details/page.tsx` | Patient list drilldown for a selected category |

**Dashboard layout (4 columns):**
1. **Khám Bệnh** (Examinations) — `ServiceStatsCard`
2. **Xét Nghiệm + CĐHA** (Lab + Imaging) — two stacked `ServiceStatsCard`
3. **Chuyên Khoa + Chuyển Viện** (Specialist + Transfers) — `ServiceStatsCard` + `TransferStatsCard`
4. **Bệnh Truyền Nhiễm** (Infectious Diseases) — `InfectiousDiseaseCard`

Data auto-refreshes every **5 minutes** via `setInterval`.

---

## 9. Automated Scheduler

File: `lib/scheduler.ts`  
Initialized by: `instrumentation.ts` (Next.js instrumentation hook, runs on server start)

- **Schedule:** `0 23 * * 0` — Every Sunday at 23:00
- **Action:** Calls `POST /api/report/generate` via localhost fetch to save the week's snapshot
- **Port detection:** Uses `process.env.PORT` or defaults to `3000` (note: production runs on `9000` via PM2)

---

## 10. Deployment

### PM2 (Production)

Config file: `ecosystem.config.js`

```js
{
  name: 'weekly-clinic-report',
  script: 'node_modules/next/dist/bin/next',
  args: 'start -p 9000 -H 0.0.0.0',
  cwd: 'g:\\cursor-anti\\giaoban-v0\\weekly-clinic-report',
  interpreter: 'node',
  exec_mode: 'fork',
  instances: 1,
  max_memory_restart: '8G',
  node_args: '--max-old-space-size=8192'
}
```

### Common Commands

```powershell
# Navigate to project
cd g:\cursor-anti\giaoban-v0\weekly-clinic-report

# Install dependencies
npm install

# Run in development (port 9000)
npm run dev

# Build for production
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 process list (persist across reboots)
pm2 save

# View PM2 logs
pm2 logs weekly-clinic-report

# Restart after code changes
pm2 restart weekly-clinic-report
```

### Database Migration (Prisma)

```powershell
# Push schema changes to chronic DB
npx prisma db push

# Generate Prisma client after schema changes
npx prisma generate

# Seed initial config data
npx ts-node prisma/seed.ts
```

---

## 11. Key Conventions & Gotchas

1. **Path alias `@/`** maps to the project root (`weekly-clinic-report/`), configured in `tsconfig.json`.

2. **Vietnamese UI language** — All UI text is in Vietnamese. Column headers, labels, and toast messages are Vietnamese. Do not "fix" these to English.

3. **Scheduler port mismatch** — The scheduler defaults to port `3000` but the app runs on `9000`. If auto-generation is broken, check the `PORT` env variable or hardcode in `scheduler.ts`.

4. **`servicedataid_master = 0` constraint** — Laboratory queries **must** include this filter to count only parent lab orders, not individual sub-tests. Removing it causes massive overcounting.

5. **Week boundaries** — Weeks run **Monday → Sunday** (`weekStartsOn: 1` in date-fns). The `week_start` in snapshots is always a Monday.

6. **HIS DB is read-only** — Never add write queries against `pkgd`. The app user may only have SELECT grants.

7. **`WcrServiceMapping` is the source of truth for examination categories** — changing match patterns in the DB will immediately affect what gets counted under each heading. The `ServiceExplorer` component in Settings lets admins manage this without code changes.

8. **File size rule** — Keep all source files under 1000 lines. Target 200–500 lines. Split files by single responsibility when approaching 800 lines.

9. **Snapshot caching** — `wcr_report_snapshots` has a unique constraint on `(year, week_number)`. If a snapshot exists, `/api/report/current` returns it immediately without hitting HIS. To force a refresh, call `POST /api/report/generate` which upserts a new snapshot.

10. **`scripts/` folder** — Contains one-off diagnostic and exploration scripts. These are **not part of the application** and are safe to ignore or delete.

---

## 12. Known Issues / Areas for Improvement

- The scheduler (`lib/scheduler.ts`) calls `localhost` with a hardcoded fallback port of `3000`. In production the app is on port `9000`. The `PORT` env var is not set in the PM2 config, so auto-generation at Sunday 23:00 may silently fail unless `PORT=9000` is added to `ecosystem.config.js`.

- `CustomReportBuilder.tsx` (19 KB) and `InfectiousDiseaseCard.tsx` (13 KB) are approaching the 800-line split threshold. Consider refactoring when next touching them.

- There is no authentication. The app assumes it is internal-network only (accessed via `192.168.1.x`).

---

## 13. Contact & Context

- This is a hospital outpatient clinic reporting tool for a Vietnamese clinic.
- The HIS system is a third-party system — no source code is available for it. All integration is purely via read-only SQL queries.
- Previous development was done via Cursor AI (Antigravity agent).
- Language mix: UI / comments are Vietnamese, code identifiers are English.
