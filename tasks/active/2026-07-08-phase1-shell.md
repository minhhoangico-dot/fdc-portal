# Phase 1 — Shell, Tokens, Home "Hôm nay" (build spec)

- **Date**: 2026-07-08 · **Owner**: Opus 4.8 (+ sonnet subagents for mechanical work)
- **Direction**: `tasks/active/2026-07-08-ux-redesign-user-centric.md` (§4.3, §5 are law)
- **Audit**: `tasks/handoffs/2026-07-08-ux-audit-current-state.md` — **read fully before coding**; §8 lists the exact shell file-set. Verify claims cheaply before relying on them (e.g. whether `src/lib/supabase-realtime.ts` exists on THIS branch — it may live only on `codex/portal-viewmodel-realtime`).

## Scope

**IN**: `src/ui/tokens.css` (transcribe §5.1 verbatim) · `src/ui/` primitives: `PageHeader, KpiCard, StatusBadge, TabBar, EmptyState, WidgetCard` · AppShell v2 (BottomNav mobile / Sidebar desktop / TopBar slim) · nav model v2 in `src/lib/navigation.ts` · Home "Hôm nay" replacing `/dashboard` content · widget registry · inbox-badge count hook.

**OUT (later phases)**: unified inbox page (Phase 2 — the `Cần xử lý` nav slot points at existing `/approvals` with the badge for now) · `SealMark` (Phase 2) · any module merge (Phase 3) · `DataTable`/`ChartFrame` (build with first consumer in Phase 3) · fixing `StocktakeTab` layer leak (Phase 3) · head_nurse authority change (open decision §8.5 — do NOT alter).

## Build order

1. **Fonts + tokens**: self-host Be Vietnam Pro (woff2, weights 400/500/600/700, vietnamese+latin subsets → `public/fonts/`, `@font-face` + preload in `index.html`). `src/ui/tokens.css` imported once in `src/main.tsx` styles chain. Update PWA `theme_color` → `#0B7A5C` in `vite.config.ts`.
2. **Primitives** (`src/ui/`, no supabase imports — enforce by review):
   - `StatusBadge` — the single source of status→color; API `status: 'ok'|'warn'|'danger'|'info'|'neutral'` + label. Rectangular, radius-field, 100-tint bg + 600 text.
   - `KpiCard` — value (tabular-nums, 22/600), label (13 ink-600), optional delta + icon slot. No gradients, shadow-card only.
   - `PageHeader` — title 22/700 ink-900, optional sub, actions slot right.
   - `TabBar` — existing gray-100 pill pattern, tokenized (active = card bg + brand-600 text).
   - `EmptyState`, `WidgetCard` (card + 16px pad + header row).
3. **Nav model v2** (`src/lib/navigation.ts`): keep `NAV_ITEMS` export for legacy pages; add `getPrimaryNav(role): NavItem[5]` = Hôm nay(/dashboard) · Cần xử lý(/approvals, badge) · workspace · Tra cứu · Cá nhân(/portal). Workspace resolution (first match): `admin.manage`→Quản trị(/admin) EXCEPT roles also matching below; accounting roles (`inventory.view`+`valuation.view`)→Kho(/inventory); `attendance.view_team`→Chấm công(/attendance); `approvals.approve` (leadership)→Phê duyệt(/approvals — then slot 2 dedupes to Đề nghị(/requests)); else→Đề nghị(/requests). Tra cứu = disclosure menu listing EVERY matrix-visible module not in the other 4 slots — this **un-orphans** `weekly_report`, `lab_dashboard`, `valuation`, org-chart, room/TV management. No module a role can access may become unreachable: add a unit check comparing `getAccessibleModules(role)` vs reachable-from-shell set for all 13 roles.
4. **AppShell v2** (`src/components/layout/`): BottomNav — 64px, 5 slots, icon 24 + 11px label, active brand-600 + 2px top indicator, badge = danger-600 count pill on slot 2. Sidebar (≥1024px) — 264px, paper bg, brand wordmark, 5 primary + Tra cứu group expanded, admin footer link for `admin.view`. TopBar slims to: page title + sync dot (`isBridgeHeartbeatStale`) + NotificationCenter + avatar. Old pages render unchanged inside.
5. **Home "Hôm nay"** (`src/app/dashboard/page.tsx` + new `src/viewmodels/useHomeToday.ts`): layout per direction §4.3. Greeting 34/600 ("Chào <tên>,"), VN date line 14 ink-600, sync dot. Inbox strip: full-width brand-50 card, "Cần xử lý" + count 28/700 brand-700, → /approvals. Widget grid: 1-col mobile, `md:grid-cols-2`, `xl:grid-cols-3`.
   **Widget registry** (`src/lib/home-widgets.ts`): `{ key, permissionAction: PermissionAction, title, Component: lazy, span? }[]`; filter by `can(user.role, action)`. Widgets (each fetches via its own small hook, `Promise.allSettled` semantics — one failure ≠ blank home): `cho-ban-duyet` (approvals.review_assigned; top-3 pending steps, inline Duyệt/Từ chối reusing useApprovals actions), `di-muon-hom-nay` (attendance.view_team), `ton-kho` (inventory.view or pharmacy.view; total value + anomaly count), `de-nghi-cua-toi` (requests.view_own; status chips), `bridge-health` (admin.view). Replaces the role-hardcoded blocks in `useDashboard.ts`/`dashboard/page.tsx` (audit: hardcode hotspot). Load stagger 60ms/step, 250ms total, `prefers-reduced-motion: reduce` → none.
6. **Badge hook** `useActionableCount()`: pending approval steps for me + unread notifications; reuse existing realtime helper if present, else the NotificationCenter pattern — do not invent a third.

## Gates (all must pass; record results in handoff)

`npm run lint` · `npm run check:bundle` (watch: Be Vietnam Pro is NOT in JS budget but IS in PWA precache — subset aggressively; if `check:pwa` fails, drop to 3 weights) · `npm run check:pwa` · `npm run check:auth-smoke` · nav-reachability unit check (step 3) · screenshots (mobile 390px + desktop 1440px) for one role per persona — **note**: self-hosted Supabase has only 3 auth users (memory: auth migration gap); if logins fail, screenshot via seeded local test user or document the blocker rather than faking it.

## Non-negotiables

Every existing URL keeps working · permission matrix semantics untouched (UI-side only) · Vietnamese labels from direction doc verbatim · no bridge edits · router-gap tightening (`moduleKey` on lab-dashboard/weekly-report, valuation gate) is a **separate commit** flagged to Minh, not folded into the shell commit.

## Handoff

Write `tasks/handoffs/2026-07-08-phase1-shell-<status>.md`: what shipped, gate outputs verbatim, screenshots list, deviations from this spec + why, next-agent pointer to Phase 2.
