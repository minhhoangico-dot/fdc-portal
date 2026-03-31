# Lab Dashboard Real Inventory TV Design

Date: 2026-03-24
Status: Draft for review
Related routes: `/lab-dashboard/current`, `/lab-dashboard/details`, `/lab-dashboard/tv`

## Summary

Khối `Tồn kho thuốc cho khoa xét nghiệm` trên `/lab-dashboard/tv` hiện đang dùng danh sách nhóm cấu hình tĩnh (`REAGENT_CONFIGS`) và hiển thị theo dạng `currentStock / targetStock unit`. Cách này tạo ra các chip có `0 / N`, làm người vận hành hiểu đây là tồn kho thật của vật tư, trong khi thực tế chỉ là kết quả ghép snapshot vào nhóm giả.

Thiết kế mới thay toàn bộ phần reagent summary và reagent detail sang dữ liệu tồn kho thật từ `fdc_inventory_snapshots` của `Khoa Xét Nghiệm`. UI summary vẫn giữ ngôn ngữ card/chip gốc, nhưng chip sẽ là vật tư thật, tên vật tư hiển thị đủ trên chip, và toàn bộ cụm chip sẽ trượt dọc lên trên chậm theo kiểu TV. Không còn `targetStock`, không còn nhóm hóa chất giả, và không còn diễn giải kiểu `1 / 2`.

## Goals

- Hiển thị đúng vật tư thật đang còn tồn trong `Khoa Xét Nghiệm`.
- Giữ cảm giác thị giác của card reagent hiện tại thay vì thay toàn bộ layout dashboard.
- Bỏ toàn bộ dữ liệu tổng hợp giả dựa trên `REAGENT_CONFIGS` và `targetStock`.
- Làm cho summary TV dễ đọc từ xa: chip nhỏ, tên hiện đủ, chuyển động chậm, bề mặt card luôn đầy.
- Đồng bộ summary và detail để drill-down cũng nhìn thấy chính các vật tư thật đó.

## Non-Goals

- Không thay đổi các section queue, TAT, abnormal.
- Không biến reagent section thành bảng inventory đầy đủ như trang quản lý kho.
- Không thêm target/định mức mới cho reagent summary trong phạm vi này.
- Không đổi route hiện tại; tiếp tục dùng `GET /lab-dashboard/current` và `GET /lab-dashboard/details`.

## Current Context

- Bridge reagent summary đang lấy snapshot mới nhất từ `fdc_inventory_snapshots`, lọc `warehouse` có `xét nghiệm`, rồi ghép từng row vào `REAGENT_CONFIGS`.
- Portal summary model map `payload.reagents` thành `quantityLabel = currentStock / targetStock unit`.
- Card reagent hiện dùng chip compact (`.lab-dashboard-reagent`) trong một khối wrap ngang.
- Người dùng đã duyệt hướng visual sau khi xem sample:
  - giữ card/chip UI gốc
  - chip nhỏ gần bản gốc
  - chip co theo nội dung, không ép cùng chiều rộng
  - tên vật tư hiển thị đủ trên chip
  - cả cụm chip trượt dọc lên trên chậm theo kiểu TV

## Chosen Approach

Khuyến nghị: thay payload reagent từ “nhóm tổng hợp” sang “danh sách row inventory thật”, rồi để portal dựng summary TV trực tiếp từ danh sách này.

Vì sao:

- vấn đề gốc nằm ở mô hình dữ liệu, không chỉ ở text hiển thị
- nếu còn giữ `REAGENT_CONFIGS`, UI vẫn sẽ phải bịa ra `0 / N` hoặc các group tổng hợp
- TV section chỉ cần signal vận hành nhanh: vật tư nào đang có, vật tư nào đang thấp, và snapshot lấy ngày nào
- detail screen nên là cùng một tập row để tránh summary và detail nói về hai thế giới khác nhau

## Proposed Contract Changes

### Current problem

`payload.reagents[]` hiện có shape:

```ts
interface LabDashboardReagent {
  key: string;
  name: string;
  currentStock: number;
  targetStock: number;
  unit: string;
  status: "ok" | "low" | "critical";
}
```

Shape này buộc UI nghĩ theo group tổng hợp và định mức.

### New direction

Thay bằng row-level inventory summary:

```ts
interface LabDashboardInventoryChip {
  key: string;
  name: string;
  medicineCode?: string | null;
  currentStock: number;
  unit: string;
  status: "ok" | "low" | "critical";
}
```

`payload.reagents[]` sẽ trở thành danh sách các vật tư thật đã được chọn cho summary TV. `key` nên ổn định theo `medicine_code` nếu có, fallback sang tên đã chuẩn hóa.

Không còn:

- `targetStock`
- `reagentKey` kiểu group như `glucose`, `crp`, `thyroid`
- quantity label kiểu `current / target`

## Data Rules

### Source scope

- Nguồn duy nhất: `fdc_inventory_snapshots`
- Chỉ lấy snapshot mới nhất
- Chỉ lấy các row thuộc `warehouse` của `Khoa Xét Nghiệm`
- Chỉ lấy row có `current_stock > 0`

### Sorting

Summary TV nên sắp:

1. tồn thấp hơn lên trước
2. nếu bằng tồn thì tên vật tư theo alphabet

Mục tiêu là để vật tư có rủi ro cạn kho nổi lên đầu vòng marquee.

### Status coloring

Vì không còn `targetStock`, status cần đổi sang rule row-level đơn giản:

- `critical`: `currentStock <= 1`
- `low`: `currentStock > 1 && currentStock <= 2`
- `ok`: còn lại

Rule này là heuristic hiển thị TV, không phải định mức kho chính thức.

## TV Summary UI

### Visual language

- Giữ card reagent hiện tại trên `/lab-dashboard/tv`
- Giữ chip style hiện tại (`lab-dashboard-reagent`)
- Giữ thanh màu và semantic màu `critical / low / ok`

### Changes inside the card

- Chip dùng tên vật tư thật thay vì tên group giả
- Chip value chỉ hiển thị `currentStock unit`
- Tên chip cho phép hai dòng để không bị cắt mất tên vật tư dài
- Chip nhỏ gần kích thước gốc và có chiều rộng linh hoạt theo nội dung
- Cụm chip chạy marquee dọc lên trên rất chậm
- Bề mặt card phải luôn kín, không để lộ khoảng trống rõ trên TV

### Animation model

Khuyến nghị:

- render một viewport cố định chiều cao
- render hai bản sao của cùng danh sách chip
- animate cả track theo `translateY`
- tốc độ đủ chậm để đọc từ xa
- dùng mask/gradient trên đầu và cuối để chuyển động mềm hơn

## Detail Screen

`section=reagents` sẽ không còn hiển thị detail rows theo group hóa chất giả.

Detail mới cần:

- mỗi row là một vật tư thật
- cột chính: tên vật tư, mã vật tư, kho, tồn hiện tại, đơn vị, snapshot date
- focus mặc định `all`
- nếu còn drill-down từ summary, focus nên bám theo chính item được click thay vì group giả

Nếu cần giữ backward compatibility ngắn hạn, có thể để `focus=all` hoạt động trước và bỏ deep-link group giả trong cùng task.

## Portal Display Model Changes

`buildLabDashboardSummaryModel()` hiện map `payload.reagents` thành `reagentChips` với:

- `percentage = currentStock / targetStock`
- `quantityLabel = current / target unit`

Thiết kế mới đổi sang:

- `quantityLabel = currentStock unit`
- `percentage` lấy từ status band hoặc một normalization nhẹ theo max stock đang hiển thị trong cùng danh sách

Khuyến nghị pragmatic:

- không biểu diễn “so với target” nữa
- bar fill chỉ là accent thị giác theo status, không đại diện tỷ lệ kho chính xác

## Bridge Implementation Shape

Bridge nên tách:

- một mapper raw snapshot -> inventory chip rows cho summary TV
- một builder detail rows cho reagent detail screen
- một source provenance builder mới cho reagent section, giải thích rõ là đang dùng row inventory thật từ `fdc_inventory_snapshots`

`REAGENT_CONFIGS` và logic `allocateReagentRows()` không còn nên là nguồn dữ liệu chính cho dashboard này.

## Testing Strategy

### Bridge

- Test summary reagent payload không còn `targetStock`
- Test reagent summary chỉ chứa row inventory thật từ lab warehouse
- Test sort order ưu tiên tồn thấp trước
- Test blank unit fallback vẫn đồng bộ với inventory module
- Test detail rows hiển thị row inventory thật, không còn group giả

### Portal

- Test display model không còn tạo `current / target`
- Test chip value chỉ là `currentStock unit`
- Test marquee list có thể loop từ cùng một tập chip
- Test long names không bị mất hoàn toàn trong summary model / UI render

### Verification

- `fdc-lan-bridge`: targeted reagent tests + full `npm test` + `npm run build`
- portal root: targeted unit tests for display model + `npm run build`
- manual browser smoke: `/lab-dashboard/tv` và `/lab-dashboard/details?section=reagents&focus=all`

## Risks

- Nếu chuyển focus từ group giả sang item thật, các deep link reagent cũ có thể không còn nghĩa.
- TV marquee cần tinh chỉnh tốc độ và viewport để không gây chóng mắt.
- Tên vật tư dài có thể cần giới hạn 2 dòng; nếu dài hơn nữa phải chấp nhận cắt mềm.

## Approved Direction

Đã được người dùng duyệt trong phiên này:

- Giữ UI card/chip gốc
- Dùng vật tư thật thay cho group giả
- Chip nhỏ gần bản gốc
- Tên vật tư hiển thị đủ trên chip
- Cụm chip trượt dọc lên trên chậm theo kiểu TV
- Chip không cần cùng chiều rộng
- Card summary không để lộ khoảng trống rõ trên màn hình
