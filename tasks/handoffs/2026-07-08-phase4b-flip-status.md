# Phase 4b — FLIP · RETIRE · HOIST · router-gap TIGHTEN — INTEGRATION STATUS

- **Date**: 2026-07-08 · **Role**: Phase 4b integrator (Opus 4.8)
- **Spec**: `tasks/active/2026-07-08-phase4b-flip.md`
- **Predecessors**: phase2-flow §3 (flip recipe) · phase3-kho §6/§9 (valuation URL map)
- **Outcome**: ALL GATES GREEN. No blocking findings. No frozen-path or data-logic drift. Waves a/b/c reconciled; the flip↔retire seam (App.tsx lazy-import removal ↔ 5 page deletions) resolves cleanly — no dangling `import('@/app/…/page')`.

---

## 1. Gate table (verbatim commands)

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` (`tsc --noEmit`) | **PASS** — exit 0, 0 errors |
| Build | `npm run build` (`vite build`) | **PASS** — built in 5.19s; PWA precache 77 entries (1765.80 KiB) |
| Bundle budget | `npm run check:bundle` | **PASS** — "Portal bundle budget check passed" (largest: xlsx 419.47 KiB) |
| PWA precache | `npm run check:pwa` | **PASS** — 77 entries, XLSX excluded |
| Auth smoke | `npm run check:auth-smoke` | **ENV-BLOCK (expected)** — exit 1: `Missing required environment variable: PORTAL_SMOKE_BASE_URL` (live-only; no code fault) |
| Unit suite | `npx tsx --test test/unit/*.ts test/unit/*.tsx` | **PASS** — tests 102 / pass 102 / fail 0 |

### Critical named suites (run individually)

| Suite | Count | Result |
|---|---|---|
| `navReachability.test.ts` | 5 | **PASS** (reachability all-13-roles ✓; 5-slot order ✓; no dup targets ✓; one badge ✓; per-persona workspace → `/kho` ✓) |
| `inboxCount.test.ts` | 3 | **PASS** (`buildInbox().length === workQueue.totalCount + unreadCount`) |
| `portalPresentationComponents.test.ts` | 2 | **PASS** (component boundaries + budgets, pharmacy/page.tsx budget assertion removed) |
| `navigation.test.ts` | 7 | **PASS** (legacy `NAV_ITEMS`, untouched by 4b) |
| `authenticatedRouteSmoke.test.ts` | 3 | **PASS** (checks only `.path` array — unchanged) |

---

## 2. Verdicts

- **Reachability**: **GREEN for all 13 roles.** `getReachableModuleKeys(role) ⊇ getAccessibleModules(role)` for every role (orphaned == []). `getPrimaryNav` unconditionally returns the 5-tuple `[home, inbox, workspace, reference, personal]`. KTT workspace slot repointed `/inventory → /kho` with `moduleKey` held at `inventory` (gate/dedup/reachability unchanged). navReachability test updated to assert `/kho` for the 5 KTT-persona roles (see §4).
- **Invariant (badge ↔ inbox)**: **PRESERVED, now by shared reference.** Both `useActionableCount` and `useInbox` read the SAME `approvals.approvalWorkQueue` + `notifications` off `ActionableDataContext` (one `useApprovals` + one `useNotifications` mounted in `AppShell`). The hand-synced predicate was collapsed into the ONE canonical `approvalEnabled` in the provider. When `!approvalEnabled`, `useApprovals({enabled:false})` short-circuits → empty queue → `totalCount === 0`, so `total = 0 + unreadCount = buildInbox().length`.
- **No-drift**: **CONFIRMED.** Phase-4b changed set is exactly the wave a/b/c files (below). `matrix.ts`, `role-authority.ts`, `access.ts` NOT in the diff → permission semantics + `head_nurse` authority unchanged. TV/print routes untouched. No viewmodel data logic edited (`usePharmacyInventory`/`useSupplyInventory` untouched — Phase 4c). The `M` attendance/bridge/`sql` working-tree entries were present in the session-start snapshot and are NOT part of this phase (frozen; not touched here).

---

## 3. Files changed / deleted (1-line purpose)

**Wave a — flip + nav + router-gap (modified)**
- `src/App.tsx` — `/requests`→`WorkflowWorkspace defaultLens="cua-toi"`; `/approvals`→`defaultLens="cho-toi"`; `/inventory`→`Navigate /kho?wh=vat-tu`; `/pharmacy`→`Navigate /kho?wh=thuoc`; `/valuation`→`ValuationRedirect` (module=inventory→vat-tu else thuoc, always tab=gia-tri); dropped 5 dead lazy consts; gated `/lab-dashboard` (moduleKey `lab_dashboard`) + in-shell `/weekly-report` (moduleKey `weekly_report`).
- `src/lib/navigation.ts` — `workspaceSlot` gains optional `pathOverride`; KTT branch → `workspaceSlot('inventory','Kho','/kho')` (path only, `moduleKey` stays `inventory`); `canRoleAccessModule` param widened `ModuleKey → PermissionModuleKey`.
- `src/components/auth/RequireAuth.tsx` — `moduleKey` prop widened `ModuleKey → PermissionModuleKey` (supports `lab_dashboard`).
- `test/unit/navReachability.test.ts` — 5 KTT-persona assertions `/inventory → /kho` (see §4).

**Wave b — hoist (modified + 1 new)**
- `src/contexts/ActionableDataContext.tsx` **(NEW)** — single provider holding one `useApprovals` + one `useNotifications` + the canonical `approvalEnabled`; exposes `useActionableData()`.
- `src/components/layout/AppShell.tsx` — split into `AppShell` (wraps `<ActionableDataProvider>`) + `AppShellChrome` (reads context via `useActionableCount`).
- `src/viewmodels/useActionableCount.ts` — now a thin context consumer; same `{approvalCount, notificationCount, total}` shape.
- `src/viewmodels/useInbox.ts` — reads context for data + action fns; keeps its own optimistic `dismissed` set + `buildInbox` map + wrappers; same `UseInboxResult` shape.

**Wave c — retire (deleted + 1 test edit)**
- `src/app/requests/page.tsx` **(DELETED)** — `/requests` now WorkflowWorkspace.
- `src/app/approvals/page.tsx` **(DELETED)** — `/approvals` now WorkflowWorkspace.
- `src/app/pharmacy/page.tsx` **(DELETED)** — `/pharmacy` now redirect (`Pharmacy*` presentation children left in place — test-pinned, Phase 4c).
- `src/app/inventory/page.tsx` **(DELETED)** — `/inventory` now redirect (`OverviewTab`/`ConsumptionTab`/`ImportExportTab`/`StocktakeTab` siblings left in place — mounted verbatim by KhoWorkspace).
- `src/app/valuation/page.tsx` **(DELETED)** — `/valuation` now `ValuationRedirect`.
- `test/unit/portalPresentationComponents.test.ts` — removed the now-ENOENT `pharmacy/page.tsx < 500` budget assertion; all other pinned files survive.

Preserved verbatim (grep-confirmed still on disk): `src/app/inventory/{Overview,Consumption,ImportExport,Stocktake}Tab.tsx`, `src/app/pharmacy/Pharmacy{AnomalySections,Charts,DetailDrawer,Filters,InventoryTable,KpiGrid}.tsx`.

---

## 4. navReachability assertion change (item 4)

Legitimate: the KTT workspace slot's TARGET moved (path only), not its permission module. `moduleKey` stays `inventory` so the reachability guarantee, the used-key dedup, and the gate are all unchanged — the test change is purely the path literal.

```
- workspacePath('accountant')          '/inventory'  →  '/kho'   // KTT → Kho
- workspacePath('internal_accountant') '/inventory'  →  '/kho'
- workspacePath('director')            '/inventory'  →  '/kho'   // has inventory + valuation
- workspacePath('chairman')            '/inventory'  →  '/kho'
- workspacePath('head_nurse')          '/inventory'  →  '/kho'   // valuation.view via FULL_ACCESS bypass
```

Unchanged assertions still green: `super_admin → /admin`; `business_head`/`lab_head`/`pharmacy_head → /attendance`; `clinic_staff`/`pharmacy_staff → /requests`. Reachability test 1 (all 13 roles), test 3 (no dup paths — `/kho` unique among the 4 pathed slots), test 4 (one badge) all stay green.

---

## 5. Router-gap access-delta table (who gained / lost access)

Two in-shell routes were ungated (reachable by ANY authenticated user via direct URL — a gap bug). Now gated by the SAME predicate (`canAccessModule`) that `getAccessibleModules` uses, so every matrix-entitled role keeps access; only the accidental-URL reach is closed.

| Route | Before | After (matrix-accessible) | Gained | Lost (legitimate) | Lost (accidental-URL only — the fix) |
|---|---|---|---|---|---|
| `/lab-dashboard` | any authenticated user | {lab_head, lab_staff, director, chairman, super_admin} | none | **none** | head_nurse, business_head, pharmacy_head, accountant, internal_accountant, pharmacy_staff, business_staff, clinic_staff |
| in-shell `/weekly-report` | any authenticated user | {head_nurse, accountant, lab_head, internal_accountant, director, chairman, super_admin} | none | **none** | business_head, pharmacy_head, pharmacy_staff, lab_staff, business_staff, clinic_staff |

**Flip redirects — no role loses access** (all three land on real Kho surfaces, gate preserved):

| Route | After | Access delta |
|---|---|---|
| `/inventory` → `/kho?wh=vat-tu` | gate `moduleKey="inventory"` (identical) | none |
| `/pharmacy` → `/kho?wh=thuoc` | ungated redirect → `/kho` gate `inventory`; `pharmacy.view` roles ⊆ `inventory` roles | none (no role loses; see carry-over note) |
| `/valuation` → `/kho?...&tab=gia-tri` | ungated redirect → `/kho` gate `inventory`; `valuation.view` roles ⊆ `inventory` roles | none — the old "gated by inventory not valuation.view" audit bug is *dissolved* (re-gating to `valuation.view` would have REMOVED access for head_nurse/pharmacy_head/pharmacy_staff — deliberately not done) |

**Verdict: nobody-legitimate gained or lost access.** The only removals are accidental-URL reach on the two previously-ungated routes (the intended fix).

---

## 6. Deviations

None. All three waves landed exactly as the spec prescribed; the integrator made no additional code edits (the reachability test change item 4 was already applied by wave a and is verified correct). Gates run verbatim.

---

## 7. Blockers

None.

---

## 8. Non-blocking follow-ups (carry to Phase 4c — NOT fixed here)

1. **Live auth smoke (deferred, env-gated).** `src/lib/portal-auth-smoke.ts` still lists `/inventory` + `/pharmacy` with pre-flip `expectedUrlPath` (routes now redirect). When the live auth smoke is next exercised, set `expectedUrlPath` to `/kho?wh=vat-tu` and `/kho?wh=thuoc`. The unit assertion (`authenticatedRouteSmoke.test.ts:25`) checks only the `.path` array (unchanged) → stays green now. Not a wave edit.
2. **`weekly_report` Tra cứu link mismatch (pre-existing, predates 4b).** `MODULE_NAV_META.weekly_report.path = '/tv-management/weekly-report'` (tv_management-gated, super_admin only), so the "Báo cáo tuần" reference link for weekly_report roles routes into an AccessDenied gate. The newly-gated in-shell `/weekly-report` is not nav-linked. Reachability test checks moduleKey presence only, so it stays green. Flag for Phase 4c.
3. **Single-gate `/kho` warehouse widening (inherited Phase-3 property, NOT new here).** The `moduleKey="inventory"` gate on `/kho` lets an inventory-only role (accountant/internal_accountant) reach the Thuốc warehouse via the switcher. Per-warehouse gating is Phase 4c. Matrix semantics untouched.

---

## 9. Phase 4c pointer

- **Data-hook merge behind an equivalence proof.** Collapse `usePharmacyInventory` + `useSupplyInventory` into one hook ONLY after an equivalence proof shows the numbers are byte-identical (Phase-3 §9). Until then they stay separate. Deleting the now-orphaned `app/pharmacy/Pharmacy*` presentation children + legacy formatter copies is also Phase 4c (deleting now would break `portalPresentationComponents.test.ts`).
- **Per-warehouse gating for `/kho`** (see §8.3) — split the single `inventory` gate so pharmacy-only vs supply-only personas see only their warehouse.
- **`weekly_report` reference-link repoint** (§8.2) and full **WorkflowWorkspace/ChoBanDuyet migration onto `ActionableDataContext`** (this phase collapsed only the badge↔inbox pair — the mandated scope).
- **Still-deferred live-auth sign-off**: `check:auth-smoke` is env-gated (needs `PORTAL_SMOKE_BASE_URL` + a live portal); the authenticated-route smoke against the flipped `/inventory`,`/pharmacy` redirects has NOT been exercised live. Sign off when a live environment is available (update `portal-auth-smoke.ts` per §8.1 first).

---

## 10. Exact git revert path (undo the flip if a live regression is found)

Nothing is committed — Phase 4b lives entirely in the working tree, so the undo is a `git checkout HEAD --` of the tracked files plus an `rm` of the one new untracked file. This does **not** touch the pre-existing attendance/bridge/`sql` working-tree changes.

**Full Phase-4b revert (flip + hoist + retire):**
```bash
git checkout HEAD -- \
  src/App.tsx \
  src/lib/navigation.ts \
  src/components/auth/RequireAuth.tsx \
  src/components/layout/AppShell.tsx \
  src/viewmodels/useActionableCount.ts \
  src/viewmodels/useInbox.ts \
  test/unit/navReachability.test.ts \
  test/unit/portalPresentationComponents.test.ts \
  src/app/requests/page.tsx \
  src/app/approvals/page.tsx \
  src/app/pharmacy/page.tsx \
  src/app/inventory/page.tsx \
  src/app/valuation/page.tsx
rm src/contexts/ActionableDataContext.tsx
```
(`git checkout HEAD -- <deleted files>` un-deletes the 5 pages.)

**Flip-only revert (undo wave a + wave c, KEEP the hoist):** the flip and the retire are coupled — the deleted pages are required for the flipped routes to build — so undoing the flip means restoring App.tsx + navigation.ts + RequireAuth.tsx + navReachability.test.ts AND un-deleting the 5 pages + restoring portalPresentationComponents.test.ts (i.e. every file above EXCEPT the wave-b four: `AppShell.tsx`, `useActionableCount.ts`, `useInbox.ts`, `ActionableDataContext.tsx`). Then re-run `npm run lint && npm run build`.
