# Task Spec: lab-dashboard-real-inventory-tv

## Goal

- Problem: The lab dashboard reagent section still shows synthesized group chips such as `0 / 6 hộp` instead of real inventory rows from the lab warehouse, which is misleading on the TV screen.
- Desired outcome: Rebuild the reagent section so the TV summary and reagent detail both use real `fdc_inventory_snapshots` rows from `Khoa Xét Nghiệm`, while preserving the original card/chip visual language with slow upward marquee motion.

## Scope

- In scope:
- Replace reagent summary data model with row-level inventory chips.
- Replace reagent detail rows so drill-down shows real inventory items instead of grouped pseudo-reagents.
- Update reagent provenance/source wording to describe the real-inventory pipeline.
- Update TV summary rendering to show small original-style chips with full names and slow upward marquee motion.
- Add bridge and portal tests for the new behavior.
- Out of scope:
- Changing queue/TAT/abnormal sections.
- Rebuilding the inventory management page.
- Introducing a new warehouse target/threshold management feature.

## Constraints

- Technical constraints:
- Source data must come from `fdc_inventory_snapshots` only.
- Continue to scope to `Khoa Xét Nghiệm`.
- Keep the route surface stable (`/lab-dashboard/current`, `/lab-dashboard/details`).
- Product or operational constraints:
- TV readability matters more than dense analytical detail.
- The redesigned UI should stay visually close to the existing reagent card/chip language.

## Assumptions

- Status colors for TV chips can use simple row-level heuristics (`<=1 critical`, `<=2 low`, else ok`) instead of target-based thresholds.
- Reagent focus links can be real-item based or reduced to `all` as long as summary/detail stay honest and consistent.

## Affected Areas

- Files or directories:
- `fdc-lan-bridge/src/labDashboard/service.ts`
- `fdc-lan-bridge/src/labDashboard/sourceProvenance.ts`
- `fdc-lan-bridge/test/unit/labDashboardService.test.ts`
- `fdc-lan-bridge/test/unit/labDashboardSourceProvenance.test.ts`
- `src/lib/labDashboardDisplayModel.ts`
- `src/components/lab-dashboard/LabDashboardDisplay.tsx`
- `src/components/lab-dashboard/LabDashboardDetailScreen.tsx`
- `src/app/lab-dashboard/lab-dashboard.css`
- Systems touched:
- Bridge lab dashboard summary/detail payloads and portal TV/detail rendering.

## Role Split

- Planner: translate the approved TV design into implementation steps.
- Implementer: change bridge payloads and portal UI to real inventory chips.
- Verifier: run bridge tests/build, portal tests/build, and record browser/API smoke expectations.
- Reviewer: confirm no synthetic `targetStock` behavior survives and the TV motion stays readable.

## Implementation Plan

- [x] Save approved design and refresh workflow files.
- [x] Save the implementation plan at `docs/superpowers/plans/2026-03-24-lab-dashboard-real-inventory-tv.md`.
- [x] Write failing bridge tests for real-inventory reagent summary/detail behavior.
- [x] Replace bridge reagent summary/detail mapping with row-level inventory data.
- [x] Write failing portal tests for new chip labels/marquee model.
- [x] Update portal summary/detail UI and CSS to the approved TV design.
- [x] Run verification and close out workflow notes.

## Verification Plan

- Command or check 1: `cmd /c npx jest test/unit/labDashboardService.test.ts --runInBand`
- Command or check 2: `cmd /c npx jest test/unit/labDashboardSourceProvenance.test.ts --runInBand`
- Command or check 3: `cmd /c npm test` in `fdc-lan-bridge`
- Command or check 4: `cmd /c npm run build` in `fdc-lan-bridge`
- Command or check 5: targeted portal unit tests for lab dashboard display/detail models
- Command or check 6: `cmd /c npm run build` at repo root
- Command or check 7: manual browser smoke on `/lab-dashboard/tv` and `/lab-dashboard/details?section=reagents&focus=all`

## Review Notes

- Findings:
- None from automated verification after the real-inventory bridge rewrite, provenance/export update, and portal TV marquee render.
- Residual risks:
- TV readability and motion smoothness still need manual confirmation after implementation because automated tests cannot fully judge visual comfort from a distance.

## Closeout

- Verification evidence:
- `cmd /c npx jest test/unit/labDashboardService.test.ts --runInBand` in `fdc-lan-bridge`: passed, 5/5 tests covering real inventory reagent ordering, detail payloads, item-key focus, and paid-only waiting queue behavior.
- `cmd /c npx jest test/unit/labDashboardDetails.test.ts --runInBand` in `fdc-lan-bridge`: passed, 7/7 tests including reagent detail sorting by stock and item-key filtering.
- `cmd /c npx jest test/unit/labDashboardSourceProvenance.test.ts --runInBand` in `fdc-lan-bridge`: passed, 9/9 tests after reagent provenance switched to real `fdc_inventory_snapshots` rows and item-level focus.
- `cmd /c npm test` in `fdc-lan-bridge`: passed, 13/13 suites and 56/56 tests.
- `cmd /c npm run build` in `fdc-lan-bridge`: passed (`tsc` clean).
- `cmd /c npx tsx --test test\unit\labDashboardDisplayModel.test.ts`: passed, 2/2 tests covering item-based chip labels and loop-ready reagent summary data.
- `cmd /c npx tsx --test test\unit\labDashboardDetailExport.test.ts`: passed, 6/6 tests covering item-level reagent export labels and workbook output.
- `cmd /c npm run build` at repo root: passed, Vite production build completed successfully; the existing large-chunk warning remains.
- `cmd /c npx wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true`: passed, deployment URL `https://eb609305.fdc-portal.pages.dev`.
- SSH rollout completed to `Vostro-Server` (`hbminh@192.168.1.9`): copied `src/labDashboard/detailHelpers.ts`, `src/labDashboard/service.ts`, `src/labDashboard/sourceProvenance.ts`, and `src/labDashboard/types.ts`, then ran `sudo npm run build` and `sudo systemctl restart fdc-lan-bridge`; service status returned `active`.
- Live bridge verification on `2026-03-24`: local `http://localhost:3333/lab-dashboard/current` and public `https://bridge.fdc-nhanvien.org/lab-dashboard/current` both returned `123` reagent rows sorted as real inventory items; public `/lab-dashboard/details?section=reagents&focus=all` returned title `Chi tiết tồn kho khoa xét nghiệm`, `displayedRowCount=123`, and first row `XN0031 / Hóa chất xét nghiệm AMYLASE / 0.5 Cai`.
- Final status: done
- Follow-up tasks:
- Manual browser smoke on `/lab-dashboard/tv` and `/lab-dashboard/details?section=reagents&focus=all` after restart/deploy to confirm marquee pacing, chip readability, and real-inventory-only rendering on the live UI.
