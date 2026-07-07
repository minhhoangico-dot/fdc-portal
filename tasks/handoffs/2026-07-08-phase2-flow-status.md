# Phase 2 (Flow) — integration + verification status

- **Date**: 2026-07-08 · **Role**: Integrator (Opus 4.8)
- **Spec**: `tasks/active/2026-07-08-phase2-flow.md`
- **Scope**: wire the three build-wave surfaces (inbox / two-lens workspace / SealMark) into routing + nav, reconcile seams, run gates. NO git commits/staging. No frozen file touched.

---

## 1. Gate results

| Gate | Result | Notes |
|---|---|---|
| `npm run lint` (tsc --noEmit) | **PASS — 0 errors** | The build-report's `CuaToiLens.tsx(84,61)` error was already resolved by the workspace wave's explicit `TabBar<…>` generic; clean on the merged tree. |
| `npm run build` | **PASS** | `✓ built in 5.38s`, 3383 modules. New chunks: `WorkflowWorkspace-*.js 19.46 kB`, inbox/print lazy-split as `page-*.js`. |
| `npm run check:bundle` | **PASS** | "Portal bundle budget check passed." (largest = xlsx 419.47 KiB, budget 950 KiB). |
| `npm run check:pwa` | **PASS** | "PWA precache budget check passed." — 84 precache entries (1829.14 KiB), XLSX excluded. |
| `npm run check:auth-smoke` | **ENV-BLOCKED (expected)** | `Error: Missing required environment variable: PORTAL_SMOKE_BASE_URL` (exit 1). Live-URL smoke, unrunnable in this env — same as Phase-1 handoff §4. Not a regression. |
| nav tests (`navReachability` + `navigation`) | **PASS — 12/12** | 5 + 7 blocks. Reachability holds for all 13 roles; primary nav still 5 slots; exactly one badged (inbox) slot. |
| `inboxCount` invariant (`test/unit/inboxCount.test.ts`) | **PASS — 3/3** | Proves `buildInbox(...).length === workQueue.totalCount + unread === useActionableCount().total`. |
| full `test/unit/**` suite | **101 / 102** | 1 failure = `supplyInventoryKpiDetails.test.ts` "cost-per-visit … short/long ranges": expects `2026-04-01`, got `undefined`. **Pre-existing, date-sensitive** (a "1M" window relative to the session clock, which advanced to 2026-07-08); touches no routing/nav/inbox code and none of my changed files. Not caused by Phase 2. |
| phone-viewport approval flow (390px) | **Component-level PASS; live E2E auth-blocked** | See §4. Screenshot: `tasks/handoffs/2026-07-08-phase2-inbox-approval-390.png`. |

### Verbatim (key lines)
```
> tsc --noEmit                       # (no output = 0 errors)

> vite build
✓ 3383 modules transformed.
dist/assets/WorkflowWorkspace-36e1YIPP.js   19.46 kB │ gzip: 5.79 kB
✓ built in 5.38s
PWA v1.2.0  precache 84 entries (1829.14 KiB)

> node scripts/check-portal-bundle-budget.mjs
Portal bundle budget check passed.

> node scripts/check-pwa-precache-budget.mjs
PWA precache budget check passed.

> tsx scripts/check-authenticated-routes.ts
Error: Missing required environment variable: PORTAL_SMOKE_BASE_URL

# npx tsx --test  (inboxCount + navReachability + navigation)
ℹ tests 15   ℹ pass 15   ℹ fail 0

# npx tsx --test test/unit/*.ts test/unit/*.tsx
ℹ tests 102  ℹ pass 101  ℹ fail 1
✖ supplyInventoryKpiDetails.test.ts › builds cost-per-visit KPI detail … (expected '2026-04-01', actual undefined)
```

---

## 2. Files shipped

### Changed by integrator (this pass)
- `src/App.tsx` — added lazy imports + routes: `/inbox` (RequireAuth, no moduleKey), `/requests/:id/print` (RequireAuth `moduleKey="requests"`), `/workflow` (RequireAuth `moduleKey="requests"` → `<WorkflowWorkspace defaultLens="cua-toi"/>`). Legacy `/requests`, `/requests/create`, `/requests/:id`, `/approvals` left resolvable and unchanged.
- `src/lib/navigation.ts` — repointed inbox slot (slot 2) to `path:'/inbox'`, `moduleKey` dropped (badge kept). Freed `/requests` for the pure-staff workspace slot (see deviation D1).
- `src/ui/index.ts` — barrel exports added: `ApprovalCard`, `InboxItem`, `SealMark` (+ their prop types).
- `test/unit/navReachability.test.ts` — updated 2 persona assertions (see D1).

### Created by build waves (verified, not modified by me)
- Inbox: `src/lib/inbox/buildInbox.ts`, `src/viewmodels/useInbox.ts`, `src/ui/InboxItem.tsx`, `src/app/inbox/page.tsx`, `test/unit/inboxCount.test.ts`.
- Workspace: `src/app/workflow/WorkflowWorkspace.tsx`, `src/components/workflow/CuaToiLens.tsx`, `src/components/workflow/ChoToiLens.tsx`, `src/ui/ApprovalCard.tsx`.
- SealMark: `src/ui/SealMark.tsx`, `src/lib/requests/approvalState.ts`, `src/app/requests/[id]/print/page.tsx`, and modified `src/app/requests/[id]/page.tsx` (seal + "Xuất / In" button).

### Verification artifacts
- `tasks/handoffs/2026-07-08-phase2-inbox-approval-390.png` — the phone-viewport render.
- `tasks/handoffs/2026-07-08-phase2-inbox-approval-390.html` — self-contained source (real components + built CSS).

---

## 3. Flip decision — DEFERRED (workspace parked at `/workflow`)

`/requests` and `/approvals` were **NOT flipped** to `<WorkflowWorkspace/>` this pass. They still render the proven `RequestsPage` / `ApprovalsPage` verbatim. The workspace is parked at **`/workflow`** (reach `?lens=cho-toi` for the Chờ tôi lens).

**Why defer:** the spec gates the flip on "only once proven", and the definitive proving gate (phone-viewport **approval E2E**) is auth-blocked in this env (`never fake`). The two-page approval workflow is the primary user's (KTT) daily driver; a presentational regression I cannot runtime-verify with real auth/data is high-impact, whereas the flip itself is a ~4-line, fully-reversible change. The spec explicitly sanctions this path ("Optional /workflow URL if integrator prefers a distinct path over flipping"; "old pages stay until then").

**Proving already done (static):** structural diff confirms `CuaToiLens`≡`RequestsPage` and `ChoToiLens`≡`ApprovalsPage` — identical frozen-hook calls and handlers, presentation re-skinned onto `ui/*` only. `npm run lint` + `npm run build` pass. So the flip rests only on a live click-through with real auth.

**To flip later (when a live-auth session proves the lenses):** in `src/App.tsx`, change the `/requests` element to `<WorkflowWorkspace defaultLens="cua-toi"/>` and `/approvals` to `defaultLens="cho-toi"`, drop the now-unused `RequestsPage`/`ApprovalsPage` lazy consts (they're referenced only in `App.tsx`), and optionally retire `/workflow`. `tsconfig` has no `noUnusedLocals`, so leftover imports won't break lint, but remove them for cleanliness. No redirect needed (lens-preset = UX-equivalent).

`ActionableDataContext` hoist (spec §6.3): **not taken** — optional integrator follow-up, left for Phase 3+. The requests↔approvals dual realtime channel is intact by design; it collapses only when the old pages retire post-flip.

---

## 4. Count agreement + approval-flow verification

- **Badge ⇄ list share one source by construction.** `useActionableCount` = `useApprovals({enabled}).approvalWorkQueue.totalCount + useNotifications().unreadCount`, with predicate `review_assigned || receive_handoff || review_group_queue`. `useInbox` replicates that exact predicate and maps `buildInbox` **1:1** over the same three work-queue arrays + unread notifications. Enforced by `inboxCount.test.ts` (3/3). Reviewer intakes fold under the **Phê duyệt** chip (not a 4th chip); notification/approval overlap is not deduped — both deliberate, to keep list == badge without editing the frozen count hook.
- **Optimistic flow (traced + rendered):** `InboxPage` Duyệt → `useInbox.approve` adds the item key to `dismissedIds` (filtered from `items` immediately) then calls `approvals.approveRequest`; on error it rolls the key back. The shared-table realtime refetch drops the request from `approvalWorkQueue`, so `useActionableCount.total` decrements. The 390px render captures this: **badge 3 → 2, approval row gone, handoff + notification remain.**
- **SealMark restraint (§5.3) — confirmed by read:** seal renders only when `isFullyApproved(request) && getFinalApprover(request)` on the detail summary card and the print sheet; pending/rejected detail and every list (inbox rows, both lenses, home widgets) use `StatusBadge` only.

---

## 5. Seams reconciled

- **`ChoBanDuyet` widget** — untouched; still imports `approveRequest`/`rejectRequest` from `useApprovals`. Compiles (lint) and chunks (`ChoBanDuyet-*.js` in build). Its "Xem tất cả" still points to `/approvals` (resolvable). ✓
- **SealMark wave dependency** ("print route + barrel not added — integrator's") → `/requests/:id/print` route registered; `SealMark` barrel-exported. The detail page's "Xuất / In" button now resolves. ✓
- **Inbox wave dependency** ("`/inbox` route + `InboxItem` barrel not added") → both added. ✓
- **Workspace wave dependency** ("App.tsx/navigation wiring out of scope") → `/workflow` route added, inbox slot repointed; the flip is the only deferred item (§3). ✓
- **Nav badge + Home inbox strip** follow `getPrimaryNav`'s inbox slot automatically (Phase-1 wiring) — both now resolve to `/inbox` with zero Home edit. ✓

---

## 6. Deviations

- **D1 — pure-staff workspace slot moved `/attendance → /requests`.** Repointing the inbox off `/requests` removed the Phase-1 collision that forced staff to `/attendance`; the dedup guard no longer fires, so `resolveWorkspace` now yields **Đề nghị (`/requests`)** — the direction-doc-intended staff `[Workspace]` (§4.1: "safe as staff's [Workspace] slot (Đề nghị)"). Updated `navReachability.test.ts` `clinic_staff`/`pharmacy_staff` assertions accordingly (with an in-code comment). The reachability guarantee (test 1) and all 12 nav blocks stay green. `business_head`/`lab_head`/`pharmacy_head` still resolve to `/attendance` via `attendance.view_team` (unchanged). Permission-matrix semantics untouched.
- **D2 — inbox slot carries no `moduleKey`.** `/inbox` is not a `PermissionModuleKey`; the badge renders off the `badge` flag (Sidebar/BottomNav key nav off `item.path`, not moduleKey, so this is safe). `requests`/`approvals` stay reachable via the workspace slot + "Tra cứu" disclosure (verified by the reachability test).
- **D3 — flip deferred / `/workflow` parked** (see §3).

---

## 7. Blockers

- `check:auth-smoke` and live approval E2E require real Supabase auth + a running portal (`PORTAL_SMOKE_BASE_URL`); the self-hosted auth store is incomplete (see project memory: `project_fdc_supabase_auth_migration_gap.md`). Both documented, not faked.
- 1 pre-existing date-sensitive unit failure (`supplyInventoryKpiDetails`) unrelated to Phase 2 — flag to Minh separately; likely needs a fixed clock or updated fixtures.

---

## 8. Phase 3 pointer

1. **Prove + flip** the workspace: live-auth click-through of Của tôi / Chờ tôi at `/workflow?lens=…`, then flip `/requests` + `/approvals` (see §3) and retire the two old pages.
2. **`ActionableDataContext` hoist** (spec §6.3): one shared `useApprovals+useNotifications` at `AppShell`, feeding both the badge and `useInbox` — collapses the duplicate realtime channels and makes count agreement hold by shared reference.
3. **Deferred router-gap tightening** (still a separate commit to Minh, NOT folded here): `moduleKey` on `/lab-dashboard` & `/weekly-report*`, and the `/valuation` gate.
4. Fix the date-sensitive `supplyInventoryKpiDetails` test.
