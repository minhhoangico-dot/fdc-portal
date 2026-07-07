# Phase 1 — Shell / Home "Hôm nay" — Integration Status

- **Date**: 2026-07-08 · **Agent**: Opus 4.8 (integration + verification step)
- **Spec**: `tasks/active/2026-07-08-phase1-shell.md` · **Direction**: `tasks/active/2026-07-08-ux-redesign-user-centric.md` (§4.3 Home, §5 tokens are law)
- **Scope of THIS step**: registry fill + Home page + `useHomeToday` + badge verification + all gates. Tokens, primitives, nav-model v2, AppShell v2, and the five widget components were shipped by prior sub-agents (see their reports); this step wires them together and verifies.

---

## 1. Shipped this step (files created / changed)

| File | Change | Purpose |
|---|---|---|
| `src/lib/home-widgets.ts` | filled | Registry `HOME_WIDGETS` now holds the 5 direction §4.3 entries, each `React.lazy`-imported, keyed by permission action. `getHomeWidgetsForRole` unchanged. |
| `src/viewmodels/useHomeToday.ts` | **new** | Home header viewmodel: greeting name, VN long date (`Intl` `vi-VN`), bridge sync-dot state (`useBridgeHeartbeat`), inbox count + role-resolved inbox path (`useActionableCount` + `getPrimaryNav`). |
| `src/app/dashboard/page.tsx` | rewritten | Home "Hôm nay": greeting (34/600 "Chào <tên>,") + VN date + sync dot → inbox strip (brand-50, count 28/700 brand-700) → widget grid (1 / md:2 / xl:3) with 60ms load stagger, per-widget `Suspense` + error boundary, and the zero-widget EmptyState "Hôm nay chưa có việc cần bạn xử lý ✓". Replaces all role-hardcoded blocks. |
| `src/index.css` | +utility | Added `.fdc-home-enter` keyframe utility (the single orchestrated load-stagger moment; `prefers-reduced-motion: reduce` → `animation: none`). `tokens.css` left verbatim. |
| `src/lib/portal-auth-smoke.ts` | 1 line | `/dashboard` `expectedText` `'Xin chào'` → `'Chào'` to track the new greeting copy (the auth-smoke gate's post-login anchor). |
| `src/viewmodels/useDashboard.ts` | **deleted** | Fully dead after the rewrite (grep: only importer was the old dashboard page). It was nothing but the audit-flagged hardcoded role arrays; the registry replaces it. |

Registry entries (order = display order):
`cho-ban-duyet` (approvals.review_assigned, span 2) · `di-muon-hom-nay` (attendance.view_team) · `ton-kho` (inventory.view) · `de-nghi-cua-toi` (requests.view_own) · `bridge-health` (admin.view).

**Step 3 (badge) — already wired by the shell sub-agent, verified not re-done**: `AppShell` calls `useActionableCount()` and passes `total` to both `Sidebar` and `BottomNav`; nav slot 2 (`inbox`) carries `badge:true`; `Sidebar.PrimaryLink` and `BottomNav.SlotInner` render the `danger-600` count pill when `item.badge && count > 0`. Confirmed correct.

---

## 2. Gate results

| Gate | Result | Notes |
|---|---|---|
| `npm run lint` (`tsc --noEmit`) | **PASS** | Exit 0, zero errors. |
| `npm run build` | **PASS** | Built in ~5s; Home widgets code-split (`ChoBanDuyet-*.js` etc. emitted as separate chunks). |
| `npm run check:bundle` | **PASS** | Main `index-*.js` = 333.61 KiB (budget 950 KiB). |
| `npm run check:pwa` | **PASS** | 77 precache entries; XLSX excluded. |
| `npm run check:auth-smoke` | **BLOCKED (env)** | Not a code failure — see §4. |
| nav-reachability (13 roles) | **PASS** | `test/unit/navReachability.test.ts` + `navigation.test.ts` = 12/12. |

### Verbatim outputs

`npm run lint`
```
> fdc-portal@0.0.0 lint
> tsc --noEmit

EXIT_LINT=0
```

`npm run check:bundle`
```
Portal bundle budget check passed.
- xlsx-CkFp8p6R.js: 419.47 KiB
- charts-BRJ_mBCz.js: 374.38 KiB
- index-DKQLbfmg.js: 333.61 KiB
- supabase-yKjPlrCh.js: 170.08 KiB
- page-By8mxNjG.js: 83.47 KiB
- page-CI0HImD6.js: 70.76 KiB
- page-DTxZbgzJ.js: 51.58 KiB
- react-BVUA7J8q.js: 48.81 KiB
- icons-C3gIR12W.js: 39.59 KiB
- page-BDscZwhN.js: 32.11 KiB
```

`npm run check:pwa`
```
PWA precache budget check passed.
- 77 precache entries
- XLSX chunks excluded from precache
```

nav-reachability + navigation unit tests
```
✔ every accessible module stays reachable from the v2 shell for all 13 roles
✔ primary nav is always exactly 5 slots in canonical order for all 13 roles
✔ no primary slot points at the same path as another (no duplicate nav targets)
✔ exactly one inbox slot carries the actionable badge
✔ workspace resolves per persona for representative roles
✔ super_admin sees a dedicated tv management nav item
✔ authenticated roles see the room management nav item
✔ weekly report is no longer shown as a top-level nav item
✔ head_nurse sees admin and tv management nav items
✔ department-specific roles see correct modules
✔ department staff roles see limited modules
✔ all roles see the org chart nav item
ℹ tests 12 · pass 12 · fail 0
```

`npm run check:auth-smoke`
```
> tsx scripts/check-authenticated-routes.ts
Error: Missing required environment variable: PORTAL_SMOKE_BASE_URL
    at getRequiredEnv (.../scripts/check-authenticated-routes.ts:20:11)
EXIT=1
```
`test/unit/authenticatedRouteSmoke.test.ts` (the offline structural test for the smoke config) → 3/3 PASS.

---

## 3. Deviations from spec (+ why)

1. **Greeting anchor in `portal-auth-smoke.ts`**: spec §4.3/step 2 mandates the greeting "Chào <tên>,", which changes the copy the auth-smoke gate waits for post-login. Updated the `/dashboard` `expectedText` from `'Xin chào'` to `'Chào'` so the gate stays valid. The offline unit test doesn't assert that value, so it stays green.
2. **Inbox-strip destination**: spec step 2 says the strip points at `/approvals`. For the 4 pure-staff roles `/approvals` is a dead link (RequireAuth denies). `useHomeToday` resolves the strip target from the role's primary-nav inbox slot instead (`getPrimaryNav(role)` → staff get `/requests`, everyone else `/approvals`), so the strip is never a dead link and always agrees with nav slot 2. Matches the shell agent's identical inbox-path deviation; Phase 2's unified `/inbox` supersedes both.
3. **Load stagger via CSS, not `motion`**: implemented the one orchestrated moment as a CSS keyframe utility in `index.css` (`animation-delay` per step) rather than the `motion` package, to avoid pulling framer-motion into the main bundle. `motion` is a dep but is imported nowhere in `src/`; a CSS utility keeps the main chunk lean and respects `prefers-reduced-motion` with one media query.
4. **`useDashboard.ts` deleted (not just trimmed)**: spec said "remove dead role-hardcoded blocks only if nothing else imports them, else leave and note." Nothing else imports it, and the hook is *entirely* those blocks, so the file was removed wholesale rather than emptied.
5. **`useHomeToday` reuses `useActionableCount` + `useBridgeHeartbeat`**: the inbox-strip count and header sync dot come from the existing hooks rather than new queries. This adds a second `useBridgeHeartbeat`/`useActionableCount` instance (TopBar already mounts them) — the same benign duplicate-subscription pattern the shell agent already accepted; not a new pattern. Could be hoisted to context in a later pass.

---

## 4. Blockers

- **`check:auth-smoke` cannot run in this environment.** It requires `PORTAL_SMOKE_BASE_URL` / `PORTAL_SMOKE_USERNAME` / `PORTAL_SMOKE_PASSWORD` env vars, a running portal deployment, and a Chromium binary. It fails at the very first line (missing env var) before touching any Phase 1 code. Independently, project memory records the self-hosted Supabase auth-migration gap (only ~3 `auth.users` rows → portal logins return 400), so even with a base URL the login step would fail for reasons unrelated to this work. **This is an infra/credentials blocker, not a Phase 1 regression.** To exercise it: set the three env vars against a portal instance with a seeded test login, then `npm run check:auth-smoke`.
- **Persona screenshots (mobile 390 / desktop 1440) not captured** — same root cause (no usable auth login in this environment). The spec anticipated this and permits documenting the blocker rather than faking it.

---

## 5. Next agent → Phase 2 (Flow)

- **Goal**: merge `requests` + `approvals` into one "Phê duyệt & Đề nghị" workspace — a unified **`/inbox`** ("Cần xử lý") with two lenses ("Của tôi" / "Chờ tôi"), plus the `SealMark` primitive for fully-approved detail/print views (direction §4.4, §5.3).
- **Wiring already staged for you**:
  - Nav slot 2 + the Home inbox strip both resolve their target through `getPrimaryNav(role)`'s `inbox` slot. When `/inbox` ships, point that slot at it in `src/lib/navigation.ts` and both surfaces follow automatically (no Home edit needed).
  - The badge count (`useActionableCount`) already sums pending approval work + unread notifications and is rendered on slot 2 — extend it to include `fdc_request_handoffs` when the inbox absorbs handoffs.
  - `ChoBanDuyet` widget already reuses `useApprovals().approveRequest/rejectRequest` inline; reuse the same action functions in the inbox item rows for consistency.
- **Do not fold in** the flagged router-gap tightening (`moduleKey` on lab-dashboard/weekly-report, `/valuation` gate) — that stays a separate commit to Minh per the non-negotiables.
- **Gates to re-run**: lint · check:bundle · check:pwa · check:auth-smoke (env permitting) · nav-reachability · plus an approval E2E on a phone viewport.
