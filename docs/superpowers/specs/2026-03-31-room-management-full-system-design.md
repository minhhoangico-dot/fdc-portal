# Room Management Full-System Workflow And Permission Redesign

## Goal

Complete Room Management as a real portal module by replacing the frontend-first mock flow with:

- real Supabase-backed room intake data
- integration with the existing `/requests` and `/approvals` workflow
- new full-system roles with their own portal permissions
- a centralized permission matrix that governs navigation, route access, dashboard actions, and in-page controls
- preservation of the approved room map layout and current portal theme

## Problem

The current Room Management pass solved only the first layer of the problem:

- the module exists in the portal
- the map, drawer, maintenance board, and print preview work locally
- state is still session-only mock state

That is not enough for the approved business flow. The real requirement is broader:

1. room material requests must plug into the current request and approval engine
2. maintenance requests must also follow a real approval and forwarding flow
3. several new business roles must exist as real portal roles
4. permissions can no longer remain scattered across hardcoded `role === ...` checks

This is now a portal architecture task, not just a Room Management UI task.

## Scope

### In Scope

- Replace Room Management mock state with Supabase-backed intake data
- Route room material intakes to reviewer queues by room review group
- Let reviewer roles consolidate room material intakes into a real portal request
- Route room maintenance intakes into a real portal approval flow
- Add the new full-system roles:
  - `pharmacy_head`
  - `accounting_supervisor`
  - `lab_head`
  - `chief_accountant`
  - `internal_accountant`
  - `hr_records`
- Redesign permissions as a centralized matrix across all portal modules
- Update navigation, route guards, dashboard actions, and in-page actions to use the shared matrix
- Extend SQL, RLS, and workflow helpers so the new roles function safely in production

### Out Of Scope

- Multi-role-per-user grants in the first pass
- Replacing the existing request engine with a new workflow engine
- Rebuilding unrelated modules that do not need permission integration
- Historical backfill of old non-room requests into new room intake tables

## User-Approved Constraints

- Room material requests must plug into the existing `/requests` and `/approvals` workflow
- Room maintenance must follow a similar role and approval flow
- Material requests are reviewed and consolidated by reviewer role based on room grouping
- Maintenance requires `chief_accountant` to manually approve and manually choose who to forward to
- New roles are full portal roles, not approval-only aliases
- The permission matrix must be brand-new per role across all portal modules
- The Room Management UI must continue to fit the current portal theme while maintaining the approved room map layout

## Current Architecture Baseline

Today the portal mixes role decisions across several layers:

- `src/types/user.ts` contains a fixed `Role` union
- `src/lib/navigation.ts` controls module visibility with `ROLE_MODULE_VISIBILITY`
- `src/lib/role-access.ts` hardcodes approver and inventory access groups
- `RequireAuth` gates modules by module key only
- many pages still use inline `user.role === ...` checks for widgets and actions
- `fdc_role_catalog` stores role metadata only; permission logic remains in application code

This means adding new roles by patching one page at a time would produce drift between:

- sidebar visibility
- route access
- dashboard quick actions
- page-level buttons
- approval permissions

## Chosen Approach

Build a centralized permission layer and keep the existing approval engine as the execution backbone.

In practice that means:

1. define a typed permission matrix in application code
2. move Room Management workflows into a real data model around the current approval tables
3. add room-specific intake, consolidation, and handoff tables
4. adapt existing request and approval screens to display room-origin workflows without forking the whole portal

This is the only approach that satisfies the user-approved need for new roles with full portal permissions while avoiding a hardcoded permission rewrite in every screen.

## High-Level Architecture

### 1. Permission Foundation

Introduce a shared authorization model based on `module -> action -> access level -> allowed roles`.

This becomes the source of truth for:

- sidebar and bottom-nav visibility
- route guards
- dashboard quick actions
- page-level action buttons
- approval review eligibility
- assignment and forwarding choices

The portal should stop treating "visible module" as the only permission decision.

### 2. Room Workflow Layer

Do not write room events straight into `fdc_approval_requests`.

Instead, create a room workflow layer with two stages:

- `intake`: raw room-origin submissions from the map and drawer
- `workflow`: derived portal requests and downstream handoffs

This preserves room-level detail without polluting the shared request table with reviewer-only draft work.

### 3. Existing Request Engine Reuse

Keep `fdc_approval_requests` and `fdc_approval_steps` as the real approval engine.

Room workflows should create standard portal requests only when they are ready to enter the formal process.

That keeps:

- `/requests`
- `/approvals`
- notifications
- attachments
- audit logging
- delegations

compatible with the existing system.

## Roles And Room Review Groups

### New Portal Roles

- `pharmacy_head`: owns pharmacy review and pharmacy operational permissions
- `accounting_supervisor`: owns room `304` review and accounting-office room routing
- `lab_head`: owns lab room review and lab operational permissions
- `chief_accountant`: finance approval authority for room workflows with manual forward control where required
- `internal_accountant`: downstream execution and finance handling after approval
- `hr_records`: downstream records and documentation handling after approval

### Legacy Roles Retained

- `super_admin`
- `head_nurse`
- `director`
- `chairman`
- `dept_head`
- `accountant`
- `staff`
- `doctor`

`accountant` remains for transition compatibility, but room workflows should use the new explicit finance roles rather than overloading the legacy `accountant` role.

### Room Review Group Mapping

Room routing should be data-driven from room metadata, not page logic.

Each room in the catalog gets a `review_group`:

- `pharmacy` -> reviewer role `pharmacy_head`
- `accounting_304` -> reviewer role `accounting_supervisor`
- `lab` -> reviewer role `lab_head`
- `general_care` -> reviewer role `head_nurse`

The map, drawer, intake creation, and reviewer queues all read the same room metadata.

## Permission Model

### Access Levels

Use explicit levels instead of a boolean visible/hidden rule:

- `none`: no access
- `self`: own records only
- `assigned`: records or tasks explicitly assigned or forwarded to the user
- `operate`: primary operational use of the module
- `review`: reviewer or approver actions inside the module
- `oversight`: read-across reporting or leadership visibility
- `admin`: system configuration

### Module Surface

Define permissions for these module families:

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

### Permission Shape

At implementation time, each module needs action keys, not only a top-level level. Example:

- `room_management.view_map`
- `room_management.create_material_intake`
- `room_management.create_maintenance_intake`
- `room_management.review_group_queue`
- `room_management.consolidate_materials`
- `room_management.print_material_summary`
- `requests.view_own`
- `requests.view_assigned`
- `requests.view_all`
- `approvals.review_assigned`
- `approvals.approve`
- `approvals.reject`
- `approvals.forward_manual`
- `approvals.receive_handoff`

The matrix should be typed so navigation and page code cannot ask for undefined actions.

### Role Intent Across Portal Modules

The matrix should encode these target behaviors:

- `staff`, `doctor`
  - operate Room Management as request creators
  - see own dashboard and own requests
  - no approval rights
- `dept_head`
  - department-level approval and request visibility
  - no special room reviewer rights unless separately assigned by role
- `head_nurse`
  - review room workflows for `general_care`
  - operational visibility across nursing-oriented modules
- `pharmacy_head`
  - operate pharmacy module
  - review room workflows for pharmacy rooms
- `lab_head`
  - operate lab dashboard and lab-adjacent reporting
  - review room workflows for lab rooms
- `accounting_supervisor`
  - review room workflows for room `304`
  - assigned finance operations visibility
- `chief_accountant`
  - approve and manually forward room maintenance
  - oversee finance-related requests
- `internal_accountant`
  - receive downstream finance handoffs
- `hr_records`
  - receive downstream documentation handoffs
- `director`, `chairman`
  - leadership oversight
- `super_admin`
  - full administrative and operational access

## Workflow Design

### Material Intake Flow

1. A user opens a room from the map and submits a material request.
2. The portal creates a room intake record, not a formal request yet.
3. The intake inherits its `review_group` from the room catalog.
4. The matching reviewer role sees that intake in a group queue.
5. The reviewer can normalize, edit, and select multiple compatible intakes.
6. The reviewer consolidates them into one formal portal request.
7. The system creates one `fdc_approval_requests` row with:
   - request type `purchase`
   - `metadata.workflowKind = room_material`
   - source intake links back to each room intake
8. That request appears in `/requests`.
9. The material branch records the `chief_accountant` approval gate automatically as approved.
10. The system creates downstream handoff tasks for `internal_accountant` and `hr_records`.

### Maintenance Intake Flow

1. A user submits a maintenance issue from a room drawer.
2. The portal creates a room maintenance intake.
3. The intake routes to the reviewer role from room metadata.
4. The reviewer triages and promotes the intake into a formal portal request.
5. The system creates one `fdc_approval_requests` row with:
   - request type `other`
   - `metadata.workflowKind = room_maintenance`
6. `chief_accountant` receives a real pending approval step.
7. `chief_accountant` must click approve and choose the specific downstream assignee.
8. After approval, the system records a handoff task to the chosen eligible user.

### Why Material And Maintenance Differ

The user explicitly approved different finance behavior:

- material: auto-approved by `chief_accountant` after reviewer consolidation
- maintenance: manual `chief_accountant` approval and manual forward choice

The design should preserve that difference rather than forcing both flows into the same generic template.

## Requests, Approvals, And Handoffs

### Requests Screen

`/requests` remains the canonical list of formal requests.

Room-origin requests should appear here after intake promotion or consolidation, not before.

The request detail view should show room provenance from metadata and intake links:

- room code / name
- floor
- review group
- linked intake count for consolidated material requests

### Approvals Screen

`/approvals` should become a unified work queue for:

- approval steps that need approve/reject actions
- room review work where the user is the reviewer role
- downstream handoff tasks assigned after approval

The UI does not need three separate modules for these responsibilities. It needs one page with explicit queue sections and badges.

### Handoff Semantics

Do not model all downstream work as approval steps.

Approval means "this decision gate is approved or rejected."
Handoff means "this user now owns follow-up execution or records work."

Because of that distinction, downstream work for `internal_accountant` and `hr_records` should be modeled as explicit handoff tasks instead of fake approval steps.

## Data Model

### Existing Tables To Extend

- `fdc_user_mapping`
  - expand allowed role values
- `fdc_role_catalog`
  - seed the new role metadata
- `fdc_approval_requests`
  - continue using `metadata` for room workflow hints
- `fdc_approval_steps`
  - continue using the current approval engine for true decision gates

### New Tables

- `fdc_room_catalog`
  - room code, label, floor, wing, room type, review group, active flag
- `fdc_room_intakes`
  - one row per room-origin material or maintenance submission
- `fdc_room_intake_items`
  - line items for material intakes
- `fdc_room_intake_links`
  - links room intakes to derived portal requests
- `fdc_request_handoffs`
  - downstream assigned tasks after approval

### Metadata Conventions

Formal requests produced from Room Management should add structured metadata such as:

- `workflowKind`
- `roomId`
- `roomCode`
- `roomName`
- `reviewGroup`
- `sourceIntakeIds`
- `originModule = room_management`

That lets current request and approval screens stay compatible while still recognizing room-specific behavior.

## SQL And RLS Changes

### Role Expansion

The current SQL and RLS helpers must be extended for the new roles:

- `fdc_role_catalog` check constraints and seeds
- `fdc_user_mapping.role` constraints
- any checks on `approver_role`
- permission-sensitive functions such as:
  - `fdc_can_view_request`
  - `fdc_can_act_on_step`

### New RLS Rules

RLS must ensure:

- request creators see only their own room intakes
- reviewer roles see only room intakes in their assigned review groups
- downstream handoff users see only tasks assigned to them
- leadership and admin roles only get the expanded visibility explicitly approved by the matrix

Do not rely on frontend filtering for any of these boundaries.

## UI And Route Implications

### Room Management

Keep the current portal-native map layout and theme from the frontend-first pass, but replace mock state with real data.

Add reviewer surfaces to the module:

- reviewer queue for material intakes
- reviewer queue for maintenance intakes
- consolidation UI for material requests
- intake detail and status history

### Dashboard

Dashboard widgets and quick actions must use the permission matrix rather than inline role checks.

This is required so the new roles see the correct entry points without more one-off conditions.

### Admin

Admin should continue to manage role metadata and should gain visibility into the permission matrix mapping, even if the matrix remains code-defined.

The admin UI does not need full runtime permission editing in this pass, but it must present the roles coherently.

## Migration And Rollout

Use additive rollout steps:

1. add and seed new roles across app and SQL
2. add permission matrix and compatibility helpers
3. convert navigation, guards, and key pages to the shared permission layer
4. add room workflow tables and RLS
5. switch Room Management from mock state to real intake data
6. integrate room-origin requests into `/requests`
7. integrate review, approval, and handoff queues into `/approvals`
8. retire mock-only state and compatibility shortcuts after verification

This sequence minimizes production risk because request and approval tables continue to operate throughout the rollout.

## Testing And Verification

### Permission Regression

- permission matrix unit tests per role and action
- navigation visibility tests by role
- route guard tests for all major modules
- dashboard widget and quick-action tests

### Workflow Regression

- create room material intake from the map
- reviewer sees only the correct queue
- consolidate multiple intakes into one portal request
- material request appears in `/requests`
- maintenance request creates a real approval gate for `chief_accountant`
- `chief_accountant` must choose a valid downstream assignee on maintenance approval
- `internal_accountant` and `hr_records` receive the right handoff tasks
- existing non-room requests continue to behave as before

### Data And Security Verification

- RLS checks for each new role
- reviewer isolation by room group
- handoff visibility only to assigned users
- request attachment access remains correct for room-linked requests
- idempotent migration re-run checks

### Manual Cutover Checks

- login with representative users for each new role
- verify `dashboard`, `requests`, `approvals`, `room-management`, `pharmacy`, `inventory`, `weekly-report`, `portal`, and `admin`
- execute one end-to-end material scenario
- execute one end-to-end maintenance scenario

## Risks And Non-Goals

- This is larger than a single-page feature; it affects portal authorization architecture
- Many screens still contain inline role checks and will need systematic replacement
- Modeling downstream work as approval steps would blur "decision" and "execution" semantics; avoid that shortcut
- The first implementation should not attempt multi-role users or runtime-editable permissions

## Success Criteria

The redesign is complete when all of the following are true:

- Room Management uses real backend data instead of session-only mock state
- material and maintenance flows both enter the live portal workflow
- room routing is derived from room metadata, not hardcoded page branches
- new roles can sign in and see only the modules and actions intended for them
- sidebar, route guards, dashboard actions, and page controls all read from the same permission layer
- `/requests` and `/approvals` correctly display both legacy requests and room-origin workflows
- production RLS matches the intended reviewer, approver, and handoff boundaries
