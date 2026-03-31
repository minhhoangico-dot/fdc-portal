# Room Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a floorplan-first room management module with fixed rooms, a maintenance issue queue, room-scoped material requests that reuse the existing approval flow, and a single consolidated printable sheet grouped by room.

**Architecture:** Keep the room catalog fixed and explicit in both SQL seed data and a frontend layout map. Split operational maintenance data into dedicated room-issue tables and viewmodels, but reuse `fdc_approval_requests` for room material requests by attaching room context (`source_module`, `room_code`, `linked_issue_id`) instead of inventing a second request system. Keep pages thin and move grouping, room-summary, request-context, print, and status-transition logic into testable helpers under `src/lib/room-management/` plus focused `useRoom*` viewmodels.

**Tech Stack:** React 19, TypeScript, Vite, Supabase client queries + RLS-backed tables, `tsx --test` unit tests, existing request/approval pages, repo workflow files under `tasks/`

## Execution Prerequisites

- Use `@using-git-worktrees` before touching implementation files so this work runs in an isolated worktree instead of the current dirty branch.
- Follow `@test-driven-development` for each task below: write the failing test first, watch it fail for the expected reason, then implement the minimum code to pass.
- Before calling the work complete, use `@verification-before-completion`.

## File Structure

**Create**
- `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-24-room-management.md` - active task spec for execution, verification evidence, and residual risks
- `C:\Users\Minh\Desktop\ERP_v1\sql\20260324_room_management_module.sql` - additive Supabase schema for fixed room catalog, issue tables, request context columns, indexes, and RLS
- `C:\Users\Minh\Desktop\ERP_v1\src\types\roomManagement.ts` - shared room catalog, issue, queue, and print-domain types
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\catalog.ts` - fixed room list, floor grouping, layout coordinates, and room lookup helpers
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\summary.ts` - pure helpers that derive room badges, drawer summaries, and room activity from issues + requests
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\issues.ts` - allowed issue-status transitions and board grouping helpers
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\request-context.ts` - room-originated request helpers and display metadata for existing request/approval screens
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\material-request.ts` - helper to build a room-scoped `material_release` payload from drawer form data
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\print.ts` - grouped print view model for `floor -> room -> item`
- `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useRoomManagement.ts` - main room-map screen data, selected room state, issue summaries, request summaries
- `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useRoomMaintenanceQueue.ts` - maintenance queue fetch/update/filter logic
- `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useRoomMaterialsPrint.ts` - print preview filters and grouped dataset
- `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\FloorPlanCanvas.tsx` - floor tabs + clickable room blocks
- `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\RoomDrawer.tsx` - selected-room drawer with overview, issue list, and request list
- `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\IssueReportSheet.tsx` - room issue creation/edit form
- `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\RoomMaterialRequestSheet.tsx` - room-scoped material request form
- `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\MaintenanceBoard.tsx` - maintenance queue board/list renderer
- `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\MaterialsPrintPreview.tsx` - printable consolidated sheet component
- `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\page.tsx` - floorplan-first module home
- `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\maintenance\page.tsx` - maintenance queue screen
- `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\print\materials\page.tsx` - print preview screen
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomCatalog.test.ts` - fixed-room catalog/layout coverage
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomSummary.test.ts` - room summary/badge derivation coverage
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomIssueStatus.test.ts` - maintenance status transition and board grouping coverage
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomRequestContext.test.ts` - room request mapping/display coverage
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomMaterialRequestDraft.test.ts` - drawer form -> request payload coverage
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomMaterialsPrint.test.ts` - consolidated print grouping/filter coverage
- `C:\Users\Minh\Desktop\ERP_v1\docs\superpowers\plans\2026-03-24-room-management.md` - this plan

**Modify**
- `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md` - execution checklist and verification evidence
- `C:\Users\Minh\Desktop\ERP_v1\tasks\lessons.md` - only if execution reveals a repeatable mistake or user correction
- `C:\Users\Minh\Desktop\ERP_v1\src\types\roleCatalog.ts` - add `room_management` to `ModuleKey`
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\navigation.ts` - nav item, icon, and module visibility
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\role-access.ts` - maintenance manager role helper(s)
- `C:\Users\Minh\Desktop\ERP_v1\src\App.tsx` - register the three new routes behind `RequireAuth`
- `C:\Users\Minh\Desktop\ERP_v1\src\types\request.ts` - room context fields for room-originated requests
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\request-helpers.ts` - map new request columns into the `Request` model
- `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useRequests.ts` - allow fetch/create of room-scoped `material_release` requests
- `C:\Users\Minh\Desktop\ERP_v1\src\app\requests\page.tsx` - show room badge/context in the request list
- `C:\Users\Minh\Desktop\ERP_v1\src\app\requests\[id]\page.tsx` - show room/floor/linked-issue context in request detail
- `C:\Users\Minh\Desktop\ERP_v1\src\app\approvals\page.tsx` - show room badge/context on approval cards

---

### Task 1: Kick Off Workflow Files And Fixed Room Catalog

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-24-room-management.md`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\types\roomManagement.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\catalog.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomCatalog.test.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\types\roleCatalog.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\lib\navigation.ts`

- [ ] **Step 1: Create the failing room catalog test**

Write `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomCatalog.test.ts` so it locks the fixed-room scope before any UI work:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOM_CATALOG, ROOM_LAYOUTS, getRoomsForFloor, getRoomByCode } from '@/lib/room-management/catalog';

test('room catalog matches the approved fixed floorplans', () => {
  assert.equal(ROOM_CATALOG.length, 35);
  assert.equal(getRoomsForFloor('tang1').length, 17);
  assert.equal(getRoomsForFloor('tang2').length, 12);
  assert.equal(getRoomsForFloor('tang3').length, 6);
  assert.equal(getRoomByCode('t1-p110')?.roomName, 'P110');
  assert.ok(ROOM_LAYOUTS['t1-p110']);
  assert.ok(ROOM_LAYOUTS['t2-xet-nghiem']);
  assert.ok(ROOM_LAYOUTS['t3-phong-hop']);
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `cmd /c npx tsx --test test\unit\roomCatalog.test.ts`

Expected: FAIL because `@/lib/room-management/catalog` and the room domain types do not exist yet.

- [ ] **Step 3: Create the execution task spec and todo checklist**

Use `C:\Users\Minh\Desktop\ERP_v1\tasks\templates\task-spec.template.md` to create `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-24-room-management.md`.

Seed `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md` with:

```md
## 2026-03-24 Room Management

- Scope: build the floorplan-first room management module with fixed rooms, maintenance queue, room material requests, and a consolidated print sheet.
- Checklist:
  - [ ] Seed the fixed room catalog and module scaffolding
  - [ ] Add Supabase schema for room issues and request room context
  - [ ] Build `/room-management` map + drawer
  - [ ] Build `/room-management/maintenance`
  - [ ] Build `/room-management/print/materials`
  - [ ] Show room context on existing request/approval screens
  - [ ] Run verification and capture evidence
```

- [ ] **Step 4: Implement the fixed room catalog and layouts**

Create `C:\Users\Minh\Desktop\ERP_v1\src\types\roomManagement.ts` with:

```ts
export type RoomFloorKey = 'tang1' | 'tang2' | 'tang3';
export type RoomKind = 'reception' | 'medical' | 'lab' | 'pharmacy' | 'utility' | 'office' | 'waiting';

export interface RoomCatalogEntry {
  roomCode: string;
  floorKey: RoomFloorKey;
  roomName: string;
  roomType: RoomKind;
  zone: string;
  sortOrder: number;
}

export interface RoomLayoutEntry {
  left: number;
  top: number;
  width: number;
  height: number;
}
```

Create `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\catalog.ts` with:
- a `ROOM_CATALOG` array for all 35 approved rooms
- a `ROOM_LAYOUTS` record keyed by `roomCode`
- `getRoomsForFloor(floorKey)` and `getRoomByCode(roomCode)`

Recommended pattern:

```ts
export const ROOM_CATALOG: readonly RoomCatalogEntry[] = [
  { roomCode: 't1-p110', floorKey: 'tang1', roomName: 'P110', roomType: 'medical', zone: 'kham-benh', sortOrder: 4 },
  { roomCode: 't2-xet-nghiem', floorKey: 'tang2', roomName: 'Xét Nghiệm', roomType: 'lab', zone: 'xet-nghiem', sortOrder: 3 },
  { roomCode: 't3-phong-hop', floorKey: 'tang3', roomName: 'Phòng Họp', roomType: 'office', zone: 'van-phong', sortOrder: 1 },
];
```

- [ ] **Step 5: Extend module-key and navigation scaffolding**

Modify `C:\Users\Minh\Desktop\ERP_v1\src\types\roleCatalog.ts`:

```ts
export type ModuleKey =
  | 'dashboard'
  | 'requests'
  | 'approvals'
  | 'pharmacy'
  | 'inventory'
  | 'room_management'
  | 'weekly_report'
  | 'portal'
  | 'admin';
```

Modify `C:\Users\Minh\Desktop\ERP_v1\src\lib\navigation.ts`:
- add `room_management: 'all'` to `ROLE_MODULE_VISIBILITY`
- add a nav item such as:

```ts
{ key: 'room_management', path: '/room-management', label: 'Quản lý phòng', icon: Building2 }
```

- [ ] **Step 6: Run the room catalog test to verify GREEN**

Run: `cmd /c npx tsx --test test\unit\roomCatalog.test.ts`

Expected: PASS

- [ ] **Step 7: Commit the workflow + catalog slice**

Run:

```bash
git add tasks/todo.md tasks/active/2026-03-24-room-management.md src/types/roomManagement.ts src/lib/room-management/catalog.ts test/unit/roomCatalog.test.ts src/types/roleCatalog.ts src/lib/navigation.ts
git commit -m "feat: scaffold room management catalog and navigation"
```

### Task 2: Add Supabase Schema And Room Request Context Backbone

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\sql\20260324_room_management_module.sql`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\request-context.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomRequestContext.test.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\types\request.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\lib\request-helpers.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useRequests.ts`

- [ ] **Step 1: Write the failing room request-context test**

Create `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomRequestContext.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapRequestRecord } from '@/lib/request-helpers';
import { getRoomRequestContext } from '@/lib/room-management/request-context';

test('mapRequestRecord preserves room management context', () => {
  const request = mapRequestRecord({
    id: 'req-1',
    request_number: 'REQ-001',
    request_type: 'material_release',
    title: 'Vật tư P110',
    requester_id: 'user-1',
    department_name: 'Khám bệnh',
    status: 'pending',
    priority: 'normal',
    metadata: { items: [{ name: 'Bông', qty: 2, unit: 'gói' }] },
    source_module: 'room_management',
    room_code: 't1-p110',
    linked_issue_id: 'issue-1',
    approvalSteps: [],
    attachments: [],
    created_at: '2026-03-24T08:00:00Z',
    updated_at: '2026-03-24T08:00:00Z',
  });

  assert.equal(request.sourceModule, 'room_management');
  assert.equal(request.roomCode, 't1-p110');
  assert.equal(request.linkedIssueId, 'issue-1');
  assert.equal(getRoomRequestContext(request)?.roomName, 'P110');
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `cmd /c npx tsx --test test\unit\roomRequestContext.test.ts`

Expected: FAIL because the `Request` model and mapping helpers do not expose room context yet.

- [ ] **Step 3: Write the additive SQL migration**

Create `C:\Users\Minh\Desktop\ERP_v1\sql\20260324_room_management_module.sql` with:
- `fdc_room_catalog`
- `fdc_room_issues`
- `fdc_room_issue_events`
- `ALTER TABLE public.fdc_approval_requests ADD COLUMN IF NOT EXISTS source_module text, room_code text, linked_issue_id uuid`
- foreign keys / indexes
- seed rows for all 35 fixed rooms
- RLS policies for authenticated create/read and manager-only status updates

Core DDL shape:

```sql
create table if not exists public.fdc_room_issues (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.fdc_room_catalog(room_code),
  issue_type text not null check (issue_type in ('incident', 'maintenance')),
  severity text not null check (severity in ('low', 'medium', 'high', 'urgent')),
  status text not null check (status in ('new', 'triaged', 'in_progress', 'waiting_material', 'resolved', 'cancelled')),
  title text not null,
  description text not null,
  reported_by uuid not null references public.fdc_user_mapping(id),
  assigned_to uuid references public.fdc_user_mapping(id)
);
```

- [ ] **Step 4: Implement room request context in TypeScript**

Modify `C:\Users\Minh\Desktop\ERP_v1\src\types\request.ts`:

```ts
export interface Request {
  // existing fields...
  sourceModule?: string;
  roomCode?: string;
  linkedIssueId?: string;
}
```

Create `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\request-context.ts`:

```ts
import type { Request } from '@/types/request';
import { getRoomByCode } from '@/lib/room-management/catalog';

export function getRoomRequestContext(request: Pick<Request, 'sourceModule' | 'roomCode' | 'linkedIssueId'>) {
  if (request.sourceModule !== 'room_management' || !request.roomCode) return null;
  const room = getRoomByCode(request.roomCode);
  if (!room) return null;
  return { roomCode: room.roomCode, roomName: room.roomName, floorKey: room.floorKey, linkedIssueId: request.linkedIssueId ?? null };
}
```

Modify `C:\Users\Minh\Desktop\ERP_v1\src\lib\request-helpers.ts` so `mapRequestRecord()` maps the three new columns.

- [ ] **Step 5: Run the room request-context test to verify GREEN**

Run: `cmd /c npx tsx --test test\unit\roomRequestContext.test.ts`

Expected: PASS

- [ ] **Step 6: Record the SQL verification command in the task spec**

Add this to `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-24-room-management.md` under verification:

```md
- Apply `sql/20260324_room_management_module.sql` in the target Supabase environment.
- Verify `select count(*) from public.fdc_room_catalog;` returns `35`.
```

- [ ] **Step 7: Commit the schema + request-context slice**

Run:

```bash
git add sql/20260324_room_management_module.sql src/lib/room-management/request-context.ts test/unit/roomRequestContext.test.ts src/types/request.ts src/lib/request-helpers.ts src/viewmodels/useRequests.ts tasks/active/2026-03-24-room-management.md
git commit -m "feat: add room management schema and request context"
```

### Task 3: Build The Room Map Home Screen And Drawer Summaries

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\summary.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useRoomManagement.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\FloorPlanCanvas.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\RoomDrawer.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\page.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\App.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomSummary.test.ts`

- [ ] **Step 1: Write the failing room-summary test**

Create `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomSummary.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoomSummaryMap } from '@/lib/room-management/summary';

test('buildRoomSummaryMap counts open issues and room material requests per room', () => {
  const summary = buildRoomSummaryMap(
    [
      { id: 'issue-1', roomCode: 't1-p110', status: 'new', severity: 'high' },
      { id: 'issue-2', roomCode: 't1-p110', status: 'resolved', severity: 'low' },
    ],
    [
      { id: 'req-1', roomCode: 't1-p110', sourceModule: 'room_management', status: 'pending' },
      { id: 'req-2', roomCode: 't1-p110', sourceModule: 'room_management', status: 'approved' },
      { id: 'req-3', roomCode: 't1-p109', sourceModule: 'room_management', status: 'pending' },
    ],
  );

  assert.equal(summary['t1-p110'].openIssueCount, 1);
  assert.equal(summary['t1-p110'].materialRequestCount, 2);
  assert.equal(summary['t1-p109'].materialRequestCount, 1);
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `cmd /c npx tsx --test test\unit\roomSummary.test.ts`

Expected: FAIL because the summary helper does not exist yet.

- [ ] **Step 3: Implement the room-summary helper**

Create `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\summary.ts`:

```ts
export function buildRoomSummaryMap(issues: RoomIssueSummary[], requests: RoomRequestSummary[]) {
  const summary = Object.fromEntries(ROOM_CATALOG.map((room) => [
    room.roomCode,
    { openIssueCount: 0, materialRequestCount: 0, latestActivityAt: null as string | null },
  ]));

  for (const issue of issues) {
    if (!['resolved', 'cancelled'].includes(issue.status)) summary[issue.roomCode].openIssueCount += 1;
  }

  for (const request of requests) {
    if (request.sourceModule === 'room_management' && request.roomCode && ['pending', 'approved'].includes(request.status)) {
      summary[request.roomCode].materialRequestCount += 1;
    }
  }

  return summary;
}
```

- [ ] **Step 4: Build the main viewmodel**

Create `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useRoomManagement.ts` to:
- fetch room issues from `fdc_room_issues`
- reuse `useRequests()` data and filter `sourceModule === 'room_management'`
- manage `selectedFloorKey` and `selectedRoomCode`
- expose room summary data for the canvas and the drawer

Keep side effects in the viewmodel, not in `page.tsx`.

- [ ] **Step 5: Build the route and UI components**

Create `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\FloorPlanCanvas.tsx` and `RoomDrawer.tsx`.

Keep the page thin:

```tsx
export default function RoomManagementPage() {
  const vm = useRoomManagement();
  return (
    <div className="space-y-6">
      <FloorPlanCanvas {...vm.canvasProps} />
      <RoomDrawer {...vm.drawerProps} />
    </div>
  );
}
```

Modify `C:\Users\Minh\Desktop\ERP_v1\src\App.tsx` to register:

```tsx
<Route
  path="/room-management"
  element={
    <RequireAuth moduleKey="room_management">
      <RoomManagementPage />
    </RequireAuth>
  }
/>
```

- [ ] **Step 6: Run the room-summary test to verify GREEN**

Run: `cmd /c npx tsx --test test\unit\roomSummary.test.ts`

Expected: PASS

- [ ] **Step 7: Commit the room-map slice**

Run:

```bash
git add src/lib/room-management/summary.ts src/viewmodels/useRoomManagement.ts src/components/room-management/FloorPlanCanvas.tsx src/components/room-management/RoomDrawer.tsx src/app/room-management/page.tsx src/App.tsx test/unit/roomSummary.test.ts
git commit -m "feat: add room management floorplan home"
```

### Task 4: Build Maintenance Issue Reporting And The Queue Screen

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\issues.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useRoomMaintenanceQueue.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\IssueReportSheet.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\MaintenanceBoard.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\maintenance\page.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\types\roomManagement.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\lib\role-access.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomIssueStatus.test.ts`

- [ ] **Step 1: Write the failing issue-status test**

Create `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomIssueStatus.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionRoomIssue, groupIssuesByStatus } from '@/lib/room-management/issues';

test('room issue transitions follow the approved operational lifecycle', () => {
  assert.equal(canTransitionRoomIssue('new', 'triaged'), true);
  assert.equal(canTransitionRoomIssue('triaged', 'in_progress'), true);
  assert.equal(canTransitionRoomIssue('in_progress', 'waiting_material'), true);
  assert.equal(canTransitionRoomIssue('resolved', 'new'), false);
});

test('groupIssuesByStatus returns board columns in workflow order', () => {
  const grouped = groupIssuesByStatus([
    { id: '1', status: 'new' },
    { id: '2', status: 'waiting_material' },
  ]);
  assert.equal(grouped[0].status, 'new');
  assert.equal(grouped[3].status, 'waiting_material');
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `cmd /c npx tsx --test test\unit\roomIssueStatus.test.ts`

Expected: FAIL because the room-issue helper does not exist yet.

- [ ] **Step 3: Implement issue-status helpers**

Create `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\issues.ts`:

```ts
export const ROOM_ISSUE_STATUSES = ['new', 'triaged', 'in_progress', 'waiting_material', 'resolved', 'cancelled'] as const;

const ALLOWED_TRANSITIONS: Record<RoomIssueStatus, readonly RoomIssueStatus[]> = {
  new: ['triaged', 'cancelled'],
  triaged: ['in_progress', 'waiting_material', 'cancelled'],
  in_progress: ['waiting_material', 'resolved', 'cancelled'],
  waiting_material: ['in_progress', 'cancelled'],
  resolved: [],
  cancelled: [],
};
```

- [ ] **Step 4: Build the queue viewmodel and UI**

Create `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useRoomMaintenanceQueue.ts` to:
- fetch `fdc_room_issues`
- expose filters by floor, status, severity, assignee
- gate status updates behind a helper from `src/lib/role-access.ts`

Add to `C:\Users\Minh\Desktop\ERP_v1\src\lib\role-access.ts`:

```ts
export const ROOM_MAINTENANCE_MANAGER_ROLES: readonly Role[] = ['dept_head', 'head_nurse', 'super_admin'];
export function canManageRoomMaintenance(role: Role) {
  return ROOM_MAINTENANCE_MANAGER_ROLES.includes(role);
}
```

Create the queue route at `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\maintenance\page.tsx`.

- [ ] **Step 5: Add the issue-report sheet to the room drawer**

Create `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\IssueReportSheet.tsx` with minimal fields:
- issue type
- title
- description
- severity

On submit, write directly to `fdc_room_issues`. Do not add attachments in v1.

- [ ] **Step 6: Run the issue-status test to verify GREEN**

Run: `cmd /c npx tsx --test test\unit\roomIssueStatus.test.ts`

Expected: PASS

- [ ] **Step 7: Commit the maintenance slice**

Run:

```bash
git add src/lib/room-management/issues.ts src/viewmodels/useRoomMaintenanceQueue.ts src/components/room-management/IssueReportSheet.tsx src/components/room-management/MaintenanceBoard.tsx src/app/room-management/maintenance/page.tsx src/types/roomManagement.ts src/lib/role-access.ts test/unit/roomIssueStatus.test.ts
git commit -m "feat: add room maintenance queue and issue reporting"
```

### Task 5: Add The Room Material Request Sheet And Existing Request-Screen Context

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\material-request.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\RoomMaterialRequestSheet.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomMaterialRequestDraft.test.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useRequests.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\requests\page.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\requests\[id]\page.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\approvals\page.tsx`

- [ ] **Step 1: Write the failing room-material payload test**

Create `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomMaterialRequestDraft.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoomMaterialRequestInput } from '@/lib/room-management/material-request';

test('buildRoomMaterialRequestInput produces a room-scoped material_release request', () => {
  const payload = buildRoomMaterialRequestInput({
    roomCode: 't1-p110',
    title: 'Vật tư cho P110',
    description: 'Bổ sung vật tư cuối ca',
    items: [{ name: 'Bông', qty: 2, unit: 'gói' }],
  });

  assert.equal(payload.type, 'material_release');
  assert.equal(payload.sourceModule, 'room_management');
  assert.equal(payload.roomCode, 't1-p110');
  assert.equal(payload.metadata?.items?.[0]?.name, 'Bông');
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `cmd /c npx tsx --test test\unit\roomMaterialRequestDraft.test.ts`

Expected: FAIL because the room-material helper does not exist yet.

- [ ] **Step 3: Implement the request builder helper**

Create `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\material-request.ts`:

```ts
export function buildRoomMaterialRequestInput(input: RoomMaterialDraft) {
  return {
    type: 'material_release' as const,
    title: input.title.trim(),
    description: input.description.trim(),
    priority: input.priority ?? 'normal',
    sourceModule: 'room_management',
    roomCode: input.roomCode,
    linkedIssueId: input.linkedIssueId ?? undefined,
    metadata: {
      items: input.items.map((item) => ({
        name: item.name.trim(),
        qty: Number(item.qty),
        unit: item.unit.trim(),
      })),
    },
  };
}
```

- [ ] **Step 4: Wire the room material request sheet**

Create `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\RoomMaterialRequestSheet.tsx` to:
- prefill the selected room
- collect line items
- call `useRequests().createRequest()` with `buildRoomMaterialRequestInput()`
- optionally pass `linkedIssueId` when launched from a maintenance issue

Update `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useRequests.ts` so `createRequest()` persists:

```ts
.insert({
  request_type: newRequest.type,
  source_module: newRequest.sourceModule ?? null,
  room_code: newRequest.roomCode ?? null,
  linked_issue_id: newRequest.linkedIssueId ?? null,
})
```

- [ ] **Step 5: Show room context on existing request/approval pages**

Modify:
- `C:\Users\Minh\Desktop\ERP_v1\src\app\requests\page.tsx`
- `C:\Users\Minh\Desktop\ERP_v1\src\app\requests\[id]\page.tsx`
- `C:\Users\Minh\Desktop\ERP_v1\src\app\approvals\page.tsx`

Use `getRoomRequestContext(req)` to display:
- a room badge on list cards
- room/floor on detail
- linked issue badge when present

Example detail block:

```tsx
const roomContext = getRoomRequestContext(request);
{roomContext && (
  <div>
    <dt className="text-gray-500 mb-1">Phòng</dt>
    <dd className="font-medium text-gray-900">{roomContext.roomName}</dd>
  </div>
)}
```

- [ ] **Step 6: Run the targeted tests to verify GREEN**

Run:
- `cmd /c npx tsx --test test\unit\roomMaterialRequestDraft.test.ts`
- `cmd /c npx tsx --test test\unit\roomRequestContext.test.ts`

Expected: PASS

- [ ] **Step 7: Commit the room request slice**

Run:

```bash
git add src/lib/room-management/material-request.ts src/components/room-management/RoomMaterialRequestSheet.tsx test/unit/roomMaterialRequestDraft.test.ts src/viewmodels/useRequests.ts src/app/requests/page.tsx src/app/requests/[id]/page.tsx src/app/approvals/page.tsx
git commit -m "feat: add room-scoped material requests"
```

### Task 6: Build The Consolidated Materials Print Screen

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\print.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useRoomMaterialsPrint.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\MaterialsPrintPreview.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\print\materials\page.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomMaterialsPrint.test.ts`

- [ ] **Step 1: Write the failing print-grouping test**

Create `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomMaterialsPrint.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoomMaterialsPrintGroups } from '@/lib/room-management/print';

test('buildRoomMaterialsPrintGroups groups room requests by floor then room', () => {
  const groups = buildRoomMaterialsPrintGroups({
    requests: [
      {
        id: 'req-1',
        sourceModule: 'room_management',
        roomCode: 't1-p110',
        status: 'pending',
        createdAt: '2026-03-24T08:00:00Z',
        metadata: { items: [{ name: 'Bông', qty: 2, unit: 'gói' }] },
      },
      {
        id: 'req-2',
        sourceModule: 'room_management',
        roomCode: 't2-p203',
        status: 'approved',
        createdAt: '2026-03-24T10:00:00Z',
        metadata: { items: [{ name: 'Găng tay', qty: 1, unit: 'hộp' }] },
      },
    ],
    fromDate: '2026-03-24',
    toDate: '2026-03-24',
    statuses: ['pending', 'approved'],
  });

  assert.equal(groups[0].floorKey, 'tang1');
  assert.equal(groups[0].rooms[0].roomName, 'P110');
  assert.equal(groups[1].rooms[0].items[0].name, 'Găng tay');
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `cmd /c npx tsx --test test\unit\roomMaterialsPrint.test.ts`

Expected: FAIL because the grouping helper does not exist yet.

- [ ] **Step 3: Implement the pure print helper**

Create `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\print.ts`:

```ts
export function buildRoomMaterialsPrintGroups(input: RoomMaterialsPrintInput) {
  const relevant = input.requests
    .filter((request) => request.sourceModule === 'room_management')
    .filter((request) => request.roomCode && input.statuses.includes(request.status))
    .filter((request) => request.createdAt.slice(0, 10) >= input.fromDate && request.createdAt.slice(0, 10) <= input.toDate);

  // group by floor, then room, flatten items
}
```

Keep the grouping helper pure so the print viewmodel and preview component stay simple.

- [ ] **Step 4: Build the print viewmodel and page**

Create `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useRoomMaterialsPrint.ts` to:
- reuse `useRequests()` data or fetch room-originated requests directly
- manage filter state (`fromDate`, `toDate`, `floor`, `statuses`)
- expose the grouped print structure

Create `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\MaterialsPrintPreview.tsx` and `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\print\materials\page.tsx`.

Include a browser-print action:

```tsx
<button type="button" onClick={() => window.print()} className="...">
  In
</button>
```

- [ ] **Step 5: Run the print-grouping test to verify GREEN**

Run: `cmd /c npx tsx --test test\unit\roomMaterialsPrint.test.ts`

Expected: PASS

- [ ] **Step 6: Commit the print slice**

Run:

```bash
git add src/lib/room-management/print.ts src/viewmodels/useRoomMaterialsPrint.ts src/components/room-management/MaterialsPrintPreview.tsx src/app/room-management/print/materials/page.tsx test/unit/roomMaterialsPrint.test.ts
git commit -m "feat: add room materials print preview"
```

### Task 7: Run Verification And Capture Evidence

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-24-room-management.md`
- Modify if needed: `C:\Users\Minh\Desktop\ERP_v1\tasks\lessons.md`

- [ ] **Step 1: Run all room-management unit tests**

Run:

```bash
cmd /c npx tsx --test test\unit\roomCatalog.test.ts
cmd /c npx tsx --test test\unit\roomSummary.test.ts
cmd /c npx tsx --test test\unit\roomIssueStatus.test.ts
cmd /c npx tsx --test test\unit\roomRequestContext.test.ts
cmd /c npx tsx --test test\unit\roomMaterialRequestDraft.test.ts
cmd /c npx tsx --test test\unit\roomMaterialsPrint.test.ts
```

Expected: PASS

- [ ] **Step 2: Run the portal build**

Run: `cmd /c npm run build`

Workdir: `C:\Users\Minh\Desktop\ERP_v1`

Expected: PASS

- [ ] **Step 3: Run the type-check**

Run: `cmd /c npm run lint`

Workdir: `C:\Users\Minh\Desktop\ERP_v1`

Expected: PASS. If unrelated pre-existing failures remain in the repo, record them verbatim and isolate whether any new room-management files are implicated.

- [ ] **Step 4: Apply and verify the SQL migration**

Run the target-environment SQL deployment flow for `C:\Users\Minh\Desktop\ERP_v1\sql\20260324_room_management_module.sql`.

Minimum verification queries:

```sql
select count(*) from public.fdc_room_catalog;
select room_code, floor_key, room_name from public.fdc_room_catalog order by floor_key, sort_order;
select column_name from information_schema.columns where table_name = 'fdc_approval_requests' and column_name in ('source_module', 'room_code', 'linked_issue_id');
```

Expected:
- room count = `35`
- all three request-context columns present

- [ ] **Step 5: Browser smoke the three screens**

Check:
- `/room-management`
  - correct floor tabs
  - clicking a room opens the matching drawer
  - room badges reflect open issues and material requests
- `/room-management/maintenance`
  - board/list renders and status changes are gated correctly
- `/room-management/print/materials`
  - one consolidated sheet grouped by floor then room
  - `window.print()` preview is legible

- [ ] **Step 6: Record evidence and residual risks**

Update `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md` and `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-24-room-management.md` with:
- exact commands
- pass/fail output summary
- SQL verification result
- browser smoke notes
- residual risk list

- [ ] **Step 7: Add a lesson only if execution reveals a repeatable mistake**

If there is a user correction or a preventable implementation mistake, append a concrete entry to `C:\Users\Minh\Desktop\ERP_v1\tasks\lessons.md`.

- [ ] **Step 8: Commit the verification record**

Run:

```bash
git add tasks/todo.md tasks/active/2026-03-24-room-management.md tasks/lessons.md
git commit -m "docs: record room management verification"
```
