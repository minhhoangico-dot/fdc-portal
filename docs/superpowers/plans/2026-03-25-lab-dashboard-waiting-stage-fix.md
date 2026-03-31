# Lab Dashboard Waiting Stage Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop lab patients with active/completed HIS execution timestamps from appearing in `Chờ lấy mẫu`, and keep billing-only `Chênh lệch BH - ...` rows out of the queue entirely.

**Architecture:** Patch the shared bridge timeline CTE because both the summary queue cards and queue/TAT detail views depend on the same stage classification. Extend the existing unit test fixture with live-data-like rows so the regression is locked in before changing the SQL string.

**Tech Stack:** TypeScript, Jest, PostgreSQL SQL in `fdc-lan-bridge`

---

### Task 1: Lock The Regression In Tests

**Files:**
- Modify: `fdc-lan-bridge/test/unit/labDashboardService.test.ts`
- Test: `fdc-lan-bridge/test/unit/labDashboardService.test.ts`

- [ ] **Step 1: Write the failing test**

Add fixture rows for:
- a real lab row with blank `order_date`/`data_date` but populated `do_servicedatadate`/`end_date`
- a `Chênh lệch BH - ...` row that should never appear in the queue

- [ ] **Step 2: Run test to verify it fails**

Run: `cmd /c npx jest test/unit/labDashboardService.test.ts --runInBand`
Expected: waiting queue assertions fail because the current logic still classifies those rows as `waiting`.

- [ ] **Step 3: Write minimal implementation**

Do not touch production code yet; stop once the regression is proven red.

### Task 2: Patch Shared Timeline Semantics

**Files:**
- Modify: `fdc-lan-bridge/src/labDashboard/service.ts`
- Test: `fdc-lan-bridge/test/unit/labDashboardService.test.ts`

- [ ] **Step 1: Update the query signals**

Change the shared CTE so root/child stage timestamps use:
- `processing_at = COALESCE(valid order_date, valid do_servicedatadate)`
- `result_at = COALESCE(valid data_date, valid end_date, child fallback)`

Also exclude billing artifacts with `servicename NOT ILIKE 'Chênh lệch BH - %'`.

- [ ] **Step 2: Run targeted test**

Run: `cmd /c npx jest test/unit/labDashboardService.test.ts --runInBand`
Expected: PASS.

- [ ] **Step 3: Run broader bridge verification**

Run: `cmd /c npm test`
Expected: PASS.

- [ ] **Step 4: Build**

Run: `cmd /c npm run build`
Expected: PASS.

### Task 3: Capture Live-Proof Notes

**Files:**
- Modify: `tasks/active/2026-03-25-lab-dashboard-waiting-stage-fix.md`
- Modify: `tasks/todo.md`
- Modify: `tasks/lessons.md`

- [ ] **Step 1: Record verification evidence**

Write down the exact commands and the live queue check for patient `23009760`.

- [ ] **Step 2: Append the lesson**

Document that lab queue stage detection must not rely on `order_date`/`data_date` alone and must ignore `Chênh lệch BH - ...` rows.
