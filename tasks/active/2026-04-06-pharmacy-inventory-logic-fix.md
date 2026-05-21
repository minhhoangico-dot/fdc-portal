# Task Spec: pharmacy-inventory-logic-fix

## Goal

- Problem: Kho thuốc có nhiều nhánh logic lệch nhau giữa HIS, bridge anomaly detection, và portal UI. `zero_stock` không bao giờ phát sinh, Top 10 cộng dồn theo tên, filter/status `low_stock` không phản ánh dữ liệu thực, và chart lịch sử filtered còn phụ thuộc RPC không nằm trong repo.
- Desired outcome: Bridge phải giữ đủ dữ liệu để detect hết hàng đúng, anomaly matching phải bám theo inventory identity, portal phải hiển thị Top 10 và trạng thái kho thuốc theo đúng row semantics, và filtered history phải được tính ngay trong codebase.

## Scope

- In scope:
  - `fdc-lan-bridge` pharmacy sync/backfill/detect-anomaly logic
  - Portal pharmacy viewmodel/top-material/status/history behavior
  - Regression tests cho bridge và portal
  - Production rollout cho portal + bridge
- Out of scope:
  - Thay đổi tần suất scheduler
  - Thiết kế lại toàn bộ UI kho thuốc

## Constraints

- Technical constraints:
  - Không phá vỡ identity hiện tại của snapshot pharmacy rows đang dựa trên `his_medicineid`
  - Giữ anomaly compatibility cho các row cũ nếu chưa có `inventory_item_key`
- Product or operational constraints:
  - Logic phải bám theo dữ liệu HIS live đã đối chiếu ngày `2026-04-06`
  - Tránh thay đổi hiển thị quá rộng ngoài các khu vực đang sai

## Assumptions

- `fdc_inventory_snapshots` chấp nhận pharmacy rows có `current_stock = 0`
- UI list cho kho thuốc nên dùng anomaly/near-expiry làm trạng thái dẫn xuất thay vì chờ snapshot `status` riêng

## Affected Areas

- Files or directories:
  - `fdc-lan-bridge/src/jobs/syncInventory.ts`
  - `fdc-lan-bridge/src/lib/pharmacyInventorySync.ts`
  - `fdc-lan-bridge/src/jobs/detectAnomalies.ts`
  - `fdc-lan-bridge/test/unit/*.test.ts`
  - `src/viewmodels/usePharmacyInventory.ts`
  - `src/app/pharmacy/page.tsx`
  - `src/lib/pharmacyInventoryPresentation.ts`
  - `test/unit/*.test.ts`
- Systems touched:
  - HIS-derived pharmacy inventory sync
  - Supabase pharmacy snapshots/anomalies
  - Portal pharmacy inventory screen

## Role Split

- Planner: Codex inline
- Implementer: Codex inline
- Verifier: Codex inline
- Reviewer: Codex inline self-review

## Implementation Plan

- [x] Add failing bridge tests for zero-stock snapshot retention and anomaly identity matching
- [x] Add failing portal test for warehouse-aware pharmacy Top 10 grouping
- [x] Update pharmacy snapshot/backfill writes to retain zero-stock rows needed for zero-stock anomalies
- [x] Update anomaly dedup logic to prioritize `inventory_item_key`
- [x] Update pharmacy portal derived status/filter/top-material behavior to stop name-based merges
- [x] Replace filtered pharmacy history RPC dependency with in-repo snapshot scanning
- [x] Run targeted verification and deploy to production

## Verification Plan

- `cmd /c .\node_modules\.bin\jest.cmd --runInBand test/unit/pharmacyInventorySync.test.ts test/unit/syncInventory.test.ts test/unit/detectAnomalies.test.ts` in `fdc-lan-bridge`
- `cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\pharmacyInventoryPresentation.test.ts test\unit\inventoryIdentity.test.ts` at repo root
- `cmd /c npm.cmd run build` in `fdc-lan-bridge`
- `cmd /c npm.cmd run build` at repo root
- `cmd /c npx.cmd wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true`
- SSH rollout to `Vostro-Server` (`hbminh@192.168.1.9`) with sequential build, restart, and `/health` check
- Manual `POST /sync/HIS` and `journalctl` verification on the bridge host

## Review Notes

- Findings:
  - HIS live has `8,982` zero-stock rows and `266` zero-stock rows with same-day export on `2026-04-06`, but the old portal/bridge path could never surface `zero_stock`.
  - HIS live and Supabase both show same-name medicines across multiple rows/warehouses, so pharmacy Top 10 cannot safely group by name.
- Verification evidence:
  - `cmd /c .\node_modules\.bin\jest.cmd --runInBand test/unit/pharmacyInventorySync.test.ts test/unit/syncInventory.test.ts test/unit/detectAnomalies.test.ts` in `fdc-lan-bridge`: passed, covering zero-stock backfill retention, out-of-stock current-row writes, and keyed anomaly dedup.
  - `cmd /c .\node_modules\.bin\tsx.cmd --test test\unit\inventoryIdentity.test.ts test\unit\pharmacyInventoryPresentation.test.ts` at the repo root: passed, covering pharmacy identity matching plus warehouse-aware top-material rows and derived low/out-of-stock display status.
  - `cmd /c npm.cmd run build` in `fdc-lan-bridge`: passed (`tsc` clean).
  - `cmd /c npm.cmd run build` at the repo root: passed (`vite build` completed; existing large-chunk warning only).
  - `cmd /c npx.cmd wrangler pages deploy dist --project-name fdc-portal --branch main --commit-dirty=true`: passed; deployment URL `https://256bed7f.fdc-portal.pages.dev`.
  - `Invoke-WebRequest -UseBasicParsing https://256bed7f.fdc-portal.pages.dev/` and `Invoke-WebRequest -UseBasicParsing https://portal.fdc-nhanvien.org/`: both returned `200` and referenced `assets/index-BvFGePB5.js`.
  - SSH rollout to `Vostro-Server` copied `src/jobs/detectAnomalies.ts`, `src/jobs/syncInventory.ts`, and `src/lib/pharmacyInventorySync.ts`, then `sudo npm run build`, `sudo systemctl restart fdc-lan-bridge`, and `curl http://127.0.0.1:3333/health` all succeeded.
  - Manual `POST /sync/HIS` completed `syncInventoryJob` (`921` synced rows) and `detectAnomaliesJob` in the rollout window according to `journalctl`.
- Residual risks:
  - Manual `sync/HIS` ran at `01:32` ICT on `2026-04-07`, so there were `0` qualifying `out_of_stock` rows and `0` active `zero_stock` anomalies at that moment; those states will only appear when HIS actually produces zero-stock-with-export rows later in the day.
  - Same-day parity with HIS is still limited by the `06:00` daily scheduler unless pharmacy sync is made intraday in a follow-up task.

## Closeout

- Final status: deployed
- Follow-up tasks:
  - Consider whether the pharmacy snapshot should become intraday if operators expect same-day parity with HIS.
