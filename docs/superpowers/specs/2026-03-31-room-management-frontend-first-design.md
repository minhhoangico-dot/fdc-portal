# Room Management Frontend-First Redesign

## Goal

Replace the current `/room-management` iframe preview with a working, portal-native module that:

- keeps the approved floor map layout
- fits the current FDC Portal visual theme
- makes the map, drawer, maintenance form, supply request form, maintenance queue, and print preview fully usable on session-only mock state

## Problem

The current implementation is only a scaffold:

- the main page embeds static floorplan HTML in an iframe
- the map is not owned by the portal UI
- the action cards are static and do not connect to working module flows
- the approved prototype interactions were never ported into `src/`

As a result, Room Management looks present in navigation but behaves like a preview instead of a usable module.

## Scope

### In Scope

- Rebuild `/room-management` as a real React module inside the portal shell
- Preserve the approved room-map structure from the existing prototype
- Add a portal-native room drawer with working tabs:
  - `Thong tin`
  - `Su co / bao tri`
  - `Vat tu`
- Add a working local maintenance report form
- Add a working local supply request form
- Add a working `/room-management/maintenance` queue screen
- Add a working `/room-management/print/materials` print preview screen
- Keep all behavior self-contained inside Room Management
- Use session-only mock state that resets on refresh

### Out Of Scope

- Supabase persistence
- Integration with `/requests` or `/approvals`
- Local storage persistence
- Photo uploads, attachments, or backend workflows
- Admin CRUD for room definitions

## User-Approved Constraints

- Use the portal-native reconstruction approach
- Keep everything self-contained inside Room Management
- Use session-only mock state
- Maintain the approved room map layout
- Redesign to match the current theme of the whole application

## Current Theme Baseline

The redesigned module should visually align with the existing portal surfaces used in dashboard, admin, and requests:

- white cards with soft gray borders
- compact spacing and rounded corners
- indigo as the primary interactive accent
- muted text hierarchy with gray body copy
- utility emphasis via chips, badges, and small status markers instead of large custom-color shells

The prototype's warm beige app shell should not be carried over. The map layout stays, but the visual language must match the portal.

## Chosen Approach

Build a portal-native Room Management module using React components and a dedicated in-memory provider shared across all Room Management routes.

This solves three problems at once:

1. the map becomes interactive and testable
2. the drawer/forms/queue/print flows become real working surfaces
3. state can remain alive while navigating between Room Management routes without introducing backend dependencies

## Route Structure

The Room Management feature should be treated as its own route group under the authenticated app shell:

- `/room-management`
- `/room-management/maintenance`
- `/room-management/print/materials`

These routes should share a single Room Management provider mounted above them so mock state survives in-app navigation between the map, queue, and print screens.

## Architecture

### Shared Provider

Add a dedicated provider for Room Management state. This provider owns:

- the fixed room catalog
- the mutable maintenance report list
- the mutable supply request list
- helper actions for create/update/filter flows

The provider is session-only and intentionally resets on full page refresh.

### Thin Pages

Pages remain thin and compose focused components:

- `src/app/room-management/page.tsx`
- `src/app/room-management/maintenance/page.tsx`
- `src/app/room-management/print/materials/page.tsx`

Business logic and state transitions should live in:

- room-management provider/viewmodel hooks
- pure helper modules for map summaries, queue filtering, and print grouping

### Prototype Reuse Strategy

Reuse the approved prototype as a source of:

- room catalog
- room ordering
- room layout structure
- interaction model

Do not reuse its shell styling wholesale. Port the behavior and layout into portal-native components instead.

## Information Architecture

### Home Screen

`/room-management` should have three stacked layers:

1. `Header card`
   - page title
   - short description
   - actions:
     - `Hang cho bao tri`
     - `In tong hop vat tu`

2. `Compact stats row`
   - open maintenance issues
   - pending supply requests
   - active rooms / active floor

3. `Map surface`
   - floor tabs
   - portal-native map canvas
   - room blocks
   - active room drawer

### Drawer

The room drawer is the primary interaction surface.

Desktop:
- right-side drawer

Mobile:
- bottom sheet / full-height sheet

Drawer tabs:

- `Thong tin`
  - room identity
  - type/floor/zone
  - counts for open issues and supply requests
  - recent activity summary

- `Su co / bao tri`
  - room-specific maintenance history
  - `Bao su co` action
  - inline or sheet-based maintenance form

- `Vat tu`
  - room-specific supply request history
  - `Tao de xuat` action
  - inline or sheet-based supply request form

### Maintenance Queue Screen

`/room-management/maintenance` is the operational list view for all locally created maintenance reports.

It should include:

- floor filter
- status filter
- severity filter
- board or grouped-list presentation
- local status updates
- a back-link to the room map

This screen stays inside the Room Management route group and reads from the same in-memory state.

### Print Preview Screen

`/room-management/print/materials` is the self-contained printable summary.

It should include:

- floor filter
- status filter
- grouped output by `tang -> phong -> vat tu`
- a print action using `window.print()`

This screen is a module utility surface, not a global request report.

## Map Layout Preservation

The visual structure from the approved prototype must remain recognizable:

- floors 1 and 2:
  - left wing
  - central corridor
  - right wing
- floor 3:
  - single aligned room column plus corridor treatment

The layout can be rebuilt using React layout data rather than static HTML, but the relative room order and wing grouping should not be changed casually.

## Visual Redesign Rules

### Room Blocks

Room blocks should be redesigned to match the portal theme:

- white or softly tinted surfaces
- gray borders by default
- indigo outline or ring when selected
- subtle room-type tint through icon chip, border accent, or muted background
- small status indicators for:
  - open maintenance count
  - pending supply count

Avoid large saturated prototype backgrounds that make the module feel visually separate from the rest of the portal.

### Header And Actions

The top section should match dashboard/admin conventions:

- rounded white surface
- left-aligned title and subtitle
- compact action buttons on the right
- no standalone prototype-style product shell inside the page

### Drawer And Forms

Inputs, buttons, chips, and tab styling should reuse portal patterns:

- bordered inputs
- indigo focus state
- rounded section cards
- compact chips and badges

### Print Screen

The print preview should use portal styles on screen but degrade cleanly into a printer-friendly layout when printing.

## Mock State Model

### Static Data

Keep a fixed room catalog derived from the approved prototype:

- room id
- code
- display name
- floor
- wing
- room type
- position order

### Mutable Session Data

Maintain two in-memory collections:

- `maintenanceReports[]`
- `supplyRequests[]`

Each collection should be initialized from mock seed data and then mutated by user actions during the session.

Refresh resets state by design.

## Interaction Model

### Room Selection

- clicking a room selects it
- selected room opens the drawer
- room summaries update immediately when mock data changes

### Maintenance Flow

- user opens `Bao su co`
- fills title, description, severity, and type
- submit appends a new maintenance record to shared module state
- map badge, drawer history, and maintenance queue update immediately

### Supply Flow

- user opens `Tao de xuat`
- fills request title, reason, priority, and line items
- submit appends a new supply request to shared module state
- map badge, drawer history, and print preview update immediately

### Queue Flow

- maintenance page reads the same shared state
- filters and local status changes mutate the in-memory issue list
- navigating back to the map keeps current session state

### Print Flow

- print page reads the same shared state
- groups room supply requests by floor and room
- supports local filtering
- uses browser print for output

## Component Responsibilities

Recommended component split:

- `RoomManagementProvider`
  - owns shared in-memory state and actions

- `FloorPlanCanvas`
  - floor tabs
  - map layout rendering
  - room selection

- `RoomBlock`
  - one room tile
  - badge and visual state rendering

- `RoomDrawer`
  - selected room shell
  - tab switching

- `RoomInfoPanel`
  - overview tab content

- `MaintenanceTab`
  - room maintenance history and action entry

- `SupplyTab`
  - room supply request history and action entry

- `MaintenanceForm`
  - create local maintenance report

- `SupplyForm`
  - create local supply request with line items

- `MaintenanceBoard`
  - grouped queue/list screen

- `MaterialsPrintPreview`
  - grouped print surface and print trigger

## Error Handling

This version has no backend failures, but it still needs UI safeguards:

- invalid forms should block submit with inline validation
- empty room history states should render a useful empty state
- print screen with no matching requests should render a clean "no data" state
- line-item forms should prevent blank item names or zero quantities

## Testing And Verification

### Unit Coverage

Add tests for:

- room catalog and floor grouping
- room summary badge/count derivation
- maintenance queue grouping/filtering/status changes
- print grouping by floor and room
- mock state append behavior for maintenance and supply actions

### UI Verification

Manual/browser checks must cover:

- `/room-management`
- `/room-management/maintenance`
- `/room-management/print/materials`

Expected outcomes:

- clicking a room opens the correct drawer
- maintenance form submit updates the map and queue
- supply form submit updates the map and print page
- floor switching preserves the layout structure
- the module feels visually consistent with the rest of the portal

## Risks

- If the provider is not mounted above all Room Management routes, session state will reset on route changes and the feature will feel broken
- If the redesign copies too much of the prototype styling, the module will still feel visually disconnected from the portal
- If the map is simplified too aggressively, the approved room layout will be lost

## Success Criteria

This redesign is successful when:

- all visible Room Management controls actually work
- the module uses portal-native visual language
- the approved room map layout is preserved
- maintenance, supply, and print flows work on local mock state
- refresh clears state, by design
