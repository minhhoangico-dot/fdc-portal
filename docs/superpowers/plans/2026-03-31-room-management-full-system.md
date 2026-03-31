# Room Management Full-System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Room Management from a frontend-first mock into a real Supabase-backed workflow module, add the new room/business roles, and move the portal onto a centralized permission matrix that governs all major modules.

**Architecture:** Keep the existing request engine (`fdc_approval_requests` + `fdc_approval_steps`) as the formal approval backbone, but add a room workflow layer for intakes, consolidation links, and downstream handoffs. Move authorization into a typed permission matrix so navigation, route guards, dashboard widgets, page actions, and workflow decisions all read from one shared source of truth.

**Tech Stack:** React 19, TypeScript, React Router 7, Supabase client, Postgres SQL + RLS, Tailwind CSS 4, `tsx --test`, existing portal viewmodel pattern

---

## Execution Prerequisites

- Work in the current workspace because the approved spec and the frontend-first Room Management changes are already present here and not yet fully integrated elsewhere.
- Follow `@test-driven-development` for each new behavior slice.
- Before claiming any slice complete, follow `@verification-before-completion`.
- Keep changes incremental and additive; do not break the live request engine while introducing room workflows.

## File Structure

**Create**
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\permissions\matrix.ts`
  - central `module -> action -> allowed roles` definition
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\permissions\access.ts`
  - helpers such as `can(role, action)`, `getAccessibleModules(role)`, and route/action guards
- `C:\Users\Minh\Desktop\ERP_v1\src\types\permissions.ts`
  - typed action keys and access-level shapes
- `C:\Users\Minh\Desktop\ERP_v1\src\types\roomWorkflow.ts`
  - room intake, intake item, intake link, handoff, and workflow-metadata types
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\routing.ts`
  - review-group routing and role resolution from room metadata
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\workflow.ts`
  - room intake normalization, consolidation, and handoff helpers
- `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useRoomWorkflow.ts`
  - Supabase-backed room intake / reviewer queue / consolidation hook
- `C:\Users\Minh\Desktop\ERP_v1\sql\20260331_room_management_full_system.sql`
  - new roles, room workflow tables, handoff tables, and RLS updates
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\permissionMatrix.test.ts`
  - permission-matrix unit coverage
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomWorkflowRouting.test.ts`
  - review-group and role-routing coverage
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomWorkflowHelpers.test.ts`
  - intake normalization, consolidation, and handoff helper coverage
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\approvalsQueue.test.ts`
  - unified approvals + handoff queue coverage

**Modify**
- `C:\Users\Minh\Desktop\ERP_v1\src\types\user.ts`
  - extend `Role`
- `C:\Users\Minh\Desktop\ERP_v1\src\types\roleCatalog.ts`
  - align role/module typing with the new matrix
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\role-catalog.ts`
  - default labels/descriptions/sort order for new roles
- `C:\Users\Minh\Desktop\ERP_v1\src\contexts\RoleCatalogContext.tsx`
  - ensure new roles load and render correctly
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\navigation.ts`
  - replace direct role lists with permission-driven module visibility
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\role-access.ts`
  - reduce to compatibility shims or remove duplicated role groups
- `C:\Users\Minh\Desktop\ERP_v1\src\components\auth\RequireAuth.tsx`
  - gate modules/actions through the shared permission helpers
- `C:\Users\Minh\Desktop\ERP_v1\src\app\dashboard\page.tsx`
  - remove inline role checks for widgets/quick actions where touched
- `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useDashboard.ts`
  - derive quick actions and widgets from the matrix
- `C:\Users\Minh\Desktop\ERP_v1\src\types\request.ts`
  - extend metadata typing for room workflow hints and handoff context
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\request-helpers.ts`
  - parse room workflow metadata and derived labels
- `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useRequests.ts`
  - expose room-origin requests and related linked metadata
- `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useApprovals.ts`
  - merge approval-step work with assigned handoff tasks and forward behavior
- `C:\Users\Minh\Desktop\ERP_v1\src\app\requests\page.tsx`
  - render room workflow labels and filters safely
- `C:\Users\Minh\Desktop\ERP_v1\src\app\requests\[id]\page.tsx`
  - show room provenance, linked intakes, and downstream handoff history
- `C:\Users\Minh\Desktop\ERP_v1\src\app\approvals\page.tsx`
  - render review, approval, and handoff sections in one queue
- `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\page.tsx`
  - replace mock provider wiring with real workflow-backed behavior
- `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\maintenance\page.tsx`
  - switch to real maintenance intake/reviewer data
- `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\print\materials\page.tsx`
  - drive print summary from real material intake / consolidation data
- `C:\Users\Minh\Desktop\ERP_v1\src\contexts\RoomManagementContext.tsx`
  - either convert to a thin workflow facade or replace with `useRoomWorkflow`
- `C:\Users\Minh\Desktop\ERP_v1\src\lib\constants.ts`
  - labels for new roles and room workflow kinds if needed
- `C:\Users\Minh\Desktop\ERP_v1\src\App.tsx`
  - keep route grouping consistent with new reviewer/queue surfaces
- `C:\Users\Minh\Desktop\ERP_v1\test\unit\navigation.test.ts`
  - verify permission-driven nav
- `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md`
  - track plan execution and verification evidence
- `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-31-room-management-full-system.md`
  - record verification and residual risks

## Task 1: Build The Permission Foundation

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\types\permissions.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\lib\permissions\matrix.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\lib\permissions\access.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\test\unit\permissionMatrix.test.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\types\user.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\types\roleCatalog.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\lib\role-catalog.ts`

- [ ] **Step 1: Write the failing permission-matrix test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { can, canAccessModule } from '@/lib/permissions/access';

test('new role matrix grants room review only to the intended roles', () => {
  assert.equal(can('pharmacy_head', 'room_management.review_group_queue'), true);
  assert.equal(can('staff', 'room_management.review_group_queue'), false);
  assert.equal(can('chief_accountant', 'approvals.forward_manual'), true);
  assert.equal(can('internal_accountant', 'approvals.forward_manual'), false);
  assert.equal(canAccessModule('hr_records', 'approvals'), true);
  assert.equal(canAccessModule('doctor', 'admin'), false);
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `cmd /c npx tsx --test test\\unit\\permissionMatrix.test.ts`
Expected: FAIL because the permission layer and new roles do not exist yet.

- [ ] **Step 3: Extend role typing and role catalog defaults**

Update:
- `src/types/user.ts`
- `src/types/roleCatalog.ts`
- `src/lib/role-catalog.ts`

Add:
- `pharmacy_head`
- `accounting_supervisor`
- `lab_head`
- `chief_accountant`
- `internal_accountant`
- `hr_records`

Keep legacy `accountant` for transition compatibility.

- [ ] **Step 4: Implement the typed permission matrix**

Create `src/types/permissions.ts` with:
- module keys
- action keys
- access level types

Create `src/lib/permissions/matrix.ts` with:
- action definitions for:
  - `dashboard`
  - `requests`
  - `approvals`
  - `room_management`
  - `pharmacy`
  - `inventory`
  - `valuation`
  - `weekly_report`
  - `lab_dashboard`
  - `tv_management`
  - `portal`
  - `admin`

Create `src/lib/permissions/access.ts` with:
- `can(role, action)`
- `canAccessModule(role, moduleKey)`
- `getVisibleModules(role)`

- [ ] **Step 5: Run the test to verify GREEN**

Run: `cmd /c npx tsx --test test\\unit\\permissionMatrix.test.ts`
Expected: PASS

- [ ] **Step 6: Commit the permission foundation**

```bash
git add src/types/user.ts src/types/roleCatalog.ts src/lib/role-catalog.ts src/types/permissions.ts src/lib/permissions/matrix.ts src/lib/permissions/access.ts test/unit/permissionMatrix.test.ts
git commit -m "feat: add centralized permission matrix"
```

## Task 2: Replace Permission Consumers In Navigation And Auth

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\lib\navigation.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\lib\role-access.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\components\auth\RequireAuth.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useDashboard.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\dashboard\page.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\test\unit\navigation.test.ts`

- [ ] **Step 1: Write the failing navigation regression**

Add assertions to `test/unit/navigation.test.ts` for:
- `pharmacy_head` sees `pharmacy`, `requests`, `approvals`, `room_management`, `portal`
- `hr_records` sees `approvals`, `requests`, `portal`, but not `inventory` or `admin`
- `chief_accountant` sees `approvals`, `requests`, `inventory`, `valuation`, `room_management`

- [ ] **Step 2: Run the navigation test to verify RED**

Run: `cmd /c npx tsx --test test\\unit\\navigation.test.ts`
Expected: FAIL because navigation is still backed by hardcoded role lists.

- [ ] **Step 3: Move navigation to permission-driven visibility**

Modify `src/lib/navigation.ts` so:
- module visibility is derived from `canAccessModule()`
- no module visibility list duplicates the new permission matrix

Modify `src/components/auth/RequireAuth.tsx` so:
- `moduleKey` checks go through the permission layer
- optional future action guards can plug into the same helper

Modify `src/lib/role-access.ts` so:
- old exported role arrays become compatibility wrappers or are removed once consumers move off them

- [ ] **Step 4: Update dashboard quick actions and widgets**

Modify `src/viewmodels/useDashboard.ts` and `src/app/dashboard/page.tsx` so:
- quick actions come from the permission layer
- inline `user.role === ...` checks are replaced where touched by matrix-backed helpers
- the new roles do not need one-off dashboard conditions

- [ ] **Step 5: Run regression checks**

Run:
- `cmd /c npx tsx --test test\\unit\\permissionMatrix.test.ts`
- `cmd /c npx tsx --test test\\unit\\navigation.test.ts`

Expected: PASS

- [ ] **Step 6: Commit the auth/navigation slice**

```bash
git add src/lib/navigation.ts src/lib/role-access.ts src/components/auth/RequireAuth.tsx src/viewmodels/useDashboard.ts src/app/dashboard/page.tsx test/unit/navigation.test.ts
git commit -m "feat: use permission matrix for portal access"
```

## Task 3: Add SQL And Room Workflow Data Structures

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\sql\20260331_room_management_full_system.sql`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\types\roomWorkflow.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\routing.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\workflow.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomWorkflowRouting.test.ts`
- Create: `C:\Users\Minh\Desktop\ERP_v1\test\unit\roomWorkflowHelpers.test.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\lib\room-management\catalog.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\types\request.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\lib\request-helpers.ts`

- [ ] **Step 1: Write the failing routing and workflow helper tests**

Add `test/unit/roomWorkflowRouting.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { getReviewGroupForRoom, getReviewerRoleForGroup } from '@/lib/room-management/routing';

test('room routing resolves reviewer roles from room review groups', () => {
  assert.equal(getReviewGroupForRoom('P304'), 'accounting_304');
  assert.equal(getReviewerRoleForGroup('accounting_304'), 'accounting_supervisor');
  assert.equal(getReviewerRoleForGroup('general_care'), 'head_nurse');
});
```

Add `test/unit/roomWorkflowHelpers.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoomWorkflowMetadata, buildMaterialConsolidationPayload } from '@/lib/room-management/workflow';

test('material consolidation metadata keeps source intake provenance', () => {
  const payload = buildMaterialConsolidationPayload({
    roomCode: 'P304',
    reviewGroup: 'accounting_304',
    intakeIds: ['i1', 'i2'],
  });

  assert.equal(payload.requestType, 'purchase');
  assert.equal(payload.metadata.workflowKind, 'room_material');
  assert.deepEqual(payload.metadata.sourceIntakeIds, ['i1', 'i2']);
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run:
- `cmd /c npx tsx --test test\\unit\\roomWorkflowRouting.test.ts`
- `cmd /c npx tsx --test test\\unit\\roomWorkflowHelpers.test.ts`

Expected: FAIL because the routing and workflow helpers do not exist yet.

- [ ] **Step 3: Extend room catalog and request metadata typing**

Modify `src/lib/room-management/catalog.ts` so each room has:
- stable `roomCode`
- `reviewGroup`
- enough data to build backend records consistently

Modify `src/types/request.ts` and `src/lib/request-helpers.ts` so request metadata can safely carry:
- `workflowKind`
- `roomId`
- `roomCode`
- `roomName`
- `reviewGroup`
- `sourceIntakeIds`
- `originModule`

- [ ] **Step 4: Implement routing and workflow helper modules**

Create:
- `src/types/roomWorkflow.ts`
- `src/lib/room-management/routing.ts`
- `src/lib/room-management/workflow.ts`

Include:
- reviewer-role lookup from review groups
- intake-to-request metadata builders
- maintenance promotion helpers
- material consolidation builders
- downstream handoff payload helpers

- [ ] **Step 5: Write the additive SQL migration**

Create `sql/20260331_room_management_full_system.sql` with:
- role constraint and seed updates
- `fdc_room_catalog`
- `fdc_room_intakes`
- `fdc_room_intake_items`
- `fdc_room_intake_links`
- `fdc_request_handoffs`
- indices
- RLS policies
- updates to role-sensitive SQL functions

Use the existing SQL style in:
- `sql/20260315_request_backend_support.sql`
- `sql/20260323_head_nurse_role.sql`

- [ ] **Step 6: Run the tests to verify GREEN**

Run:
- `cmd /c npx tsx --test test\\unit\\roomWorkflowRouting.test.ts`
- `cmd /c npx tsx --test test\\unit\\roomWorkflowHelpers.test.ts`

Expected: PASS

- [ ] **Step 7: Commit the workflow foundation**

```bash
git add src/types/roomWorkflow.ts src/lib/room-management/routing.ts src/lib/room-management/workflow.ts src/lib/room-management/catalog.ts src/types/request.ts src/lib/request-helpers.ts sql/20260331_room_management_full_system.sql test/unit/roomWorkflowRouting.test.ts test/unit/roomWorkflowHelpers.test.ts
git commit -m "feat: add room workflow schema and routing"
```

## Task 4: Replace Mock Room State With Supabase-Backed Workflow State

**Files:**
- Create: `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useRoomWorkflow.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\contexts\RoomManagementContext.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\page.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\maintenance\page.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\room-management\print\materials\page.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\MaintenanceTab.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\components\room-management\SupplyTab.tsx`

- [ ] **Step 1: Write a failing workflow-state test**

Add a small reducer/helper assertion to `test/unit/roomState.test.ts` or a new `test/unit/roomWorkflowState.test.ts` for:
- creating a material intake
- creating a maintenance intake
- deriving reviewer queue counts from fetched data

- [ ] **Step 2: Run the test to verify RED**

Run: `cmd /c npx tsx --test test\\unit\\roomState.test.ts`
Expected: FAIL because the context still assumes session-only mock arrays.

- [ ] **Step 3: Implement `useRoomWorkflow`**

Create `src/viewmodels/useRoomWorkflow.ts` with:
- intake fetches from Supabase
- insert helpers for material and maintenance intakes
- reviewer queue queries by `review_group`
- consolidation action stubs that create formal requests
- derived summary state for the map and print screen

Use the current viewmodel pattern from:
- `src/viewmodels/useRequests.ts`
- `src/viewmodels/useApprovals.ts`

- [ ] **Step 4: Convert the Room Management context into a thin facade**

Modify `src/contexts/RoomManagementContext.tsx` so it either:
- wraps `useRoomWorkflow`, or
- is replaced by direct hook usage if the facade no longer adds value

Remove assumptions that state resets on refresh.

- [ ] **Step 5: Update Room Management pages and forms**

Modify:
- `src/app/room-management/page.tsx`
- `src/app/room-management/maintenance/page.tsx`
- `src/app/room-management/print/materials/page.tsx`
- `src/components/room-management/MaintenanceTab.tsx`
- `src/components/room-management/SupplyTab.tsx`

So they:
- create real intakes
- show real reviewer or requester state
- stop relying on session-only seed records as the source of truth

- [ ] **Step 6: Run focused checks**

Run:
- `cmd /c npx tsx --test test\\unit\\roomCatalog.test.ts`
- `cmd /c npx tsx --test test\\unit\\roomSummary.test.ts`
- `cmd /c npx tsx --test test\\unit\\roomMaintenance.test.ts`
- `cmd /c npx tsx --test test\\unit\\roomPrint.test.ts`
- `cmd /c npx tsx --test test\\unit\\roomState.test.ts`

Expected: PASS after adapting tests to the real workflow-backed behavior.

- [ ] **Step 7: Commit the Room Management backend slice**

```bash
git add src/viewmodels/useRoomWorkflow.ts src/contexts/RoomManagementContext.tsx src/app/room-management/page.tsx src/app/room-management/maintenance/page.tsx src/app/room-management/print/materials/page.tsx src/components/room-management/MaintenanceTab.tsx src/components/room-management/SupplyTab.tsx test/unit/roomState.test.ts test/unit/roomCatalog.test.ts test/unit/roomSummary.test.ts test/unit/roomMaintenance.test.ts test/unit/roomPrint.test.ts
git commit -m "feat: connect room management to real workflow data"
```

## Task 5: Integrate Room Workflows Into Requests And Approvals

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useRequests.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\viewmodels\useApprovals.ts`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\requests\page.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\requests\[id]\page.tsx`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\src\app\approvals\page.tsx`
- Create: `C:\Users\Minh\Desktop\ERP_v1\test\unit\approvalsQueue.test.ts`

- [ ] **Step 1: Write the failing approvals-queue regression**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApprovalWorkQueue } from '@/viewmodels/useApprovals';

test('approval queue separates pending approvals from downstream handoffs', () => {
  const queue = buildApprovalWorkQueue({
    approvals: [{ id: 'r1', status: 'pending', approvalSteps: [{ id: 's1', status: 'pending' }] }],
    handoffs: [{ id: 'h1', status: 'pending', assigneeRole: 'internal_accountant' }],
  });

  assert.equal(queue.approvals.length, 1);
  assert.equal(queue.handoffs.length, 1);
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `cmd /c npx tsx --test test\\unit\\approvalsQueue.test.ts`
Expected: FAIL because approvals currently have no unified handoff queue helper.

- [ ] **Step 3: Extend request loading for room-origin metadata**

Modify `src/viewmodels/useRequests.ts` so:
- room-origin formal requests load linked provenance cleanly
- room-origin requests remain visible in `/requests` using current filters

Modify `src/app/requests/page.tsx` and `src/app/requests/[id]/page.tsx` so:
- workflow kind labels render safely
- room provenance and linked intake counts appear in details

- [ ] **Step 4: Extend approvals loading and actions**

Modify `src/viewmodels/useApprovals.ts` so:
- formal approval steps and `fdc_request_handoffs` are both loaded
- `chief_accountant` can choose valid forward targets for maintenance
- the page can render assigned handoff work separately from pending approvals

Do not force handoff rows into fake approval-step objects.

- [ ] **Step 5: Update the approvals page**

Modify `src/app/approvals/page.tsx` so it renders:
- pending approval section
- reviewer queue section if needed
- assigned handoff section

Keep the current visual language, but make the queue semantics explicit.

- [ ] **Step 6: Run focused regressions**

Run:
- `cmd /c npx tsx --test test\\unit\\approvalsQueue.test.ts`
- `cmd /c npx tsx --test test\\unit\\navigation.test.ts`
- `cmd /c npx tsx --test test\\unit\\permissionMatrix.test.ts`

Expected: PASS

- [ ] **Step 7: Commit the requests/approvals integration**

```bash
git add src/viewmodels/useRequests.ts src/viewmodels/useApprovals.ts src/app/requests/page.tsx src/app/requests/[id]/page.tsx src/app/approvals/page.tsx test/unit/approvalsQueue.test.ts
git commit -m "feat: integrate room workflows into requests and approvals"
```

## Task 6: Final Verification, Task Tracking, And Rollout Notes

**Files:**
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\todo.md`
- Modify: `C:\Users\Minh\Desktop\ERP_v1\tasks\active\2026-03-31-room-management-full-system.md`

- [ ] **Step 1: Run the targeted unit suite**

Run:
- `cmd /c npx tsx --test test\\unit\\permissionMatrix.test.ts`
- `cmd /c npx tsx --test test\\unit\\roomWorkflowRouting.test.ts`
- `cmd /c npx tsx --test test\\unit\\roomWorkflowHelpers.test.ts`
- `cmd /c npx tsx --test test\\unit\\approvalsQueue.test.ts`
- `cmd /c npx tsx --test test\\unit\\navigation.test.ts`
- `cmd /c npx tsx --test test\\unit\\roomCatalog.test.ts`
- `cmd /c npx tsx --test test\\unit\\roomSummary.test.ts`
- `cmd /c npx tsx --test test\\unit\\roomMaintenance.test.ts`
- `cmd /c npx tsx --test test\\unit\\roomPrint.test.ts`
- `cmd /c npx tsx --test test\\unit\\roomState.test.ts`

Expected: PASS

- [ ] **Step 2: Run the portal build**

Run: `cmd /c npm run build`
Expected: PASS

- [ ] **Step 3: Run the repo type-check and note residual issues**

Run: `cmd /c npm run lint`
Expected:
- PASS if repo-wide issues are resolved
- otherwise document only the remaining unrelated failures and confirm the new write set is clean

- [ ] **Step 4: Update workflow tracking**

Record in:
- `tasks/todo.md`
- `tasks/active/2026-03-31-room-management-full-system.md`

Include:
- commands run
- results
- residual risks
- rollout gaps if SQL apply or browser smoke are still pending

- [ ] **Step 5: Commit the verification and tracking update**

```bash
git add tasks/todo.md tasks/active/2026-03-31-room-management-full-system.md
git commit -m "docs: record full room management verification"
```

## Critical Review Before Execution

Questions to resolve while executing, not before starting:

- whether `src/contexts/RoomManagementContext.tsx` should remain as a facade or be removed in favor of a direct workflow hook
- whether `requests.create` should expose room workflow creation from the generic create-request screen in this pass, or remain created only from Room Management
- whether the current `accountant` role needs an explicit reduced matrix entry beyond transition compatibility

These are not blockers for starting Task 1.
