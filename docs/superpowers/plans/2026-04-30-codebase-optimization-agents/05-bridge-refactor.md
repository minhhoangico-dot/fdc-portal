# Bridge Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the largest bridge dashboard and weekly-report files into smaller modules while preserving API behavior.

**Architecture:** Keep current public functions as facades, move loader/query families into focused files, and run bridge tests after each extraction to catch SQL or mapping regressions quickly.

**Tech Stack:** Node.js, TypeScript, PostgreSQL/HIS queries, Supabase, Jest/ts-jest.

---

## Ownership

**Owns:**
- `fdc-lan-bridge/src/labDashboard/service.ts`
- `fdc-lan-bridge/src/labDashboard/loaders/**`
- `fdc-lan-bridge/src/weeklyReport/queries.ts`
- `fdc-lan-bridge/src/weeklyReport/queries/**`
- `fdc-lan-bridge/src/weeklyReport/store.ts`
- Bridge tests directly affected by these files.

**Avoids:**
- Portal `src/**`.
- SQL migrations unless a measured issue requires a separate data plan.

## Steps

- [ ] **Step 1: Confirm Agent 01 is complete**

Check the active task spec for green bridge test evidence.

- [ ] **Step 2: Freeze lab dashboard behavior**

Run in `fdc-lan-bridge`:

```powershell
cmd /c npx.cmd jest test/unit/labDashboardService.test.ts test/unit/labDashboardDetails.test.ts test/unit/labDashboardSourceProvenance.test.ts test/integration/server.test.ts --runInBand
```

Expected:
- All pass.

- [ ] **Step 3: Create loader folder**

Create:
- `fdc-lan-bridge/src/labDashboard/loaders/shared.ts`
- `fdc-lan-bridge/src/labDashboard/loaders/queue.ts`
- `fdc-lan-bridge/src/labDashboard/loaders/tat.ts`
- `fdc-lan-bridge/src/labDashboard/loaders/abnormal.ts`
- `fdc-lan-bridge/src/labDashboard/loaders/reagents.ts`

Each file should include the existing license header.

- [ ] **Step 4: Move queue loader**

Move queue SQL, row mapping, summary loading, and detail loading from `service.ts` into `loaders/queue.ts`.

Keep `getLabDashboardCurrent()` and `getLabDashboardDetails()` exported from `service.ts`.

Verify:

```powershell
cmd /c npx.cmd jest test/unit/labDashboardService.test.ts --runInBand
cmd /c npm.cmd run build
```

- [ ] **Step 5: Move TAT loader**

Move TAT logic into `loaders/tat.ts`.

Run the same test/build pair.

- [ ] **Step 6: Move abnormal loader**

Move abnormal result logic into `loaders/abnormal.ts`.

Run the same test/build pair.

- [ ] **Step 7: Move reagent loader**

Move reagent snapshot logic into `loaders/reagents.ts`.

Run the same test/build pair.

- [ ] **Step 8: Verify full lab dashboard surface**

Run:

```powershell
cmd /c npx.cmd jest test/unit/labDashboardService.test.ts test/unit/labDashboardDetails.test.ts test/unit/labDashboardSourceProvenance.test.ts test/integration/server.test.ts --runInBand
cmd /c npm.cmd run build
```

Expected:
- Tests pass.
- Build passes.
- `fdc-lan-bridge/src/labDashboard/service.ts` is below 450 lines or the remaining sections are documented.

- [ ] **Step 9: Split weekly report query families**

Create:
- `fdc-lan-bridge/src/weeklyReport/queries/examination.ts`
- `fdc-lan-bridge/src/weeklyReport/queries/laboratory.ts`
- `fdc-lan-bridge/src/weeklyReport/queries/imaging.ts`
- `fdc-lan-bridge/src/weeklyReport/queries/procedures.ts`
- `fdc-lan-bridge/src/weeklyReport/queries/infectious.ts`
- `fdc-lan-bridge/src/weeklyReport/queries/transfer.ts`

Keep `fdc-lan-bridge/src/weeklyReport/queries.ts` as a facade exporting existing public function names.

- [ ] **Step 10: Tighten weekly report store selects**

In `fdc-lan-bridge/src/weeklyReport/store.ts`, replace broad `.select("*")` calls with explicit column constants only after confirming every consumed column.

Do not change row shape returned to callers.

- [ ] **Step 11: Verify weekly report**

Run:

```powershell
cmd /c npx.cmd jest test/unit/weeklyReportQueries.test.ts --runInBand
cmd /c npm.cmd run build
```

Expected:
- Tests pass.
- Build passes.

- [ ] **Step 12: Full bridge verification**

Run:

```powershell
cmd /c npm.cmd test -- --runInBand
cmd /c npm.cmd run build
```

- [ ] **Step 13: Record evidence and commit**

Update `tasks/active/2026-04-30-codebase-optimization.md` with before/after file sizes and command output summary.

Commit:

```powershell
git add fdc-lan-bridge/src/labDashboard fdc-lan-bridge/src/weeklyReport fdc-lan-bridge/test tasks/active/2026-04-30-codebase-optimization.md
git commit -m "refactor: split bridge dashboard queries"
```

