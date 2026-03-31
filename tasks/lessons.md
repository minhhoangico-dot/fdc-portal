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

### 2026-03-25 - Bridge rollouts must build before restart and verify raw HTTP output

- Context: While fixing the missing `Tên test` values on live `/lab-dashboard/details`, the local repo, bridge tests, and rebuilt host `dist` files all looked correct, but the live endpoint still returned TAT rows without `testName`.
- What went wrong: The live host had partial source drift in `/opt/fdc-lan-bridge/src/labDashboard/`, and the first hotfix rollout ran `sudo npm run build` and `sudo systemctl restart fdc-lan-bridge` in parallel. Systemd started a fresh Node process before `tsc` finished rewriting `dist`, so the running service still served the old bundle even though the files on disk were updated moments later.
- Preventive rule: For SSH bridge rollouts, sync every changed file in the touched module, wait for `sudo npm run build` to finish, then restart `fdc-lan-bridge`, and only trust the rollout after a raw `curl` check of the changed localhost/public endpoint field.
- Trigger to re-read: Any future host-side rollout touching `/opt/fdc-lan-bridge/src/**`, `/opt/fdc-lan-bridge/dist/**`, or lab dashboard endpoints under `/lab-dashboard/*`.
- Verification to add next time: Capture one raw `curl http://localhost:3333/...` response and one public endpoint check after the sequential restart; do not parallelize build and restart.

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

### 2026-03-24 - Keep lab dashboard reagent unit fallbacks aligned with inventory mapping

- Context: The user reported that `Tồn kho thuốc cho khoa xét nghiệm` showed a different unit than the `Quản lý Kho Thuốc` list for the same `Khoa Xét Nghiệm` snapshot rows.
- What went wrong: `fdc-lan-bridge/src/labDashboard/service.ts` defaulted blank `fdc_inventory_snapshots.unit` values to `hộp`, while `src/viewmodels/useInventory.ts` defaulted the same field to `Cái`, so the same stock row rendered with different units across the portal.
- Preventive rule: Whenever lab dashboard reagent data is sourced from `fdc_inventory_snapshots`, keep the fallback unit semantics aligned with the inventory module and cover the bridge with a test that asserts both lab-only warehouse scoping and blank-unit fallback.
- Trigger to re-read: Any future change to reagent mapping in `fdc-lan-bridge/src/labDashboard/service.ts` or inventory item unit mapping in `src/viewmodels/useInventory.ts`.
- Verification to add next time: Run `cmd /c npx jest test/unit/labDashboardService.test.ts --runInBand` plus the full `fdc-lan-bridge` test/build after changing reagent inventory behavior.

### 2026-03-24 - Waiting lab queue must use paid treatment state, not servicedata payment flags

- Context: The user clarified that `Hàng chờ lấy mẫu` should only show lab orders that have already been paid.
- What went wrong: Live HIS rows showed `tb_servicedata.is_da_tinh_toan = 0` and `tb_servicedata.tylethanhtoan = 0` even for waiting lab orders that were already paid, so relying on servicedata-level payment flags would undercount or misclassify the queue.
- Preventive rule: For the lab sampling queue, derive the payment gate from `EXISTS tb_treatment.isthutien = 1` on the same `patientrecordid`; do not use `tb_servicedata.is_da_tinh_toan` or `tb_servicedata.tylethanhtoan` as the waiting filter.
- Trigger to re-read: Any future change to `fdc-lan-bridge/src/labDashboard/service.ts` around `LAB_ORDER_TIMELINE_CTE`, queue counts, or waiting detail filtering.
- Verification to add next time: Cover both `getLabDashboardCurrent()` and `getLabDashboardDetails({ section: "queue", focus: "waiting" })` with a paid vs unpaid waiting fixture before changing queue logic.

### 2026-03-24 - Provenance wording should name real source tables when users ask for source transparency

- Context: The user asked to update the lab dashboard source tab so the explanation uses direct table names instead of generic phrases like "hồ sơ xét nghiệm gốc" or "Nguồn HIS".
- What went wrong: The first provenance pass focused on readability and structured source blocks, but left the operator-facing wording too generic to show exactly which bridge tables fed each section.
- Preventive rule: When a user asks to make dashboard provenance more transparent, mention the real query tables directly in the explanation text, for example `tb_servicedata`, `tb_treatment`, `tb_patientrecord`, `tb_patient`, and `fdc_inventory_snapshots`.
- Trigger to re-read: Any future change to `fdc-lan-bridge/src/labDashboard/sourceProvenance.ts` or `fdc-lan-bridge/test/unit/labDashboardSourceProvenance.test.ts`.
- Verification to add next time: Add a targeted provenance test that scans the rendered source strings for the expected table names before updating copy.

### 2026-03-24 - Bulk shell edits can corrupt Vietnamese UI copy on Windows

- Context: While implementing the real-inventory TV redesign, some large scripted edits to lab dashboard provenance and TV card copy were applied from the Windows shell instead of smaller `apply_patch` hunks.
- What went wrong: UTF-8 Vietnamese literals passed through bulk shell edits were partially corrupted by the local codepage path, which forced cleanup and reduced-confidence string checks.
- Preventive rule: On this repo, prefer `apply_patch` for small or medium user-facing copy edits; if a bulk scripted edit is unavoidable, keep the inserted copy ASCII-safe or immediately verify the saved strings through targeted tests/build output before moving on.
- Trigger to re-read: Any future bulk edit to `src/components/lab-dashboard/**`, `src/lib/labDashboard*.ts`, or `fdc-lan-bridge/src/labDashboard/sourceProvenance.ts`.
- Verification to add next time: After scripted copy edits, run the nearest unit test that asserts rendered/exported strings and inspect the resulting file content before starting broader verification.

### 2026-03-25 - Lab queue stages need do/end fallbacks and must skip BH adjustment rows

- Context: The user reported that patient `23009760` already had lab results on `2026-03-25` but still appeared in Dashboard Xét nghiệm under `Chờ lấy mẫu`.
- What went wrong: The shared lab timeline CTE in `fdc-lan-bridge/src/labDashboard/service.ts` only treated `order_date` as processing and `data_date` as completion, so live HIS rows that only populated `do_servicedatadate` and `end_date` stayed stuck in `waiting`; the same query also included `Chênh lệch BH - ...` billing-adjustment root rows that are not operational lab work.
- Preventive rule: For lab queue/TAT stage detection, use `COALESCE(order_date, do_servicedatadate)` as the processing signal, `COALESCE(data_date, child data_date, end_date, child end_date)` as the completion fallback, and exclude `servicename ILIKE 'Chênh lệch BH - %'` rows from the timeline.
- Trigger to re-read: Any future change to `fdc-lan-bridge/src/labDashboard/service.ts` around `LAB_ORDER_TIMELINE_CTE`, queue summary counts, or queue detail loading.
- Verification to add next time: Run `cmd /c npx jest test/unit/labDashboardService.test.ts --runInBand` plus a live-data check that confirms patient `23009760`-style rows leave `waiting` when only `do_servicedatadate`/`end_date` are filled.

### 2026-03-25 - SQL seeds with Vietnamese copy must be ASCII-safe or byte-verified

- Context: The user reported that the employee portal showed the `head_nurse` role label as mojibake in the top bar.
- What went wrong: The frontend defaults in `src/lib/role-catalog.ts` were stored as valid UTF-8, but `sql/20260323_head_nurse_role.sql` had already been saved with corrupted bytes, so the live `fdc_role_catalog` row overrode the good defaults with mojibake text.
- Preventive rule: When adding or editing Vietnamese literals in `sql/*.sql`, prefer SQL Unicode escapes (`U&'...'`) or immediately verify the file bytes before seeding data that will override frontend defaults.
- Trigger to re-read: Any future change to role-catalog seed scripts or other SQL files that insert operator-facing Vietnamese labels/descriptions.
- Verification to add next time: Add a regression test on the client merge path for corrupted seed payloads, and inspect the relevant SQL file for UTF-8-vs-mojibake bytes before rollout.

### 2026-03-25 - TV-managed feature migrations must seed missing screen rows

- Context: The weekly-report rollout moved management under `Quản lý TV`, but the first SQL migration only updated existing `fdc_tv_screens` rows that already pointed at weekly-report routes.
- What went wrong: Production had no weekly-report row in `public.fdc_tv_screens`, so the frontend deploy was live while `Quản lý TV` still had nothing to attach the new settings action to.
- Preventive rule: When a feature becomes TV-managed, write the migration as an upsert that both backfills legacy rows and inserts the canonical `fdc_tv_screens` row if it does not exist yet, including `settings.featureKey`.
- Trigger to re-read: Any future change to `sql/*tv*`, `src/lib/tv-screen-links.ts`, or a module that is being moved under `/tv-management`.
- Verification to add next time: Query production `public.fdc_tv_screens` after rollout and confirm the expected slug, `content_url`, `settings.featureKey`, and `is_active` state exist.

### 2026-03-25 - New portal modules must register module key, nav item, and route together

- Context: The user reported that `Quản lý phòng` did not appear in the sidebar even though the repo already contained an approved room-management design and prototype assets.
- What went wrong: The initial room-management work never added `room_management` to `src/types/roleCatalog.ts`, `src/lib/navigation.ts`, and `src/App.tsx`, so both `Sidebar` and `BottomNav` silently filtered the module out.
- Preventive rule: When scaffolding any new portal module, wire the typed `ModuleKey`, `ROLE_MODULE_VISIBILITY`, `NAV_ITEMS`, and authenticated route in the same change; otherwise the shared navigation surfaces will hide the feature completely.
- Trigger to re-read: Any future change that introduces a new portal route/module, especially under `src/lib/navigation.ts`, `src/types/roleCatalog.ts`, or `src/App.tsx`.
- Verification to add next time: Add a navigation unit test that asserts the new route path appears for the intended roles, then run the portal build to confirm the route compiles.
