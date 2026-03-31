# Lab Dashboard TAT Test Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Tên test` column to every `Chi tiết TAT` row so operators can see which test each TAT record belongs to.

**Architecture:** Extend the bridge TAT detail payload with `testName` directly from the timeline query, then thread that field through shared types into the detail table and Excel export. Keep the change contract-driven so UI and export stay aligned without extra client fetches.

**Tech Stack:** TypeScript, Jest, tsx tests, React, PostgreSQL query strings in `fdc-lan-bridge`

---

### Task 1: Lock Contract Changes In Tests

**Files:**
- Modify: `fdc-lan-bridge/test/unit/labDashboardDetails.test.ts`
- Modify: `test/unit/labDashboardDetailExport.test.ts`

- [ ] **Step 1: Write the failing test**

Add assertions that TAT detail rows and exported rows include `testName`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cmd /c npx jest test/unit/labDashboardDetails.test.ts --runInBand`
Expected: FAIL because TAT detail rows do not expose `testName`.

Run: `cmd /c npx tsx --test test/unit/labDashboardDetailExport.test.ts`
Expected: FAIL because the TAT export headers/rows do not include `Tên test`.

### Task 2: Extend Bridge Payload

**Files:**
- Modify: `fdc-lan-bridge/src/labDashboard/service.ts`
- Modify: `fdc-lan-bridge/src/labDashboard/detailHelpers.ts`
- Modify: `fdc-lan-bridge/src/labDashboard/types.ts`

- [ ] **Step 1: Add `testName` to the timeline query and mapped TAT rows**

Use `tb_servicedata.servicename` as the source and preserve the existing sorting/filtering.

- [ ] **Step 2: Run bridge detail test**

Run: `cmd /c npx jest test/unit/labDashboardDetails.test.ts --runInBand`
Expected: PASS.

### Task 3: Render And Export The New Column

**Files:**
- Modify: `src/types/labDashboard.ts`
- Modify: `src/components/lab-dashboard/LabDashboardDetailScreen.tsx`
- Modify: `src/lib/labDashboardDetailExport.ts`
- Modify: `test/unit/labDashboardDetailExport.test.ts`

- [ ] **Step 1: Add the `Tên test` column to the TAT table and export helper**

Keep column ordering stable: `Mã BN` → `Nhóm XN` → `Tên test` → timestamps/metrics.

- [ ] **Step 2: Run portal export test**

Run: `cmd /c npx tsx --test test/unit/labDashboardDetailExport.test.ts`
Expected: PASS.

- [ ] **Step 3: Run builds**

Run: `cmd /c npm run build`
Expected: PASS.

Run: `cmd /c npm run build` in `fdc-lan-bridge`
Expected: PASS.
