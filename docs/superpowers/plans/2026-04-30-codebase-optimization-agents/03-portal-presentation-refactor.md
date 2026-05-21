# Portal Presentation Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the size and risk of the largest portal presentation files without changing behavior.

**Architecture:** Extract repeated UI sections from large page/tab files into colocated components. Keep data fetching and business logic in existing viewmodels/helpers, preserving the portal MVVM pattern.

**Tech Stack:** React 19, TypeScript, Recharts, existing portal viewmodels and unit helpers.

---

## Ownership

**Owns:**
- `src/app/pharmacy/page.tsx`
- `src/app/pharmacy/PharmacyFilters.tsx`
- `src/app/pharmacy/PharmacyKpiGrid.tsx`
- `src/app/pharmacy/PharmacyInventoryTable.tsx`
- `src/app/pharmacy/PharmacyCharts.tsx`
- `src/app/inventory/OverviewTab.tsx`
- `src/app/inventory/overview/**`

**Avoids:**
- `src/App.tsx`
- `vite.config.ts`
- `src/viewmodels/**`
- Bridge code.

## Steps

- [ ] **Step 1: Confirm Agent 01 is complete**

Check the task spec for green baseline verification.

- [ ] **Step 2: Snapshot current file sizes**

Run:

```powershell
Get-Content src\app\pharmacy\page.tsx | Measure-Object -Line
Get-Content src\app\inventory\OverviewTab.tsx | Measure-Object -Line
```

Record counts in `tasks/active/2026-04-30-codebase-optimization.md`.

- [ ] **Step 3: Extract pharmacy filters**

Create `src/app/pharmacy/PharmacyFilters.tsx` with the existing search/filter controls.

Expected public shape:

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PharmacyFiltersProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

export function PharmacyFilters(props: PharmacyFiltersProps) {
  return null;
}
```

Replace `return null` with the existing markup moved from the page.

- [ ] **Step 4: Extract pharmacy KPI cards**

Create `src/app/pharmacy/PharmacyKpiGrid.tsx`.

Move only display markup. Derived status/count logic should stay in current helpers or the page until a tested helper boundary exists.

- [ ] **Step 5: Extract pharmacy table**

Create `src/app/pharmacy/PharmacyInventoryTable.tsx`.

Move table row rendering and action callbacks as props. Do not add Supabase calls.

- [ ] **Step 6: Extract pharmacy charts**

Create `src/app/pharmacy/PharmacyCharts.tsx`.

Move Recharts markup and chart props. Keep chart data as props.

- [ ] **Step 7: Verify pharmacy page**

Run:

```powershell
cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\pharmacyInventoryPresentation.test.ts
cmd /c npm.cmd run build
```

Expected:
- Tests pass.
- Build passes.
- `src/app/pharmacy/page.tsx` is below 500 lines.

- [ ] **Step 8: Extract inventory overview KPI grid**

Create `src/app/inventory/overview/InventoryKpiGrid.tsx` and move KPI-card markup from `OverviewTab.tsx`.

- [ ] **Step 9: Extract inventory overview charts**

Create `src/app/inventory/overview/InventoryCharts.tsx` and move chart markup from `OverviewTab.tsx`.

- [ ] **Step 10: Extract inventory alerts panel**

Create `src/app/inventory/overview/InventoryAlertsPanel.tsx` and move anomaly/alert display markup from `OverviewTab.tsx`.

- [ ] **Step 11: Verify inventory overview**

Run:

```powershell
cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\inventoryDashboardSummary.test.ts
cmd /c npm.cmd run build
```

Expected:
- Tests pass.
- Build passes.
- `src/app/inventory/OverviewTab.tsx` is below 550 lines.

- [ ] **Step 12: Record evidence and commit**

Update the active task spec with before/after line counts and commands.

Commit:

```powershell
git add src/app/pharmacy src/app/inventory tasks/active/2026-04-30-codebase-optimization.md
git commit -m "refactor: split inventory presentation components"
```

