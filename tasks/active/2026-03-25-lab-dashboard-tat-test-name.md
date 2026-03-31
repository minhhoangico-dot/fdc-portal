# Task Spec: lab-dashboard-tat-test-name

## Goal

- Problem: `Chi tiết TAT` hiện chỉ hiển thị mã bệnh nhân, nhóm xét nghiệm, và các mốc thời gian; người dùng không thấy tên test tương ứng ở từng dòng.
- Desired outcome: tất cả các nhóm trong `Chi tiết TAT` hiển thị thêm cột `Tên test`, và dữ liệu xuất Excel khớp với cột mới này.

## Scope

- In scope:
- Mở rộng payload/detail row TAT từ bridge để mang theo `testName`.
- Cập nhật types portal/bridge, bảng `Chi tiết TAT`, và export helper.
- Thêm regression tests cho detail helpers và export mapping.
- Out of scope:
- Thay đổi summary cards, nguồn dữ liệu source tab, hoặc logic tính TAT.
- Hiển thị danh sách từng analyte con cho các panel xét nghiệm.

## Constraints

- Technical constraints:
- Giữ thay đổi nhỏ và bám payload detail hiện tại.
- Không thêm round-trip mới từ portal; tên test phải đi cùng payload bridge.
- Product or operational constraints:
- Với các panel/gói xét nghiệm, cột mới chỉ cần hiện tên chỉ định gốc của dòng TAT.

## Assumptions

- `tb_servicedata.servicename` là nguồn `Tên test` phù hợp cho từng dòng TAT.
- Export Excel phải bám đúng dữ liệu đang hiển thị trên màn hình detail.

## Affected Areas

- Files or directories:
- `fdc-lan-bridge/src/labDashboard/service.ts`
- `fdc-lan-bridge/src/labDashboard/detailHelpers.ts`
- `fdc-lan-bridge/src/labDashboard/types.ts`
- `fdc-lan-bridge/test/unit/labDashboardDetails.test.ts`
- `src/types/labDashboard.ts`
- `src/components/lab-dashboard/LabDashboardDetailScreen.tsx`
- `src/lib/labDashboardDetailExport.ts`
- `test/unit/labDashboardDetailExport.test.ts`
- `tasks/todo.md`
- Systems touched:
- Bridge detail payload contract and portal detail/export rendering.

## Role Split

- Planner: Capture the approved scope and verification target.
- Implementer: Add failing tests and extend TAT detail payload/rendering with `testName`.
- Verifier: Run bridge + portal targeted checks.
- Reviewer: Confirm all TAT groups show the extra column without changing TAT math.

## Implementation Plan

- [x] Add failing tests for `testName` in TAT detail rows and Excel export.
- [x] Extend the bridge detail query/types/helpers to carry `testName`.
- [x] Render/export the new `Tên test` column in the portal.
- [x] Run targeted verification and record evidence.

## Verification Plan

- Command or check 1: `cmd /c npx jest test/unit/labDashboardDetails.test.ts --runInBand`
- Command or check 2: `cmd /c npx tsx --test test/unit/labDashboardDetailExport.test.ts`
- Command or check 3: `cmd /c npm run build`
- Command or check 4: `cmd /c npm run build` in `fdc-lan-bridge`

## Review Notes

- Findings:
- Live bridge host drifted from the verified local repo: `/opt/fdc-lan-bridge/src/labDashboard/detailHelpers.ts` and `/opt/fdc-lan-bridge/src/labDashboard/service.ts` were stale, so `/lab-dashboard/details` still omitted `testName` after the local code and tests were already correct.
- The first live rollout check stayed red because `sudo npm run build` and `sudo systemctl restart fdc-lan-bridge` were launched in parallel, which let systemd boot a process against the old `dist` before `tsc` finished rewriting it.
- Residual risks:
- If some TAT rows represent grouped panels, the new column will show the panel/service name, not each child analyte.
- Operators with an already-open lab dashboard tab may need a hard refresh before the corrected bridge payload appears in the table.

## Closeout

- Final status: done
- Follow-up tasks:
- Optional browser smoke on `/lab-dashboard/details?section=tat&focus=type:mien-dich` to confirm the rendered cells match the corrected live bridge payload.
