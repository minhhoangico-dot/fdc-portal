# Phase 4c — FINALIZE: integration + verification status

- **Date**: 2026-07-08 · **Role**: Phase 4c finalizer (Opus 4.8) · **Branch**: `codex/portal-presentation-refactor`
- **Predecessor**: `tasks/handoffs/2026-07-08-phase4b-flip-status.md`
- **Scope**: the two finalize items only — (A) safe pure-compute extraction shared by the two inventory hooks, behind a byte-identity proof; (B) two out-of-band safe fixes carried from 4b (§8.1, §8.2). NO git commits/staging. No frozen path touched.
- **Outcome**: **ALL GATES GREEN. Hook extraction KEPT (EXTRACTED + proven), NOT reverted.** No blocking verifier finding existed; byte-identity is proven for both warehouses; the two safe fixes are within their stated scope.

---

## 1. Gate table (verbatim commands)

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` (`tsc --noEmit`) | **PASS** — exit 0, 0 errors |
| Build | `npm run build` (`vite build`) | **PASS** — `✓ 3384 modules transformed` · `✓ built in 5.16s` · PWA precache 77 entries (1765.26 KiB) |
| Bundle budget | `npm run check:bundle` | **PASS** — "Portal bundle budget check passed." (largest: xlsx 419.47 KiB, charts 374.38 KiB, index 334.75 KiB, KhoWorkspace 121.55 KiB) |
| PWA precache | `npm run check:pwa` | **PASS** — 77 precache entries; XLSX chunks excluded |
| Auth smoke | `npm run check:auth-smoke` | **ENV-BLOCK (expected)** — exit 1: `Missing required environment variable: PORTAL_SMOKE_BASE_URL` (live-only; no code fault) |
| Unit suite | `npx tsx --test test/unit/*.ts test/unit/*.tsx` | **PASS** — tests 108 / pass 108 / fail 0 |

### Critical named suites (run individually)

| Suite | Count | Result |
|---|---|---|
| `navReachability.test.ts` | 5 | **PASS** (reachability all-13-roles ✓; 5-slot canonical order ✓; no dup nav targets ✓; one inbox badge ✓; per-persona workspace ✓) |
| `inboxCount.test.ts` | 3 | **PASS** (`buildInbox().length === workQueue.totalCount + unreadCount === useActionableCount().total`) |
| `inventoryComputeCharacterization.test.ts` (NEW) | 6 | **PASS** — byte-identity vs frozen legacy oracles + golden anchors, for pharmacy (HIS `S1xx`) AND supply (`misa_*`) shapes |
| `navigation.test.ts` | 7 | **PASS** (legacy `NAV_ITEMS`; weekly-report no longer a top-level nav item) |
| `authenticatedRouteSmoke.test.ts` | 3 | **PASS** (offline structural check of the smoke config's `.path` array) |

Characterization test — verbatim:
```
✔ sumInventoryValue matches legacy oracle + golden for both shapes
✔ sortInventoryItems is byte-identical to legacy for every key/dir on both shapes
✔ sortInventoryItems value-desc golden order preserves stable tie order
✔ filterAnomaliesToInventory matches legacy + golden for both shapes
✔ buildSnapshotHistory is byte-identical to legacy for both shapes
✔ buildSnapshotHistory golden: synthesized latest point carries current totals
ℹ tests 6  ℹ pass 6  ℹ fail 0
```

---

## 2. Hook-merge decision — EXTRACTED + PROVEN (not reverted, not the full merge)

**What shipped (safe subset).** Only the four genuinely byte-identical, wall-clock-independent `useMemo` bodies that were duplicated verbatim in BOTH hooks were lifted into one pure module `@/viewmodels/inventory/compute.ts`:
`sumInventoryValue`, `filterAnomaliesToInventory`, `sortInventoryItems`, `buildSnapshotHistory`.
Each hook now delegates its four `useMemo`s to these fns **with identical dependency arrays**; the dropped `getInventoryValue` import is the only other line. No fetch / query / realtime subscription / `useEffect` / return-shape line changed in either hook (confirmed by diff).

**Why it is safe without live auth.** `compute.ts` imports from the *identical* source modules the hooks used at HEAD (`anomalyMatchesInventoryItem` from `@/lib/inventory-identity`; `getInventoryValue` + `compactSnapshotHistoryByWeek` from `@/viewmodels/inventory/shared`), so the extracted code is the same code, relocated. The characterization test freezes the legacy `useMemo` bodies verbatim as oracles and asserts `JSON.stringify` equality against the extracted fns across both warehouse shapes, every sort key×dir, anomaly match/miss, and snapshot merge — plus non-tautological golden anchors (sums 1_600_000 / 640_000; value-desc order exercising the stable-idx tiebreak; synthesized latest snapshot points).

**What is NOT here (still deferred).** The *full behavioral hook unification* — collapsing `usePharmacyInventory` + `useSupplyInventory` into one parameterized `useInventoryModule(config)` including the parts that genuinely DIFFER between warehouses (pharmacy `matchesPharmacyInventoryFilterStatus` vs supply inline status logic; the two fetch/query/subscription pipelines) — remains DEFERRED behind live-auth numeric sign-off. `compute.ts` deliberately holds only the byte-identical intersection; the differing filter/status semantics were intentionally left in-hook. See §5 for the deferred item's recipe.

---

## 3. Files changed / added (1-line purpose)

**Item A — safe pure-compute extraction**
- `src/viewmodels/inventory/compute.ts` **(NEW)** — pure, wall-clock-independent module with the 4 byte-identical inventory-compute fns; single source of the KTT's inventory-value / sort / anomaly-filter / snapshot-history math.
- `src/viewmodels/usePharmacyInventory.ts` **(M)** — 4 `useMemo` bodies replaced with calls into `compute.ts` (same deps); `getInventoryValue` import dropped. No fetch/subscription/return change.
- `src/viewmodels/useSupplyInventory.ts` **(M)** — same delegation, identical shape.
- `test/unit/inventoryComputeCharacterization.test.ts` **(NEW)** — proves byte-identity of the 4 fns vs frozen legacy oracles + golden anchors, for both warehouse shapes.

**Item B — two safe fixes carried from Phase 4b**
- `src/lib/navigation.ts` **(M)** — single-line `weekly_report` reference-link repoint `/tv-management/weekly-report` → `/weekly-report` (resolves 4b §8.2: the "Báo cáo tuần" Tra-cứu link no longer routes weekly_report roles into the tv_management/super_admin gate; it now lands on the in-shell `/weekly-report` those roles are entitled to). No permission/gating change.
- `src/lib/portal-auth-smoke.ts` **(M)** — added `expectedUrlPath: '/kho?wh=vat-tu'` (`/inventory`) and `'/kho?wh=thuoc'` (`/pharmacy`) so the live smoke tracks the 4b flip redirects (resolves 4b §8.1). `.path` values untouched; `/weekly-report` entry's pre-existing `expectedUrlPath` left as-is (out of scope). Offline `authenticatedRouteSmoke.test.ts` checks only `.path` → stays green.

**Change set = exactly 6 non-frozen files** (4 M + 2 new). No frozen path (attendance `src/**/attendance/**`, `src/types/attendance.ts`, `fdc-lan-bridge/**`, `sql/**`, TV/display pages) touched by 4c — those working-tree entries are the pre-existing bundled attendance workstream present at session start, untouched here.

---

## 4. No-drift verdict

- **Numbers unchanged.** The extraction is a byte-identical relocation proven by the characterization test (6/6) for both HIS-pharmacy and MISA-supply shapes; the two safe fixes touch only a nav path string and two smoke-config annotations. `git diff` touches no viewmodel query, KPI computation, filter predicate, sort comparator (the comparator moved verbatim, proven equal), or anomaly threshold.
- **Permission-matrix semantics / head_nurse authority — UNCHANGED.** No `matrix.ts` / `role-authority.ts` / `access.ts` in the diff. The lone `PermissionModuleKey` occurrence in `navigation.ts` is the pre-existing `Record<PermissionModuleKey, …>` type annotation (context line, not an edit). `navReachability` `head_nurse sees admin and tv management nav items` passes.
- **No commits / staging.** Working tree only.

---

## 5. Deferred item (carry-forward) — full data-hook MERGE, live-auth-gated

Not done in 4c; the safe byte-identical subset shipped instead (§2). The remaining full unification requires the same live-auth numeric sign-off that gates every Phase-4 flip.

**Live-auth recipe (do at KTT sign-off, on real data):**
1. With a live portal + seeded KTT login, open the four side-by-sides and compare to the digit: `/pharmacy` ⟷ `/kho?wh=thuoc`; `/inventory` ⟷ `/kho?wh=vat-tu`; `/valuation?module=pharmacy` ⟷ `/kho?wh=thuoc&tab=gia-tri`; `?module=inventory` ⟷ `/kho?wh=vat-tu&tab=gia-tri`. Check KPIs, list `filteredValue` + row count, top-10 order/values, trend endpoints, anomaly counts, drawer estimate + import history.
2. Only after that passes, unify the two hooks into one `useInventoryModule(config)` — config carries the warehouse-specific fetch/query pipeline and the differing filter/status predicate; the shared pure math already lives in `compute.ts`, so the merge is now just the fetch + filter-status seam.
3. Re-run all gates + a live numeric side-by-side after the merge (offline byte-identity cannot cover the differing filter/status paths).

**Revert recipe (if the extraction ever needs undoing — it does NOT now):**
```bash
git checkout HEAD -- src/viewmodels/usePharmacyInventory.ts src/viewmodels/useSupplyInventory.ts
rm src/viewmodels/inventory/compute.ts test/unit/inventoryComputeCharacterization.test.ts
npm run lint && npm run build
```
(Item B's two safe fixes are independent — keep them regardless.)

---

## 6. Standing caveat — live-auth sign-off before deploy

All offline gates are green, but **no live-auth numeric/behaviour sign-off has been run** because auth is env-blocked in this environment (`check:auth-smoke` needs `PORTAL_SMOKE_BASE_URL` + a running portal; project memory records the self-hosted Supabase auth-migration gap → portal logins currently 400). Before deploy, on a live portal with a seeded KTT login:
- **KTT inventory numeric side-by-side** (§5 step 1) — authorizes the `/kho` flips.
- **Approval E2E on a phone viewport** — click-through Của tôi / Chờ tôi at flipped `/requests` + `/approvals`, confirm badge decrement + optimistic dismiss.
- **`npm run check:auth-smoke`** with the three env vars set — now covers the flip redirects via the `expectedUrlPath` added in Item B.
The flips are *wired and offline-green*; they need this live sign-off before production.

---

## 7. Deviations

None. Item A landed as a byte-identical extraction proven for both warehouses (no full merge attempted — correctly deferred). Item B stayed within its two-field scope. All gates run verbatim.

---

## 8. Blockers

None. No blocking verifier finding; nothing required reverting. `check:auth-smoke` env-blocked by design.
