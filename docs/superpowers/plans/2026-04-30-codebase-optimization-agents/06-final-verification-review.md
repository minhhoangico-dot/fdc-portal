# Final Verification And Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove all optimization work is integrated, behavior-preserving, and documented.

**Architecture:** Run portal and bridge verification after all implementation agents finish, compare final bundle/module metrics against the baseline, review for scope drift, and record residual risks in the repo workflow files.

**Tech Stack:** Vite build, TypeScript, node:test/tsx, Jest, repo `tasks/` workflow.

---

## Ownership

**Owns:**
- `tasks/active/2026-04-30-codebase-optimization.md`
- `tasks/todo.md`
- `tasks/handoffs/**`
- `tasks/decisions.md` only for durable process/architecture decisions.
- `tasks/lessons.md` only after user correction or avoidable miss.

**Avoids:**
- Production source edits unless the failure is a tiny verification-only fix. Otherwise return the issue to the owning agent scope.

## Steps

- [ ] **Step 1: Confirm implementation agents are complete**

Review:
- `tasks/active/2026-04-30-codebase-optimization.md`
- `tasks/handoffs/**`
- `git status --short`

Identify any overlapping edits or unresolved handoffs before running final checks.

- [ ] **Step 2: Run full portal verification**

Run at repo root:

```powershell
cmd /c npm.cmd run lint
cmd /c npm.cmd run build
cmd /c npm.cmd run check:bundle
cmd /c npm.cmd run check:pwa
```

Expected:
- All pass.
- Main chunk is below 950 kB.
- XLSX is not precached.

- [ ] **Step 3: Run affected portal unit tests**

Run:

```powershell
cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\pharmacyInventoryPresentation.test.ts test\unit\inventoryDashboardSummary.test.ts test\unit\approvalActions.test.ts test\unit\approvalConfigState.test.ts test\unit\supabaseRealtime.test.ts
```

Expected:
- All pass.

- [ ] **Step 4: Run bridge verification**

Run in `fdc-lan-bridge`:

```powershell
cmd /c npm.cmd run build
cmd /c npm.cmd test -- --runInBand
```

Expected:
- Build passes.
- All Jest suites pass.

- [ ] **Step 5: Record bundle and file metrics**

Capture:
- Main portal chunk size.
- Largest route/vendor chunk size.
- XLSX chunk size.
- CSS size.
- PWA precache count and size if available.
- Line counts for files targeted by the refactor.

Use:

```powershell
Get-ChildItem dist\assets -File | Sort-Object Length -Descending | Select-Object Name,Length
Get-Content src\app\pharmacy\page.tsx | Measure-Object -Line
Get-Content src\app\inventory\OverviewTab.tsx | Measure-Object -Line
Get-Content fdc-lan-bridge\src\labDashboard\service.ts | Measure-Object -Line
Get-Content fdc-lan-bridge\src\weeklyReport\queries.ts | Measure-Object -Line
```

- [ ] **Step 6: Browser smoke lazy routes**

Start dev server:

```powershell
cmd /c npm.cmd run dev
```

Smoke manually or with Playwright:
- `/login`
- `/dashboard`
- `/inventory`
- `/pharmacy`
- `/lab-dashboard/tv`
- `/weekly-report`
- `/admin`

Expected:
- Lazy routes load.
- Existing auth and onsite gates still render.
- No blank route screen after chunk loading.

- [ ] **Step 7: Review for scope drift**

Check:

```powershell
git diff --stat
git diff -- src fdc-lan-bridge/src vite.config.ts package.json tsconfig.json
```

Review for:
- Product behavior changes not called for by the plan.
- New relative portal imports instead of `@/`.
- Missing license headers in new source files.
- SQL/index changes without measurement.
- Agents editing outside their scopes.

- [ ] **Step 8: Update workflow files**

In `tasks/active/2026-04-30-codebase-optimization.md`, record:
- Commands run and results.
- Before/after metrics.
- Remaining risks.
- Any blocked checks.

Update `tasks/todo.md` status to `verified` or `blocked` with a reason.

- [ ] **Step 9: Commit closeout**

```powershell
git add tasks/active/2026-04-30-codebase-optimization.md tasks/todo.md tasks/handoffs tasks/decisions.md tasks/lessons.md
git commit -m "docs: record optimization verification"
```

