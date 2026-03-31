# Lab Dashboard Real Inventory TV Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the synthetic reagent summary on `/lab-dashboard/tv` with real lab inventory chips from `fdc_inventory_snapshots`, while preserving the original card/chip look and adding a slow upward TV marquee.

**Architecture:** Move the reagent section from group-based aggregation (`REAGENT_CONFIGS`, `targetStock`) to row-level inventory chips with stable item keys. Keep the bridge as the single source of truth for item filtering, ordering, and detail payloads, then update the portal summary model and reagent card rendering so the existing card language stays intact while the chip list scrolls upward in a duplicated marquee track.

**Tech Stack:** Node.js bridge, Jest, React 19, TypeScript, Vite, `tsx` node tests, CSS animations

---

### File Structure

**Create**
- `C:\Users\Minh\Desktop\ERP_v1\docs\superpowers\plans\2026-03-24-lab-dashboard-real-inventory-tv.md` - implementation plan for the approved real-inventory TV redesign

**Modify**
- `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\src\labDashboard\types.ts` - bridge reagent summary/detail contracts
- `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\src\labDashboard\service.ts` - replace synthetic reagent grouping with row-level inventory chips and new ordering/status rules
- `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\src\labDashboard\detailHelpers.ts` - keep reagent detail focus/filtering aligned with real item keys
- `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\src\labDashboard\sourceProvenance.ts` - update reagent provenance wording from grouped pseudo-reagents to real inventory rows
- `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\test\unit\labDashboardService.test.ts` - bridge RED/GREEN coverage for real inventory summary/detail payloads
- `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\test\unit\labDashboardDetails.test.ts` - reagent detail filtering/sorting expectations
- `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\test\unit\labDashboardSourceProvenance.test.ts` - provenance wording/structure expectations for the new reagent model
- `C:\Users\Minh\Desktop\ERP_v1\src\types\labDashboard.ts` - portal reagent summary/detail contracts
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\labDashboardDisplayModel.ts` - build item-based reagent chips without `targetStock`
- `C:\Users\Minh\Desktop\ERP_v1\src\components\lab-dashboard\LabDashboardDisplay.tsx` - render the duplicated marquee track and keep card language intact
- `C:\Users\Minh\Desktop\ERP_v1\src\components\lab-dashboard\LabDashboardDetailScreen.tsx` - rename/align reagent detail table columns to real inventory items
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\labDashboardDetailExport.ts` - export real inventory detail rows with item-level labels
- `C:\Users\Minh\Desktop\ERP_v1\src\app\lab-dashboard\lab-dashboard.css` - marquee viewport/track animation and small variable-width chip styling
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\labDashboardDisplayModel.test.ts` - portal RED/GREEN coverage for new chip labels and focus keys
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\labDashboardDetailExport.test.ts` - export expectations for real inventory detail rows
- `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md` - task checklist and verification evidence
- `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-24-lab-dashboard-real-inventory-tv.md` - task verification and closeout notes
- `C:\Users\Minh\Desktop\ERP_v1\tasks\lessons.md` - capture any new correction if implementation reveals a repeatable pitfall

### Task 1: Replace Bridge Reagent Model with Real Inventory Rows

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\src\labDashboard\types.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\src\labDashboard\service.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\src\labDashboard\detailHelpers.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\test\unit\labDashboardService.test.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\test\unit\labDashboardDetails.test.ts`

- [ ] **Step 1: Write the failing bridge tests**

Extend bridge tests so they assert:
- `getLabDashboardCurrent()` returns real inventory rows rather than synthetic groups
- summary reagent rows no longer expose `targetStock`
- row keys come from stable inventory identity (`medicineCode` when present, fallback slug)
- row ordering is lowest stock first, then by name
- reagent detail `focus=all` returns item rows sorted the same way
- reagent detail focus by item key only keeps the selected inventory item

Concrete fixtures to add:
- one lab warehouse row at `0.75`
- several rows at `1`
- one high-volume row (for example `TSH 92`)
- one non-lab warehouse row that must be excluded

- [ ] **Step 2: Run the bridge tests to verify RED**

Run: `cmd /c npx jest test/unit/labDashboardService.test.ts --runInBand`

Expected: FAIL because the bridge still returns `targetStock`-based groups such as `hba1c`, `glucose`, and `thyroid`.

- [ ] **Step 3: Update the bridge reagent contracts**

In `fdc-lan-bridge/src/labDashboard/types.ts`:
- replace `LabDashboardReagent.targetStock` with item-level identity fields needed by the portal (`medicineCode?: string | null` is the minimum)
- keep `currentStock`, `unit`, `status`
- decide whether `name` should already be the real item name; recommended: yes
- keep `LabDashboardReagentFocus = 'all' | \`reagent:${string}\`` but reinterpret the suffix as an item key instead of a synthetic group key

In `fdc-lan-bridge/src/labDashboard/service.ts`:
- remove `REAGENT_CONFIGS`, `allocateReagentRows()`, `matchesReagentConfig()`, `matchesAnyReagentKeyword()`, and all `targetStock` logic from the reagent summary path
- reuse `fetchInventorySnapshotRows(snapshotDate)` + lab warehouse scoping to build a list of real inventory items
- create a stable chip key from `medicine_code` when present, fallback to normalized `name`
- sort summary/detail rows by `current_stock ASC`, then `name ASC`
- keep the blank-unit fallback aligned with inventory management (`Cái`)
- compute status heuristics row-by-row:
  - `critical` when `currentStock <= 1`
  - `low` when `currentStock > 1 && currentStock <= 2`
  - `ok` otherwise
- ensure the same item set powers both summary payload and reagent detail payload

In `fdc-lan-bridge/src/labDashboard/detailHelpers.ts`:
- update reagent focus filtering so `focus=all` returns all inventory rows
- update `focus=reagent:<key>` to filter by the new item key instead of `reagentKey` group names

- [ ] **Step 4: Run the bridge tests to verify GREEN**

Run:
- `cmd /c npx jest test/unit/labDashboardService.test.ts --runInBand`
- `cmd /c npx jest test/unit/labDashboardDetails.test.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit the bridge slice**

Run:
```bash
git add fdc-lan-bridge/src/labDashboard/types.ts fdc-lan-bridge/src/labDashboard/service.ts fdc-lan-bridge/src/labDashboard/detailHelpers.ts fdc-lan-bridge/test/unit/labDashboardService.test.ts fdc-lan-bridge/test/unit/labDashboardDetails.test.ts
git commit -m "feat: use real inventory rows for lab dashboard reagents"
```

### Task 2: Update Reagent Provenance and Detail Exports for Real Items

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\src\labDashboard\sourceProvenance.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\test\unit\labDashboardSourceProvenance.test.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\components\lab-dashboard\LabDashboardDetailScreen.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\lib\labDashboardDetailExport.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\test\unit\labDashboardDetailExport.test.ts`

- [ ] **Step 1: Write the failing provenance/export tests**

Add expectations that:
- reagent provenance says the section now displays real `fdc_inventory_snapshots` rows from the lab warehouse
- reagent detail empty-state text no longer says “reagent đang chọn” in a synthetic-group sense
- reagent export rows use the real inventory item name as the main label, not `reagentName` group labels

- [ ] **Step 2: Run the targeted tests to verify RED**

Run:
- `cmd /c npx jest test/unit/labDashboardSourceProvenance.test.ts --runInBand`
- `cmd /c npx tsx --test test\unit\labDashboardDetailExport.test.ts`

Expected: FAIL because provenance/export still reflect grouped pseudo-reagents.

- [ ] **Step 3: Implement the minimal provenance/export/detail changes**

In `fdc-lan-bridge/src/labDashboard/sourceProvenance.ts`:
- update reagent wording so it explains “real inventory rows from `fdc_inventory_snapshots` scoped to the lab warehouse”
- remove wording about “claim order”, “matching into reagent groups”, or first-match assignment
- describe the new pipeline as:
  - latest positive-stock snapshot
  - lab warehouse scope
  - row-level sorting for TV/detail
  - focus filter by item or all

In `src/components/lab-dashboard/LabDashboardDetailScreen.tsx`:
- change reagent detail table labels from “Reagent” to an item-level label such as `Vật tư`
- use the real item name as the main first column

In `src/lib/labDashboardDetailExport.ts`:
- export reagent detail rows with item-level wording, ideally `Vật tư`, `Mã vật tư`, `Kho`, `Tồn`, `Đơn vị`, `Ngày snapshot`

- [ ] **Step 4: Run the targeted tests to verify GREEN**

Run:
- `cmd /c npx jest test/unit/labDashboardSourceProvenance.test.ts --runInBand`
- `cmd /c npx tsx --test test\unit\labDashboardDetailExport.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the provenance/export slice**

Run:
```bash
git add fdc-lan-bridge/src/labDashboard/sourceProvenance.ts fdc-lan-bridge/test/unit/labDashboardSourceProvenance.test.ts src/components/lab-dashboard/LabDashboardDetailScreen.tsx src/lib/labDashboardDetailExport.ts test/unit/labDashboardDetailExport.test.ts
git commit -m "feat: align reagent provenance and detail export with real inventory"
```

### Task 3: Rebuild Portal Summary Model and TV Card with Marquee Motion

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\types\labDashboard.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\lib\labDashboardDisplayModel.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\components\lab-dashboard\LabDashboardDisplay.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\lab-dashboard\lab-dashboard.css`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\test\unit\labDashboardDisplayModel.test.ts`

- [ ] **Step 1: Write the failing portal tests**

Update `test/unit/labDashboardDisplayModel.test.ts` so it asserts:
- reagent chips no longer require `targetStock`
- `quantityLabel` is just `currentStock unit`
- chip focus keys come from real inventory item keys
- summary model exposes enough data to render duplicated marquee rows without recomputing business logic in the component

If needed, add one new expectation for long-name support, for example that a chip name preserves the full string coming from the payload.

- [ ] **Step 2: Run the portal display-model test to verify RED**

Run: `cmd /c npx tsx --test test\unit\labDashboardDisplayModel.test.ts`

Expected: FAIL because the current model still formats `1 / 2 Cái` and expects `targetStock`.

- [ ] **Step 3: Update the shared portal reagent types**

In `src/types/labDashboard.ts`:
- mirror the bridge reagent summary/detail changes
- remove `targetStock`
- add item-level identity fields needed by the portal summary card and detail screen

- [ ] **Step 4: Update the summary model**

In `src/lib/labDashboardDisplayModel.ts`:
- make `reagentChips` represent real inventory items
- keep `reagentLayout: 'compact'`
- change `quantityLabel` to `${currentStock} ${unit}`
- replace `percentage = currentStock / targetStock` with a display-only bar value
  - recommended: normalize by the max stock value currently shown, with a floor for low-stock items so the bar remains visible
- preserve the full item name string

- [ ] **Step 5: Update the TV reagent card rendering**

In `src/components/lab-dashboard/LabDashboardDisplay.tsx`:
- keep the current reagent card header and chip markup language
- render a fixed-height reagent viewport
- render two copies of the reagent chip list inside a track for continuous upward scrolling
- preserve drill-down buttons in TV mode
- use the new item key in `openDetail({ section: 'reagents', focus: reagent.focus })`

In `src/app/lab-dashboard/lab-dashboard.css`:
- keep `.lab-dashboard-reagent` visually close to the original compact chip
- allow the chip name to wrap to two lines
- keep widths variable (`width: auto`, `flex: 0 0 auto`) instead of forcing equal-length cards
- add the viewport/track animation classes for a slow upward marquee
- ensure the card area stays visually full without obvious empty gaps during the loop

- [ ] **Step 6: Run the portal display-model test to verify GREEN**

Run: `cmd /c npx tsx --test test\unit\labDashboardDisplayModel.test.ts`

Expected: PASS

- [ ] **Step 7: Commit the portal summary slice**

Run:
```bash
git add src/types/labDashboard.ts src/lib/labDashboardDisplayModel.ts src/components/lab-dashboard/LabDashboardDisplay.tsx src/app/lab-dashboard/lab-dashboard.css test/unit/labDashboardDisplayModel.test.ts
git commit -m "feat: show real inventory chips on lab dashboard tv"
```

### Task 4: Verify End-to-End and Record Evidence

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-24-lab-dashboard-real-inventory-tv.md`
- Modify if needed: `C:\Users\Minh\Desktop\ERP_v1\tasks\lessons.md`

- [ ] **Step 1: Run the full bridge suite**

Run: `cmd /c npm test`
Workdir: `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge`

Expected: PASS

- [ ] **Step 2: Run the bridge build**

Run: `cmd /c npm run build`
Workdir: `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge`

Expected: PASS

- [ ] **Step 3: Run the targeted portal unit tests**

Run:
- `cmd /c npx tsx --test test\unit\labDashboardDisplayModel.test.ts`
- `cmd /c npx tsx --test test\unit\labDashboardDetailExport.test.ts`

Expected: PASS

- [ ] **Step 4: Run the portal production build**

Run: `cmd /c npm run build`
Workdir: `C:\Users\Minh\Desktop\ERP_v1`

Expected: PASS

- [ ] **Step 5: Manually smoke the live UI behavior**

Check in a browser:
- `/lab-dashboard/tv` shows only real inventory chips from the lab warehouse
- no chip displays `0 / N`
- chip value format is `stock + unit` only
- names wrap/read cleanly from a distance
- marquee speed is slow and comfortable
- `/lab-dashboard/details?section=reagents&focus=all` shows item rows instead of pseudo-reagent groups

- [ ] **Step 6: Record evidence and residual risks**

Update `tasks/todo.md` and `tasks/active/2026-03-24-lab-dashboard-real-inventory-tv.md` with:
- exact commands run
- pass/fail results
- any remaining rollout gap (for example live restart/deploy pending)

- [ ] **Step 7: Commit workflow evidence**

Run:
```bash
git add tasks/todo.md tasks/active/2026-03-24-lab-dashboard-real-inventory-tv.md tasks/lessons.md
git commit -m "docs: record real inventory tv verification"
```
