# Room Management Frontend-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current iframe-based Room Management preview with a working portal-native module that preserves the approved map layout and keeps maintenance, supply, queue, and print flows usable on session-only mock state.

**Architecture:** Build a self-contained Room Management feature under `src/` with a shared React provider mounted above the room-management routes so state survives in-app navigation. Keep pages thin, push derivation logic into pure helpers under `src/lib/room-management/`, and express the floor map as structured layout data rather than embedded prototype HTML.

**Tech Stack:** React 19, TypeScript, React Router 7, Tailwind CSS 4, `tsx --test`, existing portal layout/components, session-only in-memory state

---

## Execution Prerequisites

- Work in the current workspace instead of creating a new worktree because the active task-tracking files in `tasks/` are already dirty and need to stay attached to this session.
- Follow `@test-driven-development`: add a failing test before each new helper module or behavior slice.
- Before claiming completion, use `@verification-before-completion`.

## File Structure

**Create**
- `C:\Users\Minh\Desktop\ERP_v1\src\types\roomManagement.ts` - shared room-management domain types for rooms, issues, supply requests, filters, and summaries
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\catalog.ts` - normalized room catalog, floor labels, wing layout, room-type display metadata, seed issues, and seed supply requests
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\summary.ts` - pure helpers for room badges, dashboard stats, and room activity summaries
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\maintenance.ts` - pure helpers for maintenance filtering, grouping, and status transitions
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\print.ts` - pure helpers for grouping supply requests into printable floor -> room -> item sections
- `C:\Users\Minh\Desktop\ERP_v1\src\contexts\RoomManagementContext.tsx` - shared in-memory provider, actions, and feature hook
- `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\FloorPlanCanvas.tsx` - floor tabs, layout surface, room tiles, and stats cards
- `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\RoomBlock.tsx` - one portal-native room tile preserving prototype order/wing placement
- `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\RoomDrawer.tsx` - selected-room drawer shell and tab navigation
- `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\RoomInfoPanel.tsx` - overview tab content
- `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\MaintenanceTab.tsx` - room maintenance history and inline create form
- `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\SupplyTab.tsx` - room supply history and inline create form
- `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\MaintenanceBoard.tsx` - queue view with grouped columns/list and local status actions
- `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\MaterialsPrintPreview.tsx` - printable grouped supply summary with print trigger
- `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\maintenance\page.tsx` - maintenance queue screen
- `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\print\materials\page.tsx` - printable supply summary screen
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomCatalog.test.ts` - floor grouping and approved-layout preservation coverage
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomSummary.test.ts` - room badge and header-stat derivation coverage
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomMaintenance.test.ts` - maintenance filtering, grouping, and status transition coverage
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomPrint.test.ts` - supply-request print grouping coverage

**Modify**
- `C:\Users\Minh\Desktop\ERP_v1\src\App.tsx` - mount `RoomManagementProvider` above the room-management route group and register the maintenance/print subroutes
- `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\page.tsx` - replace iframe scaffold with the real portal-native module entry page
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\navigation.test.ts` - keep the room-management nav visibility regression in place if route structure changes require adjustment
- `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md` - record execution and verification evidence
- `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-31-room-management-rollout.md` - record verification notes and residual risks

### Task 1: Establish The Shared Room Domain And Catalog

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\types\roomManagement.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\catalog.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomCatalog.test.ts`

- [ ] **Step 1: Write the failing room catalog test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOM_FLOORS, ROOM_LAYOUTS, getRoomById, getRoomsForFloor } from '@/lib/room-management/catalog';

test('room catalog preserves the approved wing layout for all floors', () => {
  assert.deepEqual(ROOM_FLOORS.map((floor) => floor.id), ['floor-1', 'floor-2', 'floor-3']);
  assert.equal(getRoomsForFloor(1).left.length, 9);
  assert.equal(getRoomsForFloor(1).right.length, 8);
  assert.equal(getRoomsForFloor(2).left.length, 8);
  assert.equal(getRoomsForFloor(2).right.length, 6);
  assert.equal(getRoomsForFloor(3).center.length, 7);
  assert.equal(getRoomById('r4')?.name, 'Phòng Khám P110');
  assert.equal(ROOM_LAYOUTS[1].kind, 'dual-wing');
  assert.equal(ROOM_LAYOUTS[3].kind, 'single-wing');
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `cmd /c npx tsx --test test\\unit\\roomCatalog.test.ts`
Expected: FAIL because the room-management domain files do not exist yet.

- [ ] **Step 3: Implement the room types and catalog**

Create `C:\Users\Minh\Desktop\ERP_v1\src\types\roomManagement.ts` with:
- room catalog types
- maintenance report types/statuses/severity
- supply request and line-item types
- summary/filter types used by the provider and helper modules

Create `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\catalog.ts` with:
- `ROOM_FLOORS`
- room-type display metadata
- the approved room catalog migrated from `public/roomplanning/src/lib/seed-data.ts`
- fixed layout descriptors for floors 1, 2, and 3
- seeded maintenance/supply session data
- `getRoomsForFloor()` and `getRoomById()`

- [ ] **Step 4: Run the test to verify GREEN**

Run: `cmd /c npx tsx --test test\\unit\\roomCatalog.test.ts`
Expected: PASS

- [ ] **Step 5: Commit the catalog slice**

```bash
git add src/types/roomManagement.ts src/lib/room-management/catalog.ts test/unit/roomCatalog.test.ts
git commit -m "feat: add room management domain catalog"
```

### Task 2: Add Pure Summary And Queue Helpers

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\summary.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\maintenance.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomSummary.test.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomMaintenance.test.ts`

- [ ] **Step 1: Write the failing room-summary test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoomSummaryMap, buildRoomManagementStats } from '@/lib/room-management/summary';

test('room summaries count open maintenance and pending supply per room', () => {
  const summary = buildRoomSummaryMap({
    maintenanceReports: [
      { id: 'm1', roomId: 'r4', status: 'new', severity: 'high', createdAt: '2026-03-31T08:00:00Z' },
      { id: 'm2', roomId: 'r4', status: 'resolved', severity: 'low', createdAt: '2026-03-31T09:00:00Z' },
    ],
    supplyRequests: [
      { id: 's1', roomId: 'r4', status: 'pending', createdAt: '2026-03-31T10:00:00Z', items: [] },
      { id: 's2', roomId: 'r11', status: 'approved', createdAt: '2026-03-31T10:30:00Z', items: [] },
    ],
  });

  const stats = buildRoomManagementStats(summary);

  assert.equal(summary.r4.openMaintenanceCount, 1);
  assert.equal(summary.r4.pendingSupplyCount, 1);
  assert.equal(stats.openMaintenanceCount, 1);
  assert.equal(stats.pendingSupplyCount, 1);
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `cmd /c npx tsx --test test\\unit\\roomSummary.test.ts`
Expected: FAIL because the summary helper does not exist yet.

- [ ] **Step 3: Write the failing maintenance helper test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMaintenanceBoard, canTransitionMaintenanceStatus, filterMaintenanceReports } from '@/lib/room-management/maintenance';

test('maintenance helpers filter reports and keep status order stable', () => {
  const reports = [
    { id: 'm1', roomId: 'r4', floor: 1, status: 'new', severity: 'high', createdAt: '2026-03-31T08:00:00Z' },
    { id: 'm2', roomId: 'r15', floor: 1, status: 'in_progress', severity: 'urgent', createdAt: '2026-03-31T09:00:00Z' },
  ];

  assert.equal(filterMaintenanceReports(reports, { floor: 1, status: 'all', severity: 'urgent' }).length, 1);
  assert.equal(canTransitionMaintenanceStatus('new', 'triaged'), true);
  assert.equal(canTransitionMaintenanceStatus('resolved', 'new'), false);
  assert.equal(buildMaintenanceBoard(reports)[0].status, 'new');
});
```

- [ ] **Step 4: Run the test to verify RED**

Run: `cmd /c npx tsx --test test\\unit\\roomMaintenance.test.ts`
Expected: FAIL because the maintenance helper does not exist yet.

- [ ] **Step 5: Implement the summary and maintenance helpers**

Create `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\summary.ts` with:
- `buildRoomSummaryMap()`
- `buildRoomManagementStats()`
- `getRoomRecentActivity()`

Create `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\maintenance.ts` with:
- status order
- transition rules
- `filterMaintenanceReports()`
- `buildMaintenanceBoard()`

- [ ] **Step 6: Run the tests to verify GREEN**

Run:
- `cmd /c npx tsx --test test\\unit\\roomSummary.test.ts`
- `cmd /c npx tsx --test test\\unit\\roomMaintenance.test.ts`

Expected: PASS

- [ ] **Step 7: Commit the helper slice**

```bash
git add src/lib/room-management/summary.ts src/lib/room-management/maintenance.ts test/unit/roomSummary.test.ts test/unit/roomMaintenance.test.ts
git commit -m "feat: add room management summary helpers"
```

### Task 3: Build The Shared Provider And Main Room Map Screen

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\contexts\RoomManagementContext.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\FloorPlanCanvas.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\RoomBlock.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\RoomDrawer.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\RoomInfoPanel.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\MaintenanceTab.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\SupplyTab.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\page.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\App.tsx`

- [ ] **Step 1: Mount a shared provider above the room-management routes**

Modify `C:\Users\Minh\Desktop\ERP_v1\src\App.tsx` so:
- `/room-management`
- `/room-management/maintenance`
- `/room-management/print/materials`

all render inside `RoomManagementProvider`.

Recommended shape:

```tsx
<Route
  element={
    <RequireAuth moduleKey="room_management">
      <RoomManagementProvider />
    </RequireAuth>
  }
>
  <Route path="/room-management" element={<RoomManagementPage />} />
  <Route path="/room-management/maintenance" element={<RoomManagementMaintenancePage />} />
  <Route path="/room-management/print/materials" element={<RoomManagementPrintPage />} />
</Route>
```

- [ ] **Step 2: Implement the provider**

Create `C:\Users\Minh\Desktop\ERP_v1\src\contexts\RoomManagementContext.tsx` to own:
- selected floor
- selected room id
- active drawer tab
- session-only maintenance reports
- session-only supply requests
- actions:
  - `selectFloor()`
  - `selectRoom()`
  - `closeRoom()`
  - `setDrawerTab()`
  - `createMaintenanceReport()`
  - `updateMaintenanceStatus()`
  - `createSupplyRequest()`

Export a `useRoomManagement()` hook that returns derived summaries from the pure helpers.

- [ ] **Step 3: Build the portal-native map surface**

Create:
- `RoomBlock.tsx`
- `FloorPlanCanvas.tsx`

Requirements:
- preserve dual-wing layout for floors 1 and 2
- preserve single-column layout for floor 3
- use portal-native cards, borders, chips, and indigo selected states
- render header card and compact stats row
- include actions linking to `/room-management/maintenance` and `/room-management/print/materials`

- [ ] **Step 4: Replace the iframe scaffold**

Modify `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\page.tsx` so it only composes feature components and consumes the provider hook.

- [ ] **Step 5: Build the drawer and tab panels**

Create:
- `RoomDrawer.tsx`
- `RoomInfoPanel.tsx`
- `MaintenanceTab.tsx`
- `SupplyTab.tsx`

Requirements:
- desktop right drawer, mobile bottom sheet behavior via responsive classes
- tabs:
  - `Tổng quan`
  - `Sự cố / bảo trì`
  - `Vật tư`
- inline form entry and empty states
- immediate updates from provider actions

- [ ] **Step 6: Smoke the main route locally**

Run: `cmd /c npm run build`
Expected: PASS with the new route group and components compiling cleanly.

- [ ] **Step 7: Commit the main-screen slice**

```bash
git add src/contexts/RoomManagementContext.tsx src/components/room-management/RoomBlock.tsx src/components/room-management/FloorPlanCanvas.tsx src/components/room-management/RoomDrawer.tsx src/components/room-management/RoomInfoPanel.tsx src/components/room-management/MaintenanceTab.tsx src/components/room-management/SupplyTab.tsx src/app/room-management/page.tsx src/App.tsx
git commit -m "feat: build room management map and drawer"
```

### Task 4: Add The Maintenance Queue Screen

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\MaintenanceBoard.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\maintenance\page.tsx`

- [ ] **Step 1: Build the maintenance board screen**

Create `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\MaintenanceBoard.tsx` to render:
- filter bar for floor, status, severity
- grouped status columns or stacked lists
- local status update controls constrained by `canTransitionMaintenanceStatus()`
- back-link to `/room-management`

- [ ] **Step 2: Add the maintenance page**

Create `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\maintenance\page.tsx` as a thin route that reads from `useRoomManagement()` and renders `MaintenanceBoard`.

- [ ] **Step 3: Verify the queue route**

Run: `cmd /c npm run build`
Expected: PASS

- [ ] **Step 4: Commit the maintenance screen**

```bash
git add src/components/room-management/MaintenanceBoard.tsx src/app/room-management/maintenance/page.tsx
git commit -m "feat: add room management maintenance queue"
```

### Task 5: Add The Print Grouping Helper And Printable Materials Screen

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\print.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomPrint.test.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\MaterialsPrintPreview.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\print\materials\page.tsx`

- [ ] **Step 1: Write the failing print-grouping test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPrintableSupplyGroups } from '@/lib/room-management/print';

test('print helper groups room supply requests by floor then room', () => {
  const groups = buildPrintableSupplyGroups([
    {
      id: 's1',
      roomId: 'r11',
      status: 'pending',
      createdAt: '2026-03-31T08:00:00Z',
      items: [{ id: 'i1', itemName: 'Túi nilon nhỏ', quantity: 5, unit: 'kg' }],
    },
    {
      id: 's2',
      roomId: 'r4',
      status: 'approved',
      createdAt: '2026-03-31T09:00:00Z',
      items: [{ id: 'i2', itemName: 'Băng gạc', quantity: 2, unit: 'gói' }],
    },
  ]);

  assert.equal(groups[0].floor, 1);
  assert.equal(groups[0].rooms[0].roomId, 'r4');
  assert.equal(groups[0].rooms[1].items[0].itemName, 'Túi nilon nhỏ');
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `cmd /c npx tsx --test test\\unit\\roomPrint.test.ts`
Expected: FAIL because the print helper does not exist yet.

- [ ] **Step 3: Implement the print helper**

Create `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\print.ts` with:
- floor/room grouping
- optional status filtering
- flattened printable line-item output

- [ ] **Step 4: Run the test to verify GREEN**

Run: `cmd /c npx tsx --test test\\unit\\roomPrint.test.ts`
Expected: PASS

- [ ] **Step 5: Build the print preview component and route**

Create:
- `MaterialsPrintPreview.tsx`
- `src/app/room-management/print/materials/page.tsx`

Requirements:
- provider-backed filter controls
- grouped supply summary by `tầng -> phòng -> vật tư`
- `window.print()` action
- clean empty state
- printer-friendly layout with portal on-screen styling

- [ ] **Step 6: Verify the print route**

Run: `cmd /c npm run build`
Expected: PASS

- [ ] **Step 7: Commit the print screen**

```bash
git add src/lib/room-management/print.ts test/unit/roomPrint.test.ts src/components/room-management/MaterialsPrintPreview.tsx src/app/room-management/print/materials/page.tsx
git commit -m "feat: add room management materials print view"
```

### Task 6: Run Verification And Record Evidence

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-31-room-management-rollout.md`
- Modify if needed: `C:\Users\Minh\Desktop\ERP_v1\tasks\lessons.md`

- [ ] **Step 1: Run the room-management unit tests**

Run:
- `cmd /c npx tsx --test test\\unit\\roomCatalog.test.ts`
- `cmd /c npx tsx --test test\\unit\\roomSummary.test.ts`
- `cmd /c npx tsx --test test\\unit\\roomMaintenance.test.ts`
- `cmd /c npx tsx --test test\\unit\\roomPrint.test.ts`
- `cmd /c npx tsx --test test\\unit\\navigation.test.ts`

Expected: PASS

- [ ] **Step 2: Run the type-check**

Run: `cmd /c npm run lint`
Expected: PASS

- [ ] **Step 3: Run the production build**

Run: `cmd /c npm run build`
Expected: PASS

- [ ] **Step 4: Browser smoke the three room-management routes**

Check:
- `/room-management`
  - floor tabs preserve the approved layout structure
  - room click opens the correct drawer
  - maintenance and supply submits update room badges immediately
- `/room-management/maintenance`
  - filter bar and local status updates work
- `/room-management/print/materials`
  - grouped printable summary renders and print button triggers `window.print()`

- [ ] **Step 5: Record verification evidence and residual risks**

Update:
- `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md`
- `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-31-room-management-rollout.md`

Capture:
- exact commands
- pass/fail output summary
- browser smoke notes
- any residual risk

- [ ] **Step 6: Commit the verification record**

```bash
git add tasks/todo.md tasks/active/2026-03-31-room-management-rollout.md tasks/lessons.md
git commit -m "docs: record room management frontend verification"
```
