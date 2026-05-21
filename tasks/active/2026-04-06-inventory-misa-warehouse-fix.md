# Task Spec: inventory-misa-warehouse-fix

## Goal

- Problem: `Kho vật tư` đang hiển thị số tồn MISA đã bị cộng dồn giữa nhiều kho `StockName` khác nhau rồi ghi thành một warehouse giả `Khối Vật Tư`, nên số lượng và giá trị tồn trên portal không phản ánh tồn theo kho thực tế.
- Desired outcome: đồng bộ snapshot MISA theo từng kho thực, giữ UI kho vật tư hiển thị và lọc được theo warehouse thực tế, và tránh tiếp tục gộp `Top 10 giá trị tồn kho` theo tên vật tư.

## Scope

- In scope:
  - Sửa bridge `syncMisaSupplies` để đọc và lưu snapshot MISA theo từng `StockName`.
  - Sửa backfill/history MISA để không trộn delta giữa các kho khác nhau.
  - Sửa portal `Kho vật tư` để hiển thị warehouse thật ở list/detail/top-value views.
  - Giữ tương thích tạm thời cho anomaly key cũ dùng warehouse `Khối Vật Tư`.
- Out of scope:
  - Thay đổi schema Supabase.
  - Rollout production hoặc chạy migration live ngoài phạm vi code/test cục bộ.
  - Làm lại UI pharmacy/HIS inventory.

## Constraints

- Technical constraints:
  - Không đổi path alias hoặc kiến trúc MVVM của portal.
  - Không phá dữ liệu snapshot MISA lịch sử hiện có trong Supabase.
  - Bridge test dùng Jest; portal unit test dùng `tsx --test`.
- Product or operational constraints:
  - User đang nghi ngờ trực tiếp số tồn, nên patch phải ưu tiên đúng logic hơn là thay đổi giao diện.
  - Các anomaly supply đã ghi key cũ không được biến mất hoàn toàn khỏi portal chỉ vì đổi warehouse hiển thị.

## Assumptions

- `fdc_inventory_snapshots` đã chấp nhận khóa upsert `his_medicineid,warehouse,snapshot_date`, giống luồng pharmacy.
- MISA `InventoryLedger` tiếp tục cung cấp `StockID`, `StockCode`, và `StockName` cho cùng `InventoryItemID`.
- Portal `Kho vật tư` nên xem mỗi dòng tồn theo kho là một row riêng thay vì gộp liên kho theo tên.

## Affected Areas

- Files or directories:
  - `fdc-lan-bridge/src/jobs/syncMisaSupplies.ts`
  - `fdc-lan-bridge/src/lib/misaInventorySync.ts`
  - `fdc-lan-bridge/test/unit/syncMisaSupplies.test.ts`
  - `fdc-lan-bridge/test/unit/misaInventorySync.test.ts`
  - `src/lib/inventory-identity.ts`
  - `src/viewmodels/useSupplyInventory.ts`
  - `src/app/inventory/page.tsx`
  - `src/app/inventory/OverviewTab.tsx`
  - `src/types/inventory.ts`
  - `test/unit/inventoryIdentity.test.ts`
  - `test/unit/supplyInventoryTopMaterials.test.ts`
  - `tasks/todo.md`
- Systems touched:
  - Bridge MISA sync logic
  - Portal supply inventory list/overview rendering

## Role Split

- Planner: capture root cause, scope, and verification plan in workflow files.
- Implementer: update bridge MISA warehouse logic plus portal inventory rendering/tests.
- Verifier: run targeted bridge + portal tests/builds and record any residual risk.
- Reviewer: check for regressions around anomaly matching, duplicate rows, and list/detail UX.

## Implementation Plan

- [x] Add failing tests for MISA per-warehouse snapshot sync and portal top-material grouping behavior.
- [x] Update bridge MISA queries/backfill state to preserve per-warehouse snapshots.
- [x] Add temporary compatibility for legacy supply anomaly keys tied to `Khối Vật Tư`.
- [x] Update portal inventory overview/list/detail to surface warehouse-specific rows correctly.
- [x] Run targeted verification and capture results in `tasks/todo.md`.

## Verification Plan

- Command or check 1: `cmd /c .\node_modules\.bin\jest.cmd test\unit\misaInventorySync.test.ts test\unit\syncMisaSupplies.test.ts --runInBand` in `fdc-lan-bridge`.
- Command or check 2: `cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\inventoryIdentity.test.ts test\unit\supplyInventoryTopMaterials.test.ts` at repo root.
- Command or check 3: `cmd /c npm run build` in `fdc-lan-bridge`.
- Command or check 4: `cmd /c npm run build` at repo root.

## Review Notes

- Findings:
  - Root cause confirmed on live data: MISA item `AO018` exists in multiple stocks (`Kho vật tư - Khác`, `Kho vật tư - Dịch vụ`) but Supabase snapshot currently stores one merged row `Khối Vật Tư = 179`.
  - Live bridge rollout exposed an extra production constraint: `fdc_inventory_snapshots` still enforces unique `(his_medicineid, snapshot_date)`, so supply rows needed a warehouse-specific stock suffix inside `his_medicineid` rather than relying on `(his_medicineid, warehouse, snapshot_date)` uniqueness.
- Residual risks:
  - Existing supply anomalies keyed to `misa_<code>::Khối Vật Tư` need a compatibility path until the next anomaly detection refresh rewrites them.
  - Historical dates older than the rewritten current snapshot still need a manual backfill if the team wants old chart points cleaned from legacy grouped rows.

## Closeout

- Final status: deployed
- Follow-up tasks:
  - Run `backfillMisaInventorySnapshots` if production needs historical supply snapshots rewritten beyond `2026-04-06`.
