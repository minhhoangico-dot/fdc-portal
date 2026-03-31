# Lab Dashboard Source Provenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `/lab-dashboard/details` and `/lab-dashboard/tv` so the `Nguồn dữ liệu` tab shows detailed, trustworthy provenance with funnel counts, focus reasoning, and metric explanations for the currently opened focus.

**Architecture:** Keep provenance generation in the bridge because the bridge owns the real query/filter path and must compute truthful funnel counts. Add structured provenance fields to the existing `sourceDetails` contract in both bridge and portal, then render them in a dedicated portal source-panel component with a pure helper for fallback/ordering so the UI stays testable without relying on CSS-aware component tests.

**Tech Stack:** Node.js + Express + TypeScript + Jest (`fdc-lan-bridge`), React 19 + TypeScript + Vite + `tsx` node tests (portal)

---

### File Structure

**Create**
- `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\src\labDashboard\sourceProvenance.ts` - pure provenance builders for queue, tat, abnormal, and reagents; owns datasets, funnel steps, focus reason, and metric explanations
- `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\test\unit\labDashboardSourceProvenance.test.ts` - unit tests for structured provenance counts, focus-specific explanations, and reagent claim-order behavior
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\labDashboardSourceDetails.ts` - portal helper that normalizes structured provenance into ordered UI blocks and falls back to legacy `calculationNotes`
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\labDashboardSourceDetails.test.ts` - node tests for block ordering, legacy fallback, and error-preserving behavior
- `C:\Users\Minh\Desktop\ERP_v1\src\components\lab-dashboard\LabDashboardSourcePanel.tsx` - dedicated source-tab renderer so `LabDashboardDetailScreen.tsx` does not grow further
- `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-23-lab-dashboard-source-provenance.md` - workflow spec for the implementation run

**Modify**
- `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\src\labDashboard\types.ts` - add structured provenance interfaces for bridge payloads
- `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\src\labDashboard\service.ts` - compute and attach structured provenance to detail payloads
- `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\test\integration\server.test.ts` - route-level assertions for the expanded detail contract
- `C:\Users\Minh\Desktop\ERP_v1\src\types\labDashboard.ts` - mirror the expanded provenance contract for the portal
- `C:\Users\Minh\Desktop\ERP_v1\src\components\lab-dashboard\LabDashboardDetailScreen.tsx` - delegate the source tab to `LabDashboardSourcePanel`
- `C:\Users\Minh\Desktop\ERP_v1\src\app\lab-dashboard\lab-dashboard.css` - style the new source summary, funnel, datasets, and error blocks
- `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md` - track implementation and verification evidence
- `C:\Users\Minh\Desktop\ERP_v1\tasks\lessons.md` - append any correction-driven lesson discovered during implementation

### Task 1: Refresh Workflow Files for the Provenance Follow-up

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-23-lab-dashboard-source-provenance.md`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md`

- [ ] **Step 1: Write the active task spec**

Capture:
- goal and scope
- bridge + portal affected areas
- constraints: additive contract, no per-row provenance, operator-friendly labels, no `patientName`
- verification plan covering bridge tests/build, portal tests/build, and manual smoke

- [ ] **Step 2: Update the shared todo board**

Add a new checklist entry for:
- bridge contract/types
- bridge provenance builder
- portal type/helper
- source-tab UI
- verification evidence

- [ ] **Step 3: Commit the workflow setup**

Run:
```bash
git add tasks/active/2026-03-23-lab-dashboard-source-provenance.md tasks/todo.md
git commit -m "docs: track lab dashboard source provenance task"
```

### Task 2: Add Bridge Provenance Types and Failing Unit Tests

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\test\unit\labDashboardSourceProvenance.test.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\src\labDashboard\types.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\src\labDashboard\sourceProvenance.ts`

- [ ] **Step 1: Write the failing bridge unit tests first** `@superpowers:test-driven-development`

Cover at least:
- queue `waiting` provenance has `summary`, `displayedRowCount`, datasets, ordered funnel, and focus reason
- tat `processing_to_result` changes metric explanation wording and final filter count
- tat `type:hoa-sinh` explains subgroup filtering
- abnormal keeps a single `all` focus reason and human-readable severity explanation
- reagents `all` and `reagent:glucose` preserve claim-order semantics
- unsupported `patientName` never appears in any structured provenance string fields or dataset labels

Example test shape:

```ts
it('builds queue waiting provenance with a final funnel count equal to displayed rows', () => {
  const sourceInfo = buildQueueSourceProvenance({
    asOfDate: '2026-03-23',
    generatedAt: '2026-03-23T03:10:00.000Z',
    focus: 'waiting',
    timelineRows,
    displayedRows,
  });

  expect(sourceInfo.displayedRowCount).toBe(displayedRows.length);
  expect(sourceInfo.pipeline?.at(-1)).toEqual(
    expect.objectContaining({ key: 'focus_waiting', outputCount: displayedRows.length }),
  );
});
```

- [ ] **Step 2: Run the new bridge unit test to verify RED**

Run: `cmd /c npx jest test/unit/labDashboardSourceProvenance.test.ts`
Expected: FAIL because the new builder/types do not exist yet.

- [ ] **Step 3: Add the structured provenance interfaces in the bridge types**

Add exact interfaces for:

```ts
export interface LabDashboardDetailDatasetInfo {
  key: string;
  label: string;
  role: string;
}

export interface LabDashboardDetailPipelineStep {
  key: string;
  label: string;
  ruleSummary: string;
  inputCount: number;
  outputCount: number;
}

export interface LabDashboardDetailMetricExplanation {
  label: string;
  description: string;
}
```

Then extend `LabDashboardDetailSourceInfo` with:
- `summary?: string`
- `displayedRowCount?: number`
- `datasets?: LabDashboardDetailDatasetInfo[]`
- `pipeline?: LabDashboardDetailPipelineStep[]`
- `focusReason?: string`
- `metricExplanation?: LabDashboardDetailMetricExplanation[]`

- [ ] **Step 4: Implement the pure provenance builder module**

In `sourceProvenance.ts`, create focused functions such as:

```ts
export function buildQueueSourceProvenance(/* ... */): LabDashboardDetailSourceInfo
export function buildTatSourceProvenance(/* ... */): LabDashboardDetailSourceInfo
export function buildAbnormalSourceProvenance(/* ... */): LabDashboardDetailSourceInfo
export function buildReagentSourceProvenance(/* ... */): LabDashboardDetailSourceInfo
```

Rules:
- all labels and descriptions are operator-facing Vietnamese
- `displayedRowCount` must come from the final displayed row array
- funnel counts must come from the same arrays/filters used to derive detail rows
- reagent provenance must document and use the current first-match claim order
- keep legacy `calculationNotes` populated during rollout

- [ ] **Step 5: Run the bridge provenance unit test to verify GREEN**

Run: `cmd /c npx jest test/unit/labDashboardSourceProvenance.test.ts`
Expected: PASS

- [ ] **Step 6: Commit the bridge provenance builder slice**

Run:
```bash
git add fdc-lan-bridge/src/labDashboard/types.ts fdc-lan-bridge/src/labDashboard/sourceProvenance.ts fdc-lan-bridge/test/unit/labDashboardSourceProvenance.test.ts
git commit -m "feat: add lab dashboard provenance builders"
```

### Task 3: Integrate Structured Provenance into the Bridge Detail Route

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\src\labDashboard\service.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\fdc-lan-bridge\test\integration\server.test.ts`

- [ ] **Step 1: Add failing route assertions in the bridge integration test**

Extend the mocked `/lab-dashboard/details` response expectations so they require:
- `sourceDetails[0].summary`
- `sourceDetails[0].displayedRowCount`
- `sourceDetails[0].datasets`
- `sourceDetails[0].pipeline`
- `sourceDetails[0].focusReason`
- `sourceDetails[0].metricExplanation`
- continued absence of `patientName`

Example assertion:

```ts
expect(res.body.meta.sourceDetails[0]).toEqual(
  expect.objectContaining({
    summary: expect.any(String),
    displayedRowCount: res.body.rows.length,
    pipeline: expect.any(Array),
    focusReason: expect.any(String),
  }),
);
```

- [ ] **Step 2: Run the bridge integration test to verify RED**

Run: `cmd /c npx jest test/integration/server.test.ts`
Expected: FAIL because `service.ts` still returns only the old note structure.

- [ ] **Step 3: Wire the new builder outputs into `service.ts`**

Implementation rules:
- queue/tat provenance must be built from the same timeline arrays used for detail rows
- abnormal provenance must be built from the same fetched abnormal rows
- reagent provenance must be built from the same claimed snapshot rows passed to `buildReagentDetailRows`
- `displayedRowCount` must equal the final `rows.length`
- on partial failure, return provenance fields that are still available plus `error`

- [ ] **Step 4: Re-run the bridge integration test**

Run: `cmd /c npx jest test/integration/server.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full bridge suite and bridge build**

Run:
- `cmd /c npm test` in `fdc-lan-bridge`
- `cmd /c npm run build` in `fdc-lan-bridge`

Expected:
- all bridge tests PASS
- TypeScript build PASS

- [ ] **Step 6: Commit the bridge integration slice**

Run:
```bash
git add fdc-lan-bridge/src/labDashboard/service.ts fdc-lan-bridge/test/integration/server.test.ts
git commit -m "feat: attach provenance to lab dashboard details"
```

### Task 4: Add Portal Provenance Types and a Testable Source-Tab View Helper

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\types\labDashboard.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\lib\labDashboardSourceDetails.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\test\unit\labDashboardSourceDetails.test.ts`

- [ ] **Step 1: Write the failing portal helper tests first**

Cover:
- structured provenance becomes ordered blocks: summary, funnel, focus reason, metric explanation, datasets
- legacy payload with only `calculationNotes` still returns a fallback block
- `error` does not suppress structured provenance
- `displayedRowCount` is available to the summary block

Example test:

```ts
test('prefers structured provenance over legacy notes', () => {
  const blocks = buildLabDashboardSourceDetails(structuredSourceInfo);
  assert.deepEqual(blocks.map((block) => block.kind), [
    'summary',
    'pipeline',
    'focusReason',
    'metricExplanation',
    'datasets',
  ]);
});
```

- [ ] **Step 2: Run the new portal helper test to verify RED**

Run: `cmd /c npx tsx --test test\unit\labDashboardSourceDetails.test.ts`
Expected: FAIL because the helper and expanded types do not exist yet.

- [ ] **Step 3: Mirror the provenance interfaces into the portal types**

Add the same structured provenance interfaces from the bridge to `src/types/labDashboard.ts`.

- [ ] **Step 4: Implement the pure portal view helper**

`buildLabDashboardSourceDetails(sourceInfo)` should:
- produce a stable block order for the UI
- expose legacy-note fallback when structured fields are absent
- preserve `error`
- avoid any CSS/DOM dependency so this logic stays node-testable

- [ ] **Step 5: Run the portal helper test to verify GREEN**

Run: `cmd /c npx tsx --test test\unit\labDashboardSourceDetails.test.ts`
Expected: PASS

- [ ] **Step 6: Commit the portal type/helper slice**

Run:
```bash
git add src/types/labDashboard.ts src/lib/labDashboardSourceDetails.ts test/unit/labDashboardSourceDetails.test.ts
git commit -m "feat: add lab dashboard source provenance view model"
```

### Task 5: Render the New Source Tab UI Without Growing the Detail Screen Further

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\components\lab-dashboard\LabDashboardSourcePanel.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\components\lab-dashboard\LabDashboardDetailScreen.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\lab-dashboard\lab-dashboard.css`

- [ ] **Step 1: Add a failing helper assertion if block ordering or fallback behavior needs one more guard**

If the render shape depends on a new view-helper output field, add it to `test/unit/labDashboardSourceDetails.test.ts` first.

- [ ] **Step 2: Run the helper test to verify RED if Step 1 added a new assertion**

Run: `cmd /c npx tsx --test test\unit\labDashboardSourceDetails.test.ts`
Expected: FAIL only if the new assertion added coverage for a field not yet implemented.

- [ ] **Step 3: Implement `LabDashboardSourcePanel.tsx`**

Render in this order:
- source summary card with source system, data date, payload time, displayed row count, and summary
- funnel block from `pipeline`
- focus reason card
- metric explanation list
- dataset list
- legacy-note fallback block only when structured fields are absent
- error banner/card while still preserving provenance blocks

- [ ] **Step 4: Delegate the source tab from `LabDashboardDetailScreen.tsx`**

Replace the current inline `source.calculationNotes` rendering with the new component:

```tsx
<LabDashboardSourcePanel sources={payload.meta.sourceDetails} />
```

Keep:
- list-tab behavior unchanged
- export button unchanged
- existing header and refresh behavior unchanged

- [ ] **Step 5: Add styles for the new provenance layout**

Add focused CSS classes for:
- source summary meta grid
- pipeline steps and `inputCount -> outputCount`
- focus reason card
- metric explanation list
- dataset role list
- graceful fallback block for legacy notes

Do not alter summary-card dimensions or reagent-chip layout.

- [ ] **Step 6: Run the portal helper test and production build**

Run:
- `cmd /c npx tsx --test test\unit\labDashboardSourceDetails.test.ts`
- `cmd /c npm run build`

Expected:
- helper test PASS
- portal build PASS

- [ ] **Step 7: Commit the portal rendering slice**

Run:
```bash
git add src/components/lab-dashboard/LabDashboardSourcePanel.tsx src/components/lab-dashboard/LabDashboardDetailScreen.tsx src/app/lab-dashboard/lab-dashboard.css
git commit -m "feat: render detailed lab dashboard provenance"
```

### Task 6: Final Verification and Workflow Evidence

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-23-lab-dashboard-source-provenance.md`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\lessons.md` if implementation reveals a correction-worthy lesson

- [ ] **Step 1: Run the targeted bridge provenance unit test**

Run: `cmd /c npx jest test/unit/labDashboardSourceProvenance.test.ts`
Expected: PASS

- [ ] **Step 2: Run the bridge route test and full bridge verification**

Run:
- `cmd /c npx jest test/integration/server.test.ts`
- `cmd /c npm test` in `fdc-lan-bridge`
- `cmd /c npm run build` in `fdc-lan-bridge`

Expected: PASS

- [ ] **Step 3: Run the portal provenance helper test and portal build**

Run:
- `cmd /c npx tsx --test test\unit\labDashboardSourceDetails.test.ts`
- `cmd /c npm run build`

Expected: PASS

- [ ] **Step 4: Manually smoke the TV detail screen**

Check on `/lab-dashboard/tv`:
- queue `waiting`
- tat `processing_to_result`
- tat `type:hoa-sinh`
- abnormal `all`
- reagents `all`
- reagents `reagent:glucose`

For each:
- `Nguồn dữ liệu` shows summary, funnel, focus reason, metric explanation, and datasets
- funnel final count equals visible row count in `Danh sách chi tiết`
- labels stay operator-friendly
- errors still preserve provenance where possible
- summary layout still matches `C:\Users\Minh\Desktop\ERP_v1\to be intergrate\lab-dashboard.html`

- [ ] **Step 5: Record verification evidence and residual risks**

Write exact commands/results into:
- `tasks/todo.md`
- `tasks/active/2026-03-23-lab-dashboard-source-provenance.md`

- [ ] **Step 6: Commit the verification/docs slice**

Run:
```bash
git add tasks/todo.md tasks/active/2026-03-23-lab-dashboard-source-provenance.md tasks/lessons.md
git commit -m "docs: record lab dashboard provenance verification"
```
