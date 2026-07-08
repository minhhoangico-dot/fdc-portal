# Phase 3 — Kho & Dược: integrator + verification handoff

- **Date**: 2026-07-08 · **Role**: integrator (post-wave) · **Spec**: `tasks/active/2026-07-08-phase3-kho.md`
- **THE ONE RULE**: KTT financial workspace, live-auth blocked → numbers must be **provably unchanged**. Verdict below: **no data-logic drift**.

---

## 1. Shipped files

### New primitives (primitivesWave — pre-existing, untouched by integrator)
- `src/ui/DataTable.tsx` — controlled, pure-passthrough sortable table (no internal sort/derive).
- `src/ui/ChartFrame.tsx` — recharts chrome + `ValueTrendChart` / `TopMaterialsChart` presets + one palette/tooltip.

### New Kho workspace (reskinWave — pre-existing, untouched by integrator)
- `src/app/kho/KhoWorkspace.tsx` — orchestrator; enabled-dual-hook (`usePharmacyInventory`/`useSupplyInventory`), URL-driven `?wh=`/`?tab=`.
- `src/app/kho/khoTabs.ts` — warehouse + sub-tab model / coercers.
- `src/app/kho/KhoOverviewView.tsx` + `KhoKpiRow.tsx` — Thuốc KPI+charts+anomaly-preview; Vật tư mounts legacy `OverviewTab` verbatim.
- `src/app/kho/KhoInventoryListView.tsx` + `khoInventoryColumns.tsx` + `KhoFilterBar.tsx` — list chart + filters + DataTable (per-warehouse columns).
- `src/app/kho/KhoValuationView.tsx` — "Giá trị" tab; valuation KPIs + DataTable + estimate/import-history drawer (import-history fetch copied byte-for-byte from `app/valuation/page.tsx`).
- `src/app/kho/KhoAnomaliesView.tsx` + `KhoDetailDrawer.tsx` — grouped anomaly cards + shared drawer.

### Integrator edits (this session)
- `src/App.tsx` — added `const KhoWorkspace = React.lazy(...)` + parked `<Route path="/kho" element={<RequireAuth moduleKey="inventory"><KhoWorkspace/></RequireAuth>}>`. Legacy `/pharmacy`, `/inventory`, `/valuation` routes unchanged.
- `src/ui/index.ts` — barrel exports for `DataTable`/`ChartFrame` (+ presets, style consts, prop types).
- `src/lib/utils.ts` — `formatCompact` (added by primitivesWave; single shared fn, byte-identical to the legacy copies; no 14th variant).
- `test/unit/supplyInventoryKpiDetails.test.ts` — injected a fixed clock (`now: 2026-04-15`) into the fixture (see §4).

### Deliverables
- `tasks/handoffs/2026-07-08-phase3-kho-desktop-1440.png`, `…-phone-390.png` — structural screenshots (real `ui/*` + `app/kho/*` components against real compiled Tailwind; §5).

**NOT modified** (frozen / off-limits, verified): all inventory viewmodels, `viewmodels/inventory/shared.ts`, `lib/pharmacyInventoryPresentation`, anomaly thresholds, `src/lib/navigation.ts`, and every `app/{pharmacy,inventory,valuation}` file. No git commits/staging.

---

## 2. Gate results (verbatim)

| Gate | Result | Evidence |
|---|---|---|
| `npm run lint` (tsc --noEmit) | **PASS** exit 0 | 0 errors |
| `npm run build` | **PASS** exit 0 | `✓ built in 5.19s`; new chunk `KhoWorkspace-CWuSwoYp.js 30.42 kB │ gzip 8.67 kB` (own lazy chunk) |
| `npm run check:bundle` | **PASS** exit 0 | `Portal bundle budget check passed.` |
| `npm run check:pwa` | **PASS** exit 0 | `PWA precache budget check passed. — 87 precache entries` |
| `npm run check:auth-smoke` | **ENV-BLOCKED** exit 1 (expected) | `Error: Missing required environment variable: PORTAL_SMOKE_BASE_URL` — live-auth blocked in this env, as documented in spec §8.5 |
| `npx tsx --test test/unit/*.ts test/unit/*.tsx` | **PASS** | `tests 102 · pass 102 · fail 0` — includes the now-deterministic cost-per-visit test |

Pre-integrator baseline (verifier): lint 0 errors, unit suite had **1 failing** date-sensitive test. Post-integrator: unit suite **102/102 green**.

---

## 3. No-drift verdict (numbers-unchanged)

**PASS — zero data-logic drift.** `git diff` touches no frozen viewmodel, query, KPI computation, sort comparator, filter predicate, or anomaly threshold. Confirmation:
- **By construction**: `/kho` reads the *same unedited* `usePharmacyInventory`/`useSupplyInventory` that drive live `/pharmacy` and `/inventory` (enabled-dual-hook, only the active warehouse enabled, **no merge**). `DataTable`/`ChartFrame` are pure passthrough (render rows/data as given, no sort/derive).
- **Only new/added surfaces**: all `src/app/kho/*` + `src/ui/{DataTable,ChartFrame}.tsx` are untracked pure additions; the sole edits to existing files are the two integrator wiring files, the shared `formatCompact`, and a test.
- **Formatters**: `formatCompact` (utils.ts) byte-identical to the legacy copies; `formatVND` character-identical to legacy `formatCurrency` (`Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'})`). No behavioral change.
- **One documented carry-over fetch**: `KhoValuationView.tsx` `fdc_medicine_imports` import-history query is a byte-for-byte copy of `app/valuation/page.tsx` (gate predicate `warehouse!=='thuoc'` ≡ legacy `!supportsValuationImportHistory('pharmacy')`). Feeds only the drilldown drawer's history list; valuation totals derive from the vm, not this fetch.

Verifier's 5-point adversarial pass reproduced and re-confirmed after route wiring.

---

## 4. Pre-existing failing test — assessed & made deterministic (spec item 3)

`test/unit/supplyInventoryKpiDetails.test.ts` "cost-per-visit" was **purely date-sensitive**, not a real bug: `buildCostPerVisitDetail` threads `context.now` into `buildSupplyChartData`, but the test's `buildDetail` helper never passed `now`, so it defaulted to wall-clock (2026-07-08); the April-2026 fixtures fell outside the "1M" window → empty rows → `rows[0][0]` undefined vs expected `"2026-04-01"`. Production code already exposes an injectable `now` for exactly this determinism. Fix is **confined to the test fixture**: added `now: new Date("2026-04-15T00:00:00.000Z")`. No production/logic change. Suite now 102/102.

---

## 5. Screenshots (structural, component-level)

Live E2E is auth-blocked, so I built a throwaway Vite harness that mounts the **real** `KhoOverviewView` + `KhoInventoryListView` (Thuốc) with fixture props (frozen-vm shape) against the **real** compiled `src/index.css` tokens, served over HTTP, captured with `playwright-core` + installed Chrome at deviceScaleFactor 2. Harness sources removed after capture (repo clean).

- **Desktop 1440px** (`…-desktop-1440.png`): PageHeader "Kho & Dược" + warehouse switcher (Thuốc|Vật tư `ui/TabBar`) + sub-tab bar; 4× `ui/KpiCard`; `ValueTrendChart` (brand-green area) + `TopMaterialsChart` (brand-green bars) in `ui/ChartFrame`; anomaly-preview cards via `ui/StatusBadge` (Nghiêm trọng/Cao/Trung bình/Thấp); list value-strip + `ui/KhoFilterBar` + compact `ui/DataTable` with derived-status badges and green value column. Formatters render `2.7 tỷ` / `150.0 tr` / `412.800.000 đ`. No indigo — one brand system.
- **Phone 390px** (`…-phone-390.png`): KPI grid → 2-col, charts/anomaly cards stack, DataTable's `hidden sm/md/lg:table-cell` columns drop out to Mã/Tên/ĐVT/Trạng thái/Tồn, badges intact.

These prove the shared stack renders at both breakpoints; they are **not** a numeric side-by-side (that needs live auth — see §6).

---

## 6. Route status & KTT proof plan

- `/kho` is **PARKED** (reachable by direct URL), gated `RequireAuth moduleKey="inventory"` (matches `/valuation` + the KTT resolver `inventory.view && valuation.view`; head_nurse FULL_ACCESS bypass preserved). **Not flipped.**
- `src/lib/navigation.ts` **intentionally unchanged** — the KTT workspace nav slot still points at `/inventory`. Per spec §7 and architect note (3), repointing is deferred until KTT sign-off. (Note: the task line "add its entry to the Kho workspace resolution / Tra cứu" is superseded by the same paragraph's "It is NOT flipped … reachable by direct URL" and the architect's "optionally repoint … after KTT sign-off"; see Deviations.)
- **KTT desktop side-by-side (blocked here, do at flip)**: `/pharmacy`⟷`/kho?wh=thuoc`; `/inventory`⟷`/kho?wh=vat-tu`; `/valuation?module=pharmacy`⟷`/kho?wh=thuoc&tab=gia-tri` and `?module=inventory`⟷`/kho?wh=vat-tu&tab=gia-tri` — compare KPIs, list `filteredValue`+row count, top-10 order/values, trend endpoints, anomaly counts, drawer estimate + import history to the digit.

---

## 7. Deviations

1. **navigation.ts left unchanged** (did not add a `/kho` nav entry or repoint the KTT slot). The task's item-2 phrasing pulls two ways; I followed the authoritative, numbers-safe reading ("PARKED, not flipped, reachable by direct URL"; architect step 3 = *optional, after KTT sign-off*). `/kho` is reachable by direct URL now; the one-line nav repoint is a trivial Phase-4 step gated on KTT proof.
2. **`KhoDetailDrawer` not mounted by any view** (verifier non-blocking note): `KhoInventoryListView` wires `onRowClick→vm.setSelectedItem`, but no shell mounts `<KhoDetailDrawer vm.selectedItem>`, so the list/anomaly drilldown drawer is currently dead (self-guards on null; zero numeric impact). `KhoValuationView` has its own self-contained inline drawer and works. Left as-is (presentation-only gap, out of the "resolve BLOCKING findings" scope); flagged for Phase 4.
3. **Screenshots are component-level, not E2E** — forced by the auth block; the Vật-tư warehouse and the Giá trị/Bất thường sub-tabs were not captured (Thuốc Tổng-quan + Danh-sách chosen as the KTT-critical surface).

---

## 8. Blockers

**None.** No BLOCKING verifier finding existed; nothing required reverting. All buildable gates green; `check:auth-smoke` env-blocked by design.

---

## 9. Phase 4 pointer (live-auth-gated)

1. **Numeric side-by-side sign-off** by KTT (§6) on real data — the gate that authorizes any flip.
2. **Data-hook MERGE** — unify `usePharmacyInventory` + `useSupplyInventory` into `useInventoryModule(config)` (audit §4 item 1); the ~65%-identical hooks. Live-verified only.
3. **Flip routes** — `/pharmacy`, `/inventory`, `/valuation` → redirect to `/kho?wh=…(&tab=gia-tri)`, and repoint the `navigation.ts` KTT workspace slot from `/inventory` to `/kho`.
4. **Mount `KhoDetailDrawer`** in the shell (Deviation 2); full **Vật-tư Tổng-quan reskin** (currently verbatim `OverviewTab`); **per-warehouse switcher permission gating** (e.g. pharmacy_head → Thuốc only); **remove legacy formatter copies** (~13 `formatVND`/`formatCurrency`, ~7 `formatCompact`) as the legacy routes retire.
