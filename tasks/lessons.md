# Lessons

This file is the shared memory for mistakes, corrections, and reusable operating rules. Read the relevant entries before starting similar work.

## How To Use

- Append a new entry after any user correction, failed verification caused by process error, or avoidable regression.
- Keep each lesson concrete and testable.
- Include a trigger so future agents know when the lesson applies.

## Baseline Project Memory

These are not corrections. They are durable starting points for new agents:

- Portal page components stay thin. Put data fetching and business logic in `src/viewmodels/use*.ts`.
- Portal imports should use `@/` aliases instead of long relative paths.
- `fdc-lan-bridge` is the integration boundary for HIS and MISA sync logic.
- Labels, statuses, priorities, and role display metadata should come from `src/lib/constants.ts`.
- Verification matters most on bridge and data changes because they can affect clinic operations and synced data.

## Lesson Entry Template

### YYYY-MM-DD - Short title

- Context:
- What went wrong:
- Preventive rule:
- Trigger to re-read:
- Verification to add next time:

### 2026-03-23 - Keep bridge route verification wired to the real detail service

- Context: While closing the lab dashboard source-provenance task, the first review pass found that `/lab-dashboard/details` integration coverage only asserted against a mocked service payload.
- What went wrong: Mocking the entire `src/labDashboard/service` module meant the route test could pass even if `service.ts` stopped attaching provenance, and the detail-loader catch paths also rebuilt provenance from empty arrays instead of preserving already-fetched inputs.
- Preventive rule: When a task requires route-level verification of bridge/service wiring, keep the target service function real and mock only its external boundaries. If the error path should preserve partial provenance, hoist fetched arrays outside the `try` block and reuse them in the fallback builder call.
- Trigger to re-read: Any future change to `fdc-lan-bridge/test/integration/server.test.ts` or to catch blocks in `fdc-lan-bridge/src/labDashboard/service.ts`.
- Verification to add next time: Add one route test that exercises the real service implementation and one targeted fallback test that forces the provenance builder to throw while asserting previously fetched rows still appear in the returned provenance.

### 2026-03-23 - Compare TV layout against the approved HTML reference

- Context: After drill-down was added to `/lab-dashboard/tv`, the summary view no longer matched the approved `to be intergrate/lab-dashboard.html` composition.
- What went wrong: A shared CSS reset made `.lab-dashboard-reagent` render at `width: 100%`, which stacked reagent rows vertically, expanded the bottom section, and visually collapsed the middle summary row.
- Preventive rule: When mixing `<button>` and non-button variants for the same dashboard block, keep layout rules scoped so interactive resets do not override the base card/chip dimensions.
- Trigger to re-read: Any future change to `src/components/lab-dashboard/**` or `src/app/lab-dashboard/lab-dashboard.css`.
- Verification to add next time: Compare the rendered summary structure against `to be intergrate/lab-dashboard.html` and add or update a unit test for the affected display model.

### 2026-03-23 - Child scroll regions need a bounded detail container

- Context: While adding scroll containment to `/lab-dashboard/tv` detail mode, the first CSS pass gave the table/source sections `flex: 1` and `overflow: auto` but left the top-level detail screen on the inherited TV grid layout.
- What went wrong: Without making the detail screen itself a bounded flex/grid container, the list/source panels could still expand instead of owning mouse-wheel scrolling, especially when banners were present above them.
- Preventive rule: When relying on inner `overflow: auto` regions in `src/app/lab-dashboard/lab-dashboard.css`, first ensure the nearest detail-mode ancestor is explicitly height-bounded (`display: flex` or `display: grid` plus `min-height: 0` and `overflow: hidden`) before tuning the child panel.
- Trigger to re-read: Any future change to detail-mode overflow, sticky headers, or banner placement under `src/components/lab-dashboard/**` or `src/app/lab-dashboard/lab-dashboard.css`.
- Verification to add next time: Re-check with banner states present and verify that only the intended panel scrolls while header/actions remain fixed.
