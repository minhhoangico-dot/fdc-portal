# Lab Dashboard Detail Scroll Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/lab-dashboard/tv` detail mode scroll correctly inside the detail table area and let operators export the currently opened focus to `.xlsx`.

**Architecture:** Keep the bridge contract unchanged and implement the follow-up entirely in the portal. Add a focused export helper in `src/lib/` that maps the current detail payload into display-aligned spreadsheet rows and lazy-loads `xlsx` only when the operator clicks export. Update the detail screen and shared lab-dashboard stylesheet so the action bar stays fixed while only the table region owns scrolling.

**Tech Stack:** React 19, TypeScript, Vite, `tsx` node tests, browser-side `xlsx`

---

### File Structure

**Create**
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\labDashboardDetailExport.ts` - export mapping, filename sanitization, availability checks, lazy workbook generation
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\labDashboardDetailExport.test.ts` - unit coverage for export mapping, filename rules, and availability logic
- `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-23-lab-dashboard-detail-scroll-export.md` - task-local workflow spec for this follow-up

**Modify**
- `C:\Users\Minh\Desktop\ERP_v1\package.json` - add `xlsx`
- `C:\Users\Minh\Desktop\ERP_v1\package-lock.json` - lock dependency update
- `C:\Users\Minh\Desktop\ERP_v1\src\components\lab-dashboard\LabDashboardDetailScreen.tsx` - wire export button and keep header actions fixed
- `C:\Users\Minh\Desktop\ERP_v1\src\app\lab-dashboard\lab-dashboard.css` - fix min-height/overflow chain so the table area scrolls
- `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md` - record follow-up checklist and verification evidence

### Task 1: Build Export Helper with TDD

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\lib\labDashboardDetailExport.ts`
- Test: `C:\Users\Minh\Desktop\ERP_v1\test\unit\labDashboardDetailExport.test.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\package.json`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\package-lock.json`

- [ ] **Step 1: Write the failing export tests**

Add tests that cover:
- queue export headers and badge/date formatting
- tat export headers, `p` minute formatting, and `—` null handling
- abnormal export headers and severity/flag display
- reagent export headers and stock formatting
- filename sanitization for `type:hoa-sinh`
- availability logic for `tab='source'`, loading-without-payload, and loaded rows during refresh

- [ ] **Step 2: Run the new export tests to verify RED**

Run: `cmd /c npx tsx --test test\unit\labDashboardDetailExport.test.ts`
Expected: FAIL because `src/lib/labDashboardDetailExport.ts` does not exist yet.

- [ ] **Step 3: Add the `xlsx` dependency**

Run: `cmd /c npm install xlsx`
Expected: `package.json` and `package-lock.json` include `xlsx` without touching unrelated packages.

- [ ] **Step 4: Implement the minimal export helper**

Implement:
- `buildLabDashboardDetailExportFilename(section, focus, asOfDate)`
- `getLabDashboardDetailExportState({ activeTab, loading, payload })`
- `buildLabDashboardDetailExportRows(payload)` that maps the exact visible columns with display-safe values
- `exportLabDashboardDetailToWorkbook(payload)` that lazy-loads `xlsx`, creates one worksheet named from the section, and returns a browser download action

Formatting rules to encode:
- dates use the same `HH:mm dd/MM` formatter as the detail screen
- minutes use `37p`
- null-ish values become `—`
- queue stage labels are exported in Vietnamese
- abnormal flag column uses `abnormalFlag || severity`

- [ ] **Step 5: Run the export tests to verify GREEN**

Run: `cmd /c npx tsx --test test\unit\labDashboardDetailExport.test.ts`
Expected: PASS

- [ ] **Step 6: Commit the helper slice**

Run:
```bash
git add package.json package-lock.json src/lib/labDashboardDetailExport.ts test/unit/labDashboardDetailExport.test.ts
git commit -m "feat: add lab dashboard detail excel export helper"
```

### Task 2: Wire Export UI and Fix Inner Scroll

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\components\lab-dashboard\LabDashboardDetailScreen.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\lab-dashboard\lab-dashboard.css`
- Read for regression target: `C:\Users\Minh\Desktop\ERP_v1\to be intergrate\lab-dashboard.html`

- [ ] **Step 1: Write the failing integration-facing test(s) or assertions first**

Extend `test/unit/labDashboardDetailExport.test.ts` if needed so it asserts the computed export state stays enabled when `loading=true` but a non-empty payload is still present. This is the test-first guard for the detail screen button state.

- [ ] **Step 2: Run the targeted tests to verify RED if new assertions were added**

Run: `cmd /c npx tsx --test test\unit\labDashboardDetailExport.test.ts`
Expected: FAIL only if new button-state assertions were added in step 1.

- [ ] **Step 3: Update the detail screen**

Implement in `LabDashboardDetailScreen.tsx`:
- compute export state from helper output
- show `Xuất Excel` only on `activeTab === 'list'`
- disable it when export state says unavailable
- keep `Làm mới` and `Xuất Excel` in the fixed action row
- on click, export the current rendered payload snapshot and surface a safe alert/fallback if workbook generation throws

- [ ] **Step 4: Fix the detail layout scroll chain**

Update `lab-dashboard.css` so:
- `.lab-dashboard-detail-screen` participates in the TV grid with `min-height: 0`
- `.lab-dashboard-detail-panel` becomes a flex column with `min-height: 0`
- `.lab-dashboard-detail-table-wrap` owns `overflow: auto` and expands with `flex: 1`
- source-tab layout still renders correctly

- [ ] **Step 5: Re-run the targeted export test suite**

Run: `cmd /c npx tsx --test test\unit\labDashboardDetailExport.test.ts`
Expected: PASS

- [ ] **Step 6: Commit the UI/CSS slice**

Run:
```bash
git add src/components/lab-dashboard/LabDashboardDetailScreen.tsx src/app/lab-dashboard/lab-dashboard.css
git commit -m "fix: improve lab dashboard detail scroll and export"
```

### Task 3: Verify and Record Evidence

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md`
- Modify if needed: `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-23-lab-dashboard-detail-scroll-export.md`

- [ ] **Step 1: Run the detail search-param regression tests**

Run: `cmd /c npx tsx --test test\unit\labDashboardDetail.test.ts`
Expected: PASS

- [ ] **Step 2: Run the export-focused unit tests**

Run: `cmd /c npx tsx --test test\unit\labDashboardDetailExport.test.ts`
Expected: PASS

- [ ] **Step 3: Run the portal production build**

Run: `cmd /c npm run build`
Expected: PASS

- [ ] **Step 4: Manually smoke the detail screen in a browser**

Check:
- detail list mouse-wheel scroll works while header/tabs/buttons stay fixed
- `Xuất Excel` downloads a `.xlsx` for the current focus only
- queue and abnormal exports open with Vietnamese column headers
- shared summary layout on `/lab-dashboard/tv` still matches the composition in `to be intergrate/lab-dashboard.html`

- [ ] **Step 5: Record verification evidence and residual risks**

Update `tasks/todo.md` and the active task spec with:
- commands run
- pass/fail results
- any manual-smoke gap that remains

- [ ] **Step 6: Commit the workflow evidence**

Run:
```bash
git add tasks/todo.md tasks/active/2026-03-23-lab-dashboard-detail-scroll-export.md
git commit -m "docs: record lab dashboard detail export verification"
```
