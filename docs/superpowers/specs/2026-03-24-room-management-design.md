# Room Management Design

Date: 2026-03-24
Status: Draft for review
Related routes: `/room-management`, `/room-management/maintenance`, `/room-management/print/materials`, existing `/requests`, `/approvals`

## Summary

Thiết kế này bổ sung một module `Quản lý phòng` theo hướng `floorplan-first`, lấy danh sách phòng cố định từ các floorplan hiện có trong `public/`. Người dùng vào module sẽ thấy sơ đồ tầng, bấm vào phòng để mở drawer nghiệp vụ, rồi thực hiện hai hành động chính:

- `Báo cáo sự cố / yêu cầu bảo trì`
- `Yêu cầu vật tư theo từng phòng`

Luồng vật tư tiếp tục dùng backbone `fdc_approval_requests` và `/approvals` sẵn có. Luồng sự cố / bảo trì đi vào queue vận hành riêng với trạng thái xử lý riêng, không ép vào approval flow. Module cũng có một màn hình in riêng để tạo `single consolidated sheet` tổng hợp yêu cầu vật tư theo `tầng -> phòng -> vật tư`.

Mock UI đã được duyệt ở localhost trong phiên này theo đúng hướng trên: màn hình chính là sơ đồ phòng, drawer của phòng chứa tổng quan + khối sự cố + khối vật tư, kèm hai màn hình phụ là hàng chờ bảo trì và print preview.

## Goals

- Biến sơ đồ tầng thành màn hình vào chính cho nghiệp vụ quản lý phòng.
- Cho phép nhân viên báo cáo sự cố / yêu cầu bảo trì trực tiếp từ từng phòng.
- Cho phép tạo yêu cầu vật tư gắn với từng phòng nhưng vẫn đi qua approval flow hiện có.
- Cung cấp màn hình in tổng hợp vật tư theo phòng dưới dạng một sheet gộp, phục vụ vận hành nội bộ.
- Giữ page component mỏng, đưa logic vào viewmodel theo kiến trúc MVVM của repo.

## Non-Goals

- Không làm admin CRUD để thêm / sửa / xóa phòng trong v1.
- Không thay đổi module `/requests` thành giao diện floorplan.
- Không tự động trừ tồn kho từ màn hình phòng trong v1.
- Không thêm PDF / Excel export nâng cao ngoài màn hình in gộp của browser.
- Không đưa sửa chữa chi phí lớn vào approval flow tự động trong v1.

## Approved Inputs From This Session

- Hướng UI được duyệt: `A. Floorplan-first`
- Phòng là đơn vị quản lý chính.
- `Yêu cầu vật tư` phải đi qua approval flow hiện có.
- `Sự cố / bảo trì` đi vào operational queue riêng; chỉ cân nhắc approval sau nếu sau này có sửa chữa chi phí lớn.
- Danh sách phòng là `fixed`, bám theo các floorplan hiện có trong `public/`.
- Print output mong muốn là `single consolidated sheet`, không phải phiếu riêng từng phòng.

## Current Context

- Portal hiện đã có backbone request + approval hoàn chỉnh qua `fdc_approval_requests`, `fdc_approval_steps`, `useRequests()`, `/requests`, `/approvals`.
- `CreateRequestPage` đã hỗ trợ line item cho `material_release` và `purchase`.
- Điều hướng hiện đang dùng `moduleKey` và `NAV_ITEMS` trong `src/lib/navigation.ts`, nên module mới cần là một menu item đúng nghĩa thay vì chôn dưới module cũ.
- Các floorplan đang nằm ở:
  - `public/fdc-tang1-floorplan.html`
  - `public/fdc-tang2-floorplan.html`
  - `public/fdc-tang3-floorplan.html`
- Repo đang dùng MVVM: page trong `src/app/**/page.tsx` mỏng, logic và fetch nằm ở `src/viewmodels/use*.ts`.

## Options Considered

### 1. Recommended: New module + reuse approval only for room material requests

Tạo module `room_management` riêng, route riêng, queue sự cố riêng, nhưng vật tư vẫn dùng `fdc_approval_requests`.

Vì sao được chọn:

- Phù hợp với home screen kiểu floorplan-first đã được duyệt.
- Tận dụng approval flow đang có mà không bóp méo lifecycle của maintenance.
- Cho phép supervisor vừa có màn hình trực quan theo mặt bằng, vừa có màn hình queue để xử lý hàng loạt.

### 2. Put both maintenance and materials into the existing generic request system

Nhanh hơn lúc đầu, nhưng maintenance sẽ bị gò vào lifecycle approval không phù hợp.

### 3. Thin overlay on top of the static floorplan HTML files

Nhanh để demo, nhưng brittle và khó mở rộng vì public HTML trở thành một phần logic ứng dụng.

## Chosen Approach

Xây một module mới `Quản lý phòng`, nhưng tách rõ hai backbone nghiệp vụ:

- `Vật tư theo phòng` dùng lại `material_release` trên `fdc_approval_requests` với room context bổ sung.
- `Sự cố / bảo trì` dùng bảng nghiệp vụ riêng, queue riêng, trạng thái riêng.

Floorplan được render bằng UI component của portal, không nhúng nguyên xi HTML static vào app runtime. Danh sách phòng là cố định, nhưng dữ liệu phát sinh từ phòng được lưu trong Supabase để phục vụ queue, filter, print, và audit trail.

## Information Architecture

### Main module

- New module key: `room_management`
- New nav item: `Quản lý phòng`
- New route: `/room-management`
- This implies extending the current module-key model and navigation visibility maps, not just adding a page.

### Secondary screens inside the module

- `/room-management/maintenance`
  - Hàng chờ bảo trì / sự cố
  - Tối ưu cho xử lý hàng loạt
- `/room-management/print/materials`
  - Màn hình in tổng hợp vật tư theo phòng
  - Tối ưu cho print preview và browser print

### Main page structure

`/room-management` gồm:

- Header module + action buttons
  - `Hàng chờ bảo trì`
  - `In tổng hợp vật tư`
- Floor tabs: `Tầng 1`, `Tầng 2`, `Tầng 3`
- Interactive floorplan canvas
- Right-side room drawer when a room is selected

## Room Catalog Strategy

### Fixed room list

Danh sách phòng được chốt theo floorplan hiện tại, không có UI chỉnh sửa trong v1.

### Data split

- `fdc_room_catalog`
  - canonical room metadata cho query, join, print
  - fields đề xuất: `room_code`, `floor_key`, `room_name`, `room_type`, `zone`, `sort_order`, `is_active`
- `src/lib/room-layout.ts`
  - chỉ chứa geometry / presentation metadata để render floorplan trong portal
  - keyed by `room_code`

Lý do tách:

- SQL/reporting/filters cần room catalog chuẩn trong DB.
- Frontend layout cần position/size riêng, không nên nhồi vào runtime parser của static HTML.

## Data Model

### 1. Room catalog

`fdc_room_catalog`

- `room_code` PK
- `floor_key`
- `room_name`
- `room_type`
- `zone`
- `sort_order`
- `is_active`

### 2. Maintenance / incident backbone

`fdc_room_issues`

- `id`
- `room_code`
- `issue_type`
  - `incident`
  - `maintenance`
- `title`
- `description`
- `severity`
  - `low`
  - `medium`
  - `high`
  - `urgent`
- `status`
  - `new`
  - `triaged`
  - `in_progress`
  - `waiting_material`
  - `resolved`
  - `cancelled`
- `reported_by`
- `assigned_to`
- `estimated_cost`
- `reported_at`
- `resolved_at`
- `created_at`
- `updated_at`

`fdc_room_issue_events`

- `id`
- `issue_id`
- `event_type`
- `from_status`
- `to_status`
- `note`
- `actor_id`
- `created_at`

Mục đích:

- queue có audit trail rõ
- detail issue có timeline thay vì chỉ trạng thái cuối

### 3. Room material requests on top of existing request system

Không tạo bảng room-material riêng trong v1. Thay vào đó mở rộng `fdc_approval_requests` bằng room context nullable:

- `source_module`
- `room_code`
- `linked_issue_id`

Request type vẫn là `material_release`.

`metadata.items` tiếp tục giữ line items như current request flow.

Lý do:

- approval flow, notification, request detail, approvals page đã sẵn có
- tránh duplicate state giữa bảng room-specific và bảng request generic
- print screen chỉ cần filter `source_module='room_management'`

## User Flows

### Room material request

1. User vào `/room-management`
2. User chọn tầng
3. User bấm vào một phòng
4. Drawer mở ra
5. User bấm `Yêu cầu vật tư`
6. Form vật tư mở với `room_code` và room identity đã được prefill
7. System tạo `fdc_approval_requests` loại `material_release` với room context
8. Request tiếp tục đi qua approval templates hiện có
9. Request vẫn hiển thị ở `/requests` và `/approvals`

### Cross-module room context display

Các request được tạo từ room management không được nhìn giống generic stock release. Các màn hình hiện có cần hiển thị thêm room context khi `source_module='room_management'`:

- `/requests`
- `/requests/[id]`
- `/approvals`

Tối thiểu cần có:

- room badge hoặc room line rõ ràng
- floor / room name khi xem detail
- linked issue indicator nếu request sinh ra từ maintenance queue

### Incident / maintenance report

1. User vào `/room-management`
2. User chọn phòng
3. User bấm `Báo cáo sự cố / bảo trì`
4. System tạo record trong `fdc_room_issues` với status `new`
5. Ops user vào `/room-management/maintenance`
6. Ops user cập nhật status, note, assignee qua queue / detail
7. Mọi chuyển trạng thái tạo event trong `fdc_room_issue_events`

### Linked issue -> material request

Nếu issue cần vật tư để sửa:

1. Ops user đang xem issue
2. Bấm `Tạo yêu cầu vật tư`
3. System mở material request với `linked_issue_id`
4. Approval flow vẫn chạy như bình thường
5. Issue chuyển sang `waiting_material` nếu cần

## Main UI Structure

### Room map home

Màn hình chính cần giữ mental model “đi trong tòa nhà”:

- floor tabs cố định trên đầu
- room block hiển thị đúng vị trí tương đối của floorplan
- room có signal nhẹ về tình trạng:
  - có sự cố mở
  - có phiếu vật tư đang chờ
  - phòng đang được chọn

### Room drawer

Drawer của phòng có 3 khối:

#### 1. Tổng quan phòng

- room name / code / type / floor
- số issue mở
- số phiếu vật tư chờ duyệt
- thời gian cập nhật gần nhất

#### 2. Sự cố / bảo trì

- danh sách issue mở của phòng
- CTA `Báo cáo sự cố / bảo trì`
- mỗi issue có status chip và tóm tắt ngắn

#### 3. Yêu cầu vật tư

- danh sách request gần nhất của phòng
- CTA `Yêu cầu vật tư`
- preview nhóm vật tư đã yêu cầu

### Maintenance queue screen

`/room-management/maintenance` nên là operational screen độc lập:

- filter by floor
- filter by status
- filter by severity
- filter by assignee
- list / board view
- link ngược về phòng nguồn

Queue này là cách bù nhược điểm “floorplan-first khó xử lý hàng loạt”.

### Print screen

`/room-management/print/materials` là màn hình in riêng, không phải print trực tiếp từ room map.

Cấu trúc:

- filter date range
- filter floor
- filter request status
- group output theo `tầng -> phòng -> vật tư`
- action:
  - `Xem trước`
  - `In`

Default status scope:

- `pending`
- `approved`

`completed` là tùy chọn filter bổ sung, không bật mặc định.

## Access Model

### Broad access for creation

Tất cả user authenticated có thể:

- mở room map
- tạo issue / maintenance report
- tạo room material request

### Narrower access for operations

Các role vận hành / quản lý phù hợp mới thấy full queue và thao tác trạng thái toàn cục:

- `dept_head`
- `head_nurse`
- `super_admin`
- các role được gán xử lý maintenance nếu dự án muốn mở rộng về sau

### Approval control unchanged

Approval của room material requests vẫn do approval templates hiện có quyết định. Module mới không thay luật approval.

## Error Handling

- Nếu room catalog / layout fail to load:
  - hiển thị error panel theo tầng
  - disable room interaction
- Nếu create issue fail:
  - giữ nguyên form
  - giữ typed content
  - hiện backend error
- Nếu create room material request fail:
  - giữ nguyên room context
  - show backend error từ request flow
- Nếu print aggregation fail:
  - giữ filter state
  - show retry state
  - không render blank print page

Realtime không phải bắt buộc cho v1. Polling hoặc manual refresh là chấp nhận được nếu giúp implementation gọn và chắc.

## Testing Strategy

### Unit / data tests

- room catalog mapping đúng với fixed room set từ floorplans
- room layout map khớp `room_code` trong catalog
- material request metadata / new nullable fields map đúng room context
- print grouping đúng theo `floor -> room -> item`
- maintenance status transitions hợp lệ

### UI tests

- click room mở đúng drawer
- drawer hiển thị đúng room summary
- tạo room material request gọi existing request path với room context
- issue queue filter và status update render đúng
- print preview group đúng theo phòng

### Verification commands expected during implementation

- targeted unit tests for room catalog, print grouping, and maintenance status logic
- repo root `npm run build`
- SQL verification cho các bảng / cột mới
- browser smoke:
  - `/room-management`
  - `/room-management/maintenance`
  - `/room-management/print/materials`

## Risks

- Fixed room catalog đòi hỏi seed và layout map phải đồng bộ; mismatch sẽ làm room click sai context.
- Dùng `material_release` cho room requests là pragmatic, nhưng UI detail hiện có cần bổ sung hiển thị room context rõ ràng để tránh request nhìn giống generic stock release.
- Nếu queue bảo trì cần attachment ảnh sớm, scope v1 có thể nở thêm storage / attachment table.

## V1 Boundary

Không làm trong v1:

- room admin CRUD
- drag/drop floorplan editor
- maintenance cost approval routing tự động
- issue photo attachments / storage flow
- stock deduction / fulfillment workflow trực tiếp từ room screen
- export nhiều định dạng nâng cao ngoài browser print sheet

## Approved Direction

Đã được user duyệt trong phiên này:

- floorplan-first module home
- fixed room list từ floorplans hiện có
- room drawer là nơi thao tác chính
- maintenance dùng operational queue riêng
- room material requests đi qua approval flow hiện có
- single consolidated print sheet grouped by room
- mock UI localhost thể hiện:
  - main room map
  - room drawer
  - maintenance queue
  - consolidated print preview
