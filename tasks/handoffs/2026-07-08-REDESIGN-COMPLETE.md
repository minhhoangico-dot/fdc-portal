# FDC Portal Redesign — COMPLETION REPORT

- **Date**: 2026-07-08 · **Branch**: `codex/portal-presentation-refactor` · **Author**: Phase 4c finalizer (Opus 4.8)
- **Direction doc**: `tasks/active/2026-07-08-ux-redesign-user-centric.md` (user-centric shell; brand tokens are law)
- **Status**: **COMPLETE across Phases 1 → 4c.** All offline gates green on the finalized tree. One item deferred (full data-hook merge, live-auth-gated). Everything is in the **working tree only** — nothing committed/staged by this workstream.

---

## 0. TL;DR

The portal was rebuilt from a role-hardcoded, page-per-feature layout into a **user-centric v2 shell**: a single "Hôm nay" Home, one unified **Cần xử lý** inbox, a two-lens **Phê duyệt & Đề nghị** workspace, and one unified **Kho & Dược** workspace — all reskinned onto a single `src/ui/*` + brand-token design system. Legacy `/requests`, `/approvals`, `/pharmacy`, `/inventory`, `/valuation` pages were retired (flipped to the new surfaces or redirected). Permission-matrix semantics and `head_nurse` authority were preserved throughout. The redesign is offline-proven; it needs a **live-auth numeric/behaviour sign-off before deploy** (auth is env-blocked here).

---

## 1. Phase-by-phase — what shipped

### Phase 1 — Shell / Home "Hôm nay"
- **v2 nav model**: primary nav is always exactly **5 canonical slots** — `[home, inbox, workspace, reference, personal]` — resolved per role via `getPrimaryNav(role)`; reachability guaranteed for all 13 roles.
- **Home rewrite** (`src/app/dashboard/page.tsx`): greeting + VN long date + bridge sync-dot → inbox strip → widget grid driven by a `HOME_WIDGETS` registry (`src/lib/home-widgets.ts`) keyed by permission action, each `React.lazy` code-split. Replaced all role-hardcoded dashboard blocks.
- **New viewmodel** `useHomeToday.ts`; **deleted** the dead `useDashboard.ts` (was nothing but the audit-flagged hardcoded role arrays).
- **Badge wiring**: nav inbox slot renders the actionable count from `useActionableCount()`.

### Phase 2 — Flow (unified inbox + two-lens workspace + SealMark)
- **`/inbox`** ("Cần xử lý", NEW): one list unifying pending approval work + unread notifications; `buildInbox` maps 1:1 over the same three work-queue arrays the badge sums, so **list length == badge count** (enforced by `inboxCount.test.ts`). Optimistic approve/dismiss with rollback.
- **`/workflow`** (WorkflowWorkspace, NEW): two lenses "Của tôi" / "Chờ tôi" (`CuaToiLens` ≡ old RequestsPage, `ChoToiLens` ≡ old ApprovalsPage), reskinned onto `ui/*`. Parked in Phase 2; flipped in Phase 4b.
- **SealMark** primitive + **`/requests/:id/print`** print sheet: the seal renders only when a request `isFullyApproved` (restraint confirmed); lists/pending use `StatusBadge`.
- Nav inbox slot repointed to `/inbox`; pure-staff workspace slot resolves to `/requests`.

### Phase 3 — Kho & Dược (unified inventory workspace)
- **`/kho`** (KhoWorkspace, NEW): one URL-driven workspace (`?wh=thuoc|vat-tu`, `?tab=tong-quan|danh-sach|gia-tri|bat-thuong`) covering pharmacy + supply + valuation + anomalies. Enabled-dual-hook: mounts both `usePharmacyInventory`/`useSupplyInventory` but enables only the active warehouse — **no data-hook merge**, numbers read from the same unedited hooks that drove the legacy pages.
- **New primitives** `src/ui/DataTable.tsx` (pure passthrough sortable table) + `src/ui/ChartFrame.tsx` (recharts chrome + brand presets). Parked (reachable by direct URL), not yet flipped. **No-drift verdict: zero data-logic change.**

### Phase 4a — Reskin sweep (presentation only)
- 18 existing authenticated surfaces re-skinned onto `src/ui/*` + brand tokens with **every data viewmodel consumed verbatim** (signature freeze): full Admin shell + 7 tabs + 3 modals, Kho parity (KhoDetailDrawer mounted for both warehouses), and the authenticated Báo cáo & Màn hình management surfaces (lab-dashboard light chrome, weekly-report management workspace + details screen, admin WeeklyReport/TvScreens tabs). No route flips, no `App.tsx`, no `navigation.ts`. No frozen viewmodel touched; no stray data calls introduced.

### Phase 4b — Flip · Retire · Hoist · Router-gap tighten
- **Flip**: `/requests` → `WorkflowWorkspace defaultLens="cua-toi"`; `/approvals` → `defaultLens="cho-toi"`; `/inventory` → redirect `/kho?wh=vat-tu`; `/pharmacy` → redirect `/kho?wh=thuoc`; `/valuation` → `ValuationRedirect` (→ `/kho?...&tab=gia-tri`).
- **Retire** (5 page deletions): `src/app/{requests,approvals,pharmacy,inventory,valuation}/page.tsx`. Presentation children (`inventory/*Tab.tsx`, `pharmacy/Pharmacy*.tsx`) preserved verbatim, mounted by KhoWorkspace.
- **Hoist**: new `ActionableDataContext` mounts one `useApprovals` + one `useNotifications` in `AppShell`; both the badge (`useActionableCount`) and `useInbox` now read the SAME reference — count agreement holds by construction, duplicate realtime channels collapsed.
- **Router-gap tighten**: `/lab-dashboard` gated `moduleKey="lab_dashboard"`; in-shell `/weekly-report` gated `moduleKey="weekly_report"` (closes accidental-URL reach; no legitimate role loses access).
- **Access delta**: nobody-legitimate gained or lost access; the only removals are accidental-URL reach on the two previously-ungated routes.

### Phase 4c — Finalize (this phase)
- **Item A — safe pure-compute extraction (EXTRACTED + PROVEN):** the 4 byte-identical inventory-compute `useMemo` bodies lifted into `src/viewmodels/inventory/compute.ts` (`sumInventoryValue`, `filterAnomaliesToInventory`, `sortInventoryItems`, `buildSnapshotHistory`); both hooks delegate with identical deps. Proven byte-identical for both warehouse shapes by `inventoryComputeCharacterization.test.ts` (6/6). The **full behavioral hook merge stays DEFERRED** (§3).
- **Item B — two safe fixes**: `navigation.ts` weekly_report reference-link repoint `/tv-management/weekly-report` → `/weekly-report`; `portal-auth-smoke.ts` `expectedUrlPath` added for the `/inventory` + `/pharmacy` flip redirects.
- All gates green (lint 0 · build 0 · bundle 0 · pwa 0 · auth-smoke env-block · unit 108/108).

---

## 2. New / removed / changed surfaces + routes

### New routes / surfaces
| Route / surface | What |
|---|---|
| `/dashboard` (rewritten) | "Hôm nay" Home — registry-driven widget grid, greeting, inbox strip, sync dot |
| `/inbox` | Unified "Cần xử lý" — approval work + unread notifications, list==badge |
| `/workflow` | WorkflowWorkspace two-lens (Của tôi / Chờ tôi); also the target of the `/requests` + `/approvals` flip |
| `/requests/:id/print` | Print sheet with SealMark (fully-approved only) |
| `/kho` | Unified Kho & Dược workspace — `?wh=thuoc\|vat-tu`, `?tab=tong-quan\|danh-sach\|gia-tri\|bat-thuong` |
| `src/ui/*` primitives | New design-system components: DataTable, ChartFrame, SealMark, ApprovalCard, InboxItem, KpiCard, TabBar, StatusBadge, WidgetCard, PageHeader, EmptyState, DataTable, etc. |

### Retired / redirected routes (Phase 4b)
| Route | After | Deleted page |
|---|---|---|
| `/requests` | `WorkflowWorkspace defaultLens="cua-toi"` | `src/app/requests/page.tsx` |
| `/approvals` | `WorkflowWorkspace defaultLens="cho-toi"` | `src/app/approvals/page.tsx` |
| `/pharmacy` | redirect → `/kho?wh=thuoc` | `src/app/pharmacy/page.tsx` |
| `/inventory` | redirect → `/kho?wh=vat-tu` | `src/app/inventory/page.tsx` |
| `/valuation` | `ValuationRedirect` → `/kho?...&tab=gia-tri` | `src/app/valuation/page.tsx` |
| (Phase 1) `useDashboard.ts` | replaced by registry | `src/viewmodels/useDashboard.ts` (deleted) |

### Gating / nav changes
- Primary nav → v2 5-slot model `[home, inbox, workspace, reference, personal]`; **weekly_report no longer a top-level nav item**.
- Nav inbox slot → `/inbox`; KTT workspace slot → `/kho`.
- `/lab-dashboard` now gated `moduleKey="lab_dashboard"`; in-shell `/weekly-report` gated `moduleKey="weekly_report"`.
- weekly_report reference (Tra cứu) link → `/weekly-report` (Phase 4c fix).

### Preserved verbatim (NOT reskinned / NOT touched)
- All **TV / display** targets keep their dark theme: `src/app/tv/**`, `lab-dashboard/tv/**`, `weekly-report/tv/**`, `tv-management/weekly-report/tv/**`; `WeeklyReportTvScreen`, `LabDashboardDisplay`, `LabDashboardDetailScreen`.
- Inventory presentation children (`app/inventory/{Overview,Consumption,ImportExport,Stocktake}Tab.tsx`, `app/pharmacy/Pharmacy*.tsx`) — mounted by KhoWorkspace.
- **Frozen for this workstream**: `src/**/attendance/**`, `src/types/attendance.ts`, `fdc-lan-bridge/**`, `sql/**` (a separate bundled attendance workstream, present at session start, untouched).

---

## 3. Deferred item — full data-hook MERGE (live-auth-gated)

**What is deferred.** Unifying `usePharmacyInventory` + `useSupplyInventory` into one parameterized `useInventoryModule(config)` — the parts that genuinely DIFFER between warehouses (the two fetch/query/realtime pipelines; pharmacy `matchesPharmacyInventoryFilterStatus` vs supply inline status logic). Phase 4c shipped only the safe byte-identical *intersection* (`compute.ts`), proven offline; the differing filter/status seam cannot be covered by an offline byte-identity proof, so the merge waits for live numbers.

**Live-auth recipe:**
1. Live portal + seeded KTT login → four numeric side-by-sides to the digit: `/pharmacy`⟷`/kho?wh=thuoc`, `/inventory`⟷`/kho?wh=vat-tu`, `/valuation?module=pharmacy`⟷`/kho?wh=thuoc&tab=gia-tri`, `?module=inventory`⟷`/kho?wh=vat-tu&tab=gia-tri` (KPIs, `filteredValue` + row count, top-10 order/values, trend endpoints, anomaly counts, drawer estimate + import history).
2. Only then unify into `useInventoryModule(config)` — the shared math already lives in `compute.ts`, so the merge is the fetch + filter-status seam only.
3. Re-run all gates + a fresh live numeric side-by-side after the merge.

---

## 4. Standing caveat — flips are live-wired but need a live-auth sign-off before deploy

All offline gates are green, but **no live-auth numeric/behaviour sign-off has been run** — auth is env-blocked here (`check:auth-smoke` needs `PORTAL_SMOKE_BASE_URL`; project memory: self-hosted Supabase auth-migration gap → portal logins currently 400). Before production, on a live portal with a seeded KTT login:
- **KTT inventory numeric side-by-side** (§3 step 1) — authorizes the `/kho` flips.
- **Approval E2E on a phone viewport** — Của tôi / Chờ tôi click-through at flipped `/requests` + `/approvals`; confirm badge decrement + optimistic dismiss.
- **`npm run check:auth-smoke`** with env vars set — now covers the flip redirects via the Item-B `expectedUrlPath`.

The flips are wired and offline-green; this live sign-off is the last gate before deploy. Full per-phase revert recipes live in each phase's status doc (4b §10 for the flip; 4c §5 for the extraction).

---

## 5. Final gate snapshot (finalized tree, Phase 4c)

| Gate | Result |
|---|---|
| `npm run lint` | PASS (exit 0) |
| `npm run build` | PASS (3384 modules, ✓ 5.16s, PWA 77 entries) |
| `npm run check:bundle` | PASS |
| `npm run check:pwa` | PASS (77 entries, XLSX excluded) |
| `npm run check:auth-smoke` | ENV-BLOCK (expected) |
| `npx tsx --test test/unit/*.ts test/unit/*.tsx` | PASS — 108/108 |

Named suites: navReachability 5/5 · inboxCount 3/3 · inventoryComputeCharacterization 6/6 · navigation 7/7 · authenticatedRouteSmoke 3/3.

---

## 6. Handoff index (per-phase detail)
- `tasks/handoffs/2026-07-08-phase1-shell-status.md`
- `tasks/handoffs/2026-07-08-phase2-flow-status.md`
- `tasks/handoffs/2026-07-08-phase3-kho-status.md`
- `tasks/handoffs/2026-07-08-phase4a-reskin-status.md`
- `tasks/handoffs/2026-07-08-phase4b-flip-status.md`
- `tasks/handoffs/2026-07-08-phase4c-finalize-status.md`
- **this doc**: `tasks/handoffs/2026-07-08-REDESIGN-COMPLETE.md`
