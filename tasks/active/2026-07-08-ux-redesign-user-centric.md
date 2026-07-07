# UX Redesign: User-Centric FDC Portal — Direction (v1)

- **Date**: 2026-07-08
- **Author**: Fable 5 (design direction) → execution continues on Opus 4.8
- **Status**: Direction approved-pending-open-decisions (§8). Execution phased (§7).
- **Companion**: `tasks/handoffs/2026-07-08-ux-audit-current-state.md` (current-state audit, written by background agents — read it before Phase 1 coding).

---

## 1. Diagnosis (why this exists)

The portal grew by accretion — several projects stapled together. Concrete symptoms:

- **Module-first, not user-first nav**: 11 top-level nav items = a directory of systems. A nurse and the chief accountant see nearly the same shell.
- **One workflow, two modules**: `requests` (my requests) and `approvals` (needs me) are two pages over the *same* `fdc_approval_requests` object.
- **Three near-identical dashboard stacks**: `pharmacy/*` + `usePharmacyInventory` (~600 LOC), `inventory/*` + `useSupplyInventory` (~650 LOC), plus `dashboard` and `valuation` — same KPI/chart/table pattern, copy-pasted (identical `tỷ` formatters, twin Charts components).
- **Layer leaks**: pages call `supabase.from()` directly (StocktakeTab, valuation, pharmacy page…); realtime-channel boilerplate re-implemented per viewmodel.
- **Non-daily surfaces pollute nav**: TV displays, print views, weekly-report management, admin — mixed in with daily work.
- **No design system**: ad-hoc Tailwind per page; indigo `#4f46e5` default; badges/tabs/KPI cards each hand-rolled.

## 2. Users & jobs (the center of the redesign)

| Persona | Roles | Top jobs (daily) | Device |
|---|---|---|---|
| **Lãnh đạo** | director, chairman | Duyệt nhanh đề nghị; sức khỏe phòng khám trong 3 giây | Phone |
| **Trưởng bộ phận** | head_nurse, business_head, lab_head, pharmacy_head | Ai đi muộn hôm nay; hàng đợi đề nghị của khoa; dashboard khoa | Phone + desktop |
| **Kế toán (primary client)** | accountant, internal_accountant | Giá trị tồn kho, bất thường, phiếu chi MISA, valuation; bảng dày + export | Desktop |
| **Nhân viên** | clinic/lab/pharmacy/business_staff | Tạo đề nghị, theo dõi trạng thái; chấm công/lịch của tôi | Phone only |
| **Quản trị** | super_admin | Sync health, users, cấu hình | Desktop, occasional |

## 3. Design principles

1. **Role-first**: opening the app shows *your* work, never a menu of systems.
2. **One inbox**: everything awaiting *you* (bước duyệt, bàn giao, thông báo) in one list, one interaction pattern.
3. **Three-second answers**: every screen answers its persona's top question with zero interaction; drill-down second.
4. **One design language**: a table/badge/tab is identical in Kho, Chấm công, Phê duyệt.
5. **Calm clinical Vietnamese**: plain VN verbs, sentence case; color = meaning, never decoration.
6. **Respect the mess**: strangler migration behind a new shell; URLs and the permission matrix never break.

## 4. New information architecture

### 4.1 Primary nav — exactly 5 (bottom bar mobile / sidebar desktop)

1. **Hôm nay** — role-composed home (§4.3)
2. **Cần xử lý** — unified inbox, badge = count (§4.4)
3. **[Workspace]** — the persona's main workspace (Kho for KTT; Chấm công for heads; Đề nghị for staff) — resolved from role's dominant permission
4. **Tra cứu** — everything referential: báo cáo tuần, sơ đồ tổ chức, lab dashboard, màn hình TV
5. **Cá nhân** — portal/attendance-self/settings

Admin = control room, reachable from Cá nhân + desktop sidebar footer for `admin.view` roles only. TV/print routes keep URLs but leave nav entirely.

### 4.2 Module consolidation (15+ surfaces → 6 workspaces)

| New workspace | Absorbs (current) | Notes |
|---|---|---|
| **Phê duyệt & Đề nghị** | requests, approvals | One object, two lenses: "Của tôi" / "Chờ tôi". Highest-value merge. |
| **Kho & Dược** | pharmacy, inventory, valuation, stocktake | One workspace, warehouse switcher (Thuốc/Vật tư); ONE Kpi/Chart/Table stack. |
| **Nhân sự** | attendance, org-chart, portal(self) | Manager tabs vs self view by permission. |
| **Vận hành** | room-management (+maintenance, print) | Largely as-is, reskinned. |
| **Báo cáo & Màn hình** | weekly-report, lab-dashboard, tv-management | Reports are content; TVs are display targets — config lives in Quản trị. |
| **Quản trị** | admin, sync health | Control room. |

### 4.3 Home "Hôm nay" (the main UI)

Composition, top→bottom:
1. **Header**: greeting + VN date ("Thứ Ba, 8 tháng 7") + sync-freshness dot (bridge heartbeat).
2. **Inbox strip**: "Cần xử lý · N" — tap → inbox. The number is the day's pull.
3. **Widget grid** — from a **registry keyed by permission actions** (never hardcoded per role):
   - `approvals.review_assigned` → "Chờ bạn duyệt" (top 3 cards, inline Duyệt/Từ chối)
   - `attendance.view_team` → "Đi muộn hôm nay" list
   - `inventory.view`/`pharmacy.view` → "Tồn kho" KPI + anomaly count
   - `requests.view_own` → "Đề nghị của tôi" status chips
   - `admin.view` → bridge health tile
Empty state: "Hôm nay chưa có việc cần bạn xử lý ✓" — an empty inbox is good news and should look like it.

### 4.4 Inbox "Cần xử lý"

Single list; filter chips `Tất cả / Phê duyệt / Bàn giao / Thông báo`. Item = type icon · title · meta (từ ai · bao lâu) · inline primary action (swipe on mobile, buttons desktop). Sources: pending `fdc_approval_steps` + `fdc_request_handoffs` + unread `fdc_notifications`. Acting on an item removes it optimistically.

## 5. Design system — "FDC UI"

**Identity thesis**: the visual language of Vietnamese clinical paperwork — warm paper surfaces, ink text, a deep pharmacy-green brand, and the **con dấu đỏ** as the signature mark of approval. Deliberately NOT the indigo-SaaS default this codebase has now.

### 5.1 Tokens (Tailwind 4 `@theme`, in `src/ui/tokens.css`)

```css
@theme {
  --font-sans: "Be Vietnam Pro", system-ui, "Segoe UI", sans-serif; /* built for VN diacritics */
  /* Paper & ink (warm, not blue-gray) */
  --color-paper: #FAFAF7;      /* app background */
  --color-card: #FFFFFF;
  --color-ink-900: #201D1A;    /* primary text */
  --color-ink-600: #5C564E;    /* secondary */
  --color-ink-400: #A39C92;    /* muted/disabled */
  --color-line: #EAE7E1;       /* borders */
  /* Brand: deep VN-pharmacy green (viridian) */
  --color-brand-50: #EFFAF4; --color-brand-100: #D7F2E4;
  --color-brand-500: #10896B; --color-brand-600: #0B7A5C;
  --color-brand-700: #0A6650; --color-brand-900: #07402F;
  /* Status — meaning only */
  --color-ok-600: #0B7A5C;     /* success shares brand family */
  --color-warn-600: #B45309; --color-warn-100: #FEF3C7;
  --color-danger-600: #C8321E; /* vermilion ink — danger AND the seal (see 5.3) */
  --color-info-600: #0369A1;  --color-info-100: #E0F2FE;
  /* Shape & rhythm */
  --radius-card: 1rem; --radius-field: 0.625rem; /* keep existing rounded-2xl friendliness */
  --shadow-card: 0 1px 2px rgb(32 29 26 / 0.06);
}
```

Type scale: 13 / 14(base) / 16 / 18 / 22 / 28, display 34 (Home greeting only). Weights 400/500/600/700 — one family, weight does the pairing work (PWA bundle discipline; no second font). Financial tables set `font-variant-numeric: tabular-nums`. Spacing on a 4px grid. Motion: 150ms ease-out micro-interactions; ONE orchestrated moment = Home load stagger (header → strip → widgets); `prefers-reduced-motion` respected. Light theme only for the app; TV routes keep their own dark theme.

### 5.2 Component inventory (`src/ui/`, zero business logic)

`PageHeader` · `KpiCard` · `DataTable` (sortable, sticky header, export hook, `density="compact"` for accounting) · `FilterBar` · `StatusBadge` (single source of status colors) · `TabBar` · `Drawer/Sheet` · `EmptyState` · `ChartFrame` (recharts wrapper: one palette, one tooltip) · `InboxItem` · `ApprovalCard` · `SealMark` (§5.3).

### 5.3 Signature element — the seal (dấu)

The one aesthetic risk, spent in one place: a **fully-approved request's detail view (and its export/print) carries a circular seal mark** — `SealMark`: vermilion `--color-danger-600` ring, slight rotation, approver + date inside — the visual grammar of a VN document made official. Restraint rules: never in lists (lists use `StatusBadge`), never animated, never for any state except *hoàn tất phê duyệt*. Context (circular seal vs rectangular badge) keeps red-as-danger unambiguous elsewhere.

## 6. Target code architecture (directional — Opus details in Phase specs)

```
src/ui/            tokens.css + primitives (no business logic, no supabase)
src/features/<ws>/ pages + viewmodels + api per workspace (kills the flat 30-file viewmodels/)
src/lib/data/      ONE typed data layer: query fns, realtime helper (subscribe once,
                   dedupe channel boilerplate), shared formatters
src/lib/permissions/  unchanged semantics — the matrix is law; widget registry keys off it
```
Routing shell v2 preserves every existing URL (redirects where consolidated) — PWA installs and bookmarks keep working.

## 7. Migration phases (strangler — each phase ships alone)

| Phase | Scope | Gate |
|---|---|---|
| **1. Shell** | `src/ui` tokens + primitives; AppShell v2 (5-item nav, inbox badge); Home "Hôm nay" + widget registry; old pages render inside new shell untouched | lint · check:bundle · check:pwa · check:auth-smoke · screenshots per persona |
| **2. Flow** | Phê duyệt & Đề nghị merge (inbox + two lenses + SealMark) | same + approval E2E on phone viewport |
| **3. Kho** | pharmacy/inventory/valuation consolidation onto shared stack (biggest dedup, KTT's workspace) | same + KTT desktop review |
| **4. Sweep** | Nhân sự, Báo cáo & Màn hình, Quản trị control room; retire dead routes/components | same + route-redirect audit |

Rules: never edit `fdc-lan-bridge` for UI reasons; never change permission matrix semantics; every phase leaves a handoff in `tasks/handoffs/`.

**Known gaps confirmed by audit (fix intentionally, never as side effects)**: `/lab-dashboard` + `/weekly-report*` routes carry no `moduleKey`; `/valuation` is gated by `inventory` instead of `valuation.view`; role→behavior arrays are hardcoded in ≥8 files (densest `useApprovals.ts`, duplicated `useDashboard.ts`+`dashboard/page.tsx`) — the widget registry replaces these; `StocktakeTab.tsx` writes to Supabase directly. Full detail + exact shell file-set: audit §8.

## 8. Open decisions for Minh (defaults proceed unless overridden)

1. **Brand green + seal red** (replaces indigo) — default: yes.
2. **Be Vietnam Pro** self-hosted (~90KB woff2 subset) — default: yes.
3. Nav labels: `Hôm nay / Cần xử lý / [Workspace] / Tra cứu / Cá nhân` — default: yes.
4. Weekly-report: inside "Tra cứu" (default) or its own nav slot for leadership?
5. **head_nurse authority** (audit finding): today `FULL_ACCESS_ROLES` makes head_nurse a de-facto second super_admin, yet `OnsiteAccessGate` denies them `/admin` off-site — contradiction. Keep full bypass, or scope head_nurse to clinical modules? Default: keep current behavior in Phases 1-3, decide before Phase 4.

## 9. Continuation protocol (for Opus / any successor)

1. Read this doc + the audit handoff + `tasks/lessons.md` + `tasks/decisions.md`.
2. Write `tasks/active/2026-07-08-phase1-shell.md` spec (from template) before coding.
3. Build Phase 1 exactly per §5 tokens/§4.3 Home; use Workflow (sonnet for mechanical work, opus for shell design-sensitive code); verify per §7 gates; screenshot evidence into `tasks/handoffs/`.
4. On user approval of a phase → append the durable choices to `tasks/decisions.md`.
