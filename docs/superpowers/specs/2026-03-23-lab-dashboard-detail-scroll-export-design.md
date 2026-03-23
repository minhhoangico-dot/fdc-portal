# Lab Dashboard Detail Scroll + Excel Export Design

Date: 2026-03-23
Status: Draft for review
Related task: `lab-dashboard-tv-drilldown`

## Summary

The lab dashboard detail screen on `/lab-dashboard/tv` currently has two usability gaps:

1. The `Danh sách chi tiết` view does not reliably allow mouse-wheel scrolling through the full table.
2. Users cannot export the currently opened focus to Excel for offline checking or sharing.

This design adds a stable inner scroll region for the detail table and a client-side `.xlsx` export action that exports exactly the rows for the currently opened `section` + `focus`.

## Goals

- Make the detail table scroll with the mouse wheel while keeping the detail header, tabs, and actions fixed.
- Add an `Xuất Excel` action that exports only the current focus shown in `Danh sách chi tiết`.
- Keep the existing drill-down route contract and bridge API unchanged.
- Preserve masking rules: never export `patientName`.

## Non-Goals

- No new bridge export endpoint.
- No bulk export for an entire section beyond the current focus.
- No export action on the `Nguồn dữ liệu` tab.
- No change to summary polling or detail query semantics.

## Current Context

- Detail data is already available on the client via `useLabDashboardDetail()`.
- `LabDashboardDetailPayload.rows` is already filtered by the active `section` + `focus`.
- The detail UI is rendered by `src/components/lab-dashboard/LabDashboardDetailScreen.tsx`.
- Detail layout and overflow are controlled in `src/app/lab-dashboard/lab-dashboard.css`.

## Approaches Considered

### Option 1: Frontend-only scroll fix + client-side `.xlsx` export

- Fix layout so the table container becomes the only scrollable region.
- Export from `payload.rows` on the client using a browser-side `.xlsx` library.

Why this is recommended:

- Lowest implementation risk.
- Uses the exact filtered dataset the user is looking at.
- Avoids adding another bridge contract and another verification surface.

### Option 2: Frontend scroll fix + bridge-side export endpoint

- Keep scroll fix in the portal.
- Add `/lab-dashboard/details/export` or similar on the bridge.

Why not recommended:

- More moving parts for no real product benefit.
- Duplicates filtering logic already represented in the current detail payload.
- Harder to iterate on exported columns because both bridge and portal would need to move in lockstep.

## Proposed Design

### 1. Scroll Behavior

The detail screen will be restructured so only the table region scrolls:

- The top-level detail screen remains full-height.
- The header area stays outside the scroll region.
- `Danh sách chi tiết` renders a panel with:
  - a small metadata row
  - a single `table-wrap` area that owns vertical and horizontal scrolling

CSS changes:

- Ensure the detail screen grid/flex chain uses `min-height: 0` where needed.
- Make the list panel participate in height distribution with `display: flex; flex-direction: column; min-height: 0`.
- Make `.lab-dashboard-detail-table-wrap` use `flex: 1; min-height: 0; overflow: auto`.

Expected UX:

- Mouse wheel scroll moves the table rows.
- Sticky headers remain visible.
- Header, tabs, back button, refresh button, and export button stay fixed.

### 2. Export UX

Add a new button in the detail action row:

- Label: `Xuất Excel`
- Visible only when `activeTab === 'list'`
- Disabled when:
  - detail payload is loading
  - there is no payload
  - `payload.rows.length === 0`

During background refresh:

- Keep `Xuất Excel` enabled if previously loaded rows are still visible.
- Export uses the currently rendered payload snapshot at the moment the user clicks.

The button exports exactly the current detail payload:

- Current `section`
- Current `focus`
- Current `asOfDate`
- Current visible row schema for that section

### 3. Export Format

Use real `.xlsx` output.

Recommended library:

- Add `xlsx` to the portal dependencies.

Implementation shape:

- Build a small export helper under `src/lib/` dedicated to lab dashboard detail export.
- Convert `LabDashboardDetailPayload` into an array of flat row objects with localized column headers.
- Create a workbook with one sheet named from the active section.
- Trigger a browser download using a generated filename.

Filename pattern:

- `lab-dashboard-{section}-{focus}-{asOfDate}.xlsx`

Filename sanitization rules:

- Lowercase the filename parts.
- Replace `:` in `focus` with `_`.
- Replace any character outside `[a-z0-9_-]` with `-`.
- Collapse repeated `-` into a single `-`.
- Trim leading or trailing `-`.

Examples:

- `lab-dashboard-queue-waiting-2026-03-23.xlsx`
- `lab-dashboard-tat-type_hoa-sinh-2026-03-23.xlsx`

### 4. Column Mapping

Exported columns will match the current visible table by section.

#### Queue

- `Mã BN`
- `Nhóm XN`
- `Trạng thái`
- `Tiếp nhận`
- `Xử lý`
- `Trả KQ`

#### TAT

- `Mã BN`
- `Nhóm XN`
- `Tiếp nhận`
- `Xử lý`
- `Trả KQ`
- `Tổng TAT`
- `TN → XL`
- `XL → KQ`

#### Abnormal

- `Mã BN`
- `Mã XN`
- `Tên xét nghiệm`
- `Giá trị`
- `Cờ`
- `Khoảng tham chiếu`
- `Thời điểm`

#### Reagents

- `Reagent`
- `Nguồn snapshot`
- `Mã thuốc`
- `Kho`
- `Tồn`
- `Đơn vị`
- `Ngày snapshot`

Formatting rules:

- Keep current display-safe fields only.
- Preserve Vietnamese headers.
- Convert nullable values to `—` consistently across all exported sections.
- Keep dates as formatted display strings for operator readability rather than raw ISO timestamps.

## Component and File Changes

### Portal UI

- `src/components/lab-dashboard/LabDashboardDetailScreen.tsx`
  - add export button
  - wire export availability to `activeTab === 'list'`
  - keep export action fixed with other header controls

- `src/app/lab-dashboard/lab-dashboard.css`
  - correct the nested min-height/overflow chain
  - make the table-wrap own scrolling

### Portal helper logic

- Add a new helper, likely `src/lib/labDashboardDetailExport.ts`
  - map payload rows to export records
  - build workbook
  - save `.xlsx`

## Error Handling

- If export is triggered with no rows, do nothing and keep the button disabled.
- If workbook generation throws, show a lightweight error state via existing UI pattern or a safe alert fallback.
- Export does not block refresh or navigation.

## Testing Strategy

Follow TDD for the new behavior:

1. Add failing unit tests for export mapping:
   - queue focus exports the expected headers and values
   - tat focus exports the expected headers and values
   - abnormal focus exports the expected headers and values
   - reagent focus exports the expected headers and values
   - generated filename reflects current `section`, `focus`, and `asOfDate`

2. Add a failing unit test for export availability logic:
   - export hidden on `source`
   - export disabled when row count is zero

3. Fix the detail screen scroll layout and verify by build plus manual browser smoke.

Verification commands:

- `cmd /c npx tsx --test test\\unit\\labDashboardDetail.test.ts`
- `cmd /c npx tsx --test test\\unit\\labDashboardDetailExport.test.ts`
- `cmd /c npm run build`

Manual smoke:

- Open a detail screen with many rows and verify mouse wheel scroll works in the table.
- Export `.xlsx` from at least `queue` and `abnormal`.
- Confirm the file contains only the current focus rows.
- Re-check `/lab-dashboard/tv` summary layout against `to be intergrate/lab-dashboard.html` after the CSS change so the shared stylesheet does not regress the TV summary composition.

## Risks

- Browser-side `.xlsx` generation can increase bundle size; keep the export helper isolated and consider lazy-loading if needed during implementation planning.
- Scroll bugs can persist if any ancestor keeps `overflow: hidden` without `min-height: 0`; implementation must verify the entire container chain.
- The detail scroll fix touches the shared lab dashboard stylesheet, so verification must include a summary-screen regression check.

## Recommendation

Implement Option 1:

- fix inner-table scrolling in the portal
- export `.xlsx` directly from the current detail payload

This is the smallest change that exactly matches the approved behavior.
