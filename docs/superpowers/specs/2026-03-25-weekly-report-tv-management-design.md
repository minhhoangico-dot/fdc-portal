# Weekly Report TV Management Design

Date: 2026-03-25
Status: Approved for implementation
Related routes: `/tv-management`, `/tv-management/weekly-report`, `/tv-management/weekly-report/tv`, `/tv-management/weekly-report/details`, legacy `/weekly-report*`, `admin?tab=weekly_report`

## Summary

Thiết kế này đưa toàn bộ luồng `Báo cáo giao ban` ra khỏi module chính và tab admin cũ, gom về `Quản lý TV`. Trong bảng `TV screen`, dòng đại diện cho báo cáo giao ban sẽ được nhận diện bằng `fdc_tv_screens.settings.featureKey = "weekly_report"` và có thêm nút đi tới trang cài đặt riêng.

Trang mới `/tv-management/weekly-report` sẽ gộp hai vai trò hiện có:

- vận hành tuần báo cáo: chọn tuần, làm mới, tạo snapshot, mở màn hình TV
- cấu hình quản trị: ICD truyền nhiễm, service mappings, tra cứu catalog, custom report

Các entry cũ vẫn tồn tại ở mức route nhưng chỉ còn nhiệm vụ chuyển hướng sang URL mới. Luồng TV và drilldown detail cũng được đổi namespace sang `/tv-management/weekly-report/*` để chấm dứt việc dùng URL cũ như entry chính.

## Goals

- Bỏ `Báo cáo giao ban` khỏi menu module chính.
- Bỏ tab `Báo cáo giao ban` khỏi `/admin`.
- Quản trị báo cáo giao ban từ `Quản lý TV`, theo đúng mô hình "một TV screen trong danh sách hiện có".
- Tạo trang hợp nhất mới cho weekly report thay cho việc tách rời module vận hành và tab admin.
- Chuyển hướng các route cũ sang route mới mà không làm gãy màn hình TV đang chạy.

## Non-Goals

- Không đổi contract bridge `/weekly-report/*`.
- Không thay quyền xem màn hình TV và detail của weekly report sang `tv_management`.
- Không thiết kế lại CRUD TV screen ngoài phạm vi thêm nút cài đặt và giữ `settings.featureKey`.
- Không thay schema `fdc_tv_screens`; chỉ tận dụng `settings JSONB` đã có.

## Approved Inputs From This Session

- Bỏ `Báo cáo giao ban` khỏi module chính và admin cũ.
- Giữ `Báo cáo giao ban` là một bản ghi TV screen trong danh sách hiện có.
- Thêm nút sang trang `Cài đặt báo cáo giao ban` riêng ngay trên dòng TV này.
- Route cũ phải chuyển sang route mới, không tiếp tục dùng luồng cũ.
- Trang mới phải gộp cả vận hành weekly report và cấu hình admin.
- Dùng `fdc_tv_screens.settings.featureKey = "weekly_report"` làm định danh chính.

## Current Context

- `src/lib/navigation.ts` hiện vẫn expose module `weekly_report` trên sidebar/bottom nav.
- `src/app/weekly-report/page.tsx` đang là màn hình vận hành.
- `src/app/admin/WeeklyReportTab.tsx` đang là màn hình cấu hình.
- `src/app/tv-management/page.tsx` hiện chỉ là wrapper cho `TvScreensTab`.
- `src/viewmodels/useTvScreens.ts` đã map trường `settings`, nhưng `TvScreensTab` hiện chưa giữ `settings` khi edit/save form.
- `src/lib/weekly-report.ts` và các card component đang build link theo namespace `/weekly-report/*`.

## Chosen Approach

### 1. Identify the TV row via `settings.featureKey`

- Dùng `settings.featureKey = "weekly_report"` làm source of truth.
- Thêm lớp tương thích đọc legacy internal URL `/weekly-report/tv` để nút cài đặt vẫn hiện trước khi SQL backfill được chạy.
- Không expose field này ra form; chỉ giữ nguyên khi edit TV screen.

### 2. Create a dedicated management route inside TV management

- Route mới: `/tv-management/weekly-report`
- Route này chỉ dành cho `super_admin`, đi cùng module `tv_management`
- Route mới gộp:
  - launcher/status/snapshot controls từ weekly report module cũ
  - admin settings/custom report từ admin tab cũ

### 3. Move TV/detail URLs into the new namespace

- TV route mới: `/tv-management/weekly-report/tv`
- Detail route mới: `/tv-management/weekly-report/details`
- Hai route này vẫn giữ guard `weekly_report` + `TvAccessGate`
- Lý do: vẫn bảo toàn mô hình truy cập TV/detail hiện có, không vô tình biến TV thành chỉ `super_admin` xem được

### 4. Turn old routes into redirects only

- `/weekly-report` -> `/tv-management/weekly-report`
- `/weekly-report/tv` -> `/tv-management/weekly-report/tv`
- `/weekly-report/details` -> `/tv-management/weekly-report/details`
- `admin?tab=weekly_report` -> `/tv-management/weekly-report`

## Information Architecture

### TV management list

`/tv-management` tiếp tục là danh sách TV screen hiện có.

Riêng row có `featureKey = "weekly_report"` sẽ có thêm:

- nút preview như cũ
- nút `Cài đặt báo cáo giao ban` mở `/tv-management/weekly-report`

### Weekly report management page

`/tv-management/weekly-report` gồm 3 khối:

- khối vận hành tuần báo cáo
  - chọn tuần
  - làm mới
  - tạo snapshot
  - mở màn hình TV
- khối trạng thái snapshot/log gần nhất
- khối cấu hình nâng cao
  - ICD bệnh truyền nhiễm
  - service mappings
  - tra cứu service catalog
  - custom report + drilldown

## Data and Routing Rules

- `settings.featureKey` được preserve xuyên suốt vòng edit/save ở `TvScreensTab`.
- Hàm build URL weekly report phải đổi sang namespace `/tv-management/weekly-report/*`.
- Detail page back-link phải quay về:
  - `/tv-management/weekly-report` nếu `from=management`
  - `/tv-management/weekly-report/tv?...` nếu `from=tv`

## Permissions

- `weekly_report` vẫn tồn tại trong `ModuleKey`/visibility map để bảo vệ TV/detail routes.
- NAV sẽ không còn item `weekly_report`.
- Route quản trị hợp nhất `/tv-management/weekly-report` dùng quyền `tv_management`.
- Điều này cố ý làm cho weekly report management trở thành luồng `super_admin`, đúng với quyết định gom quản trị về `Quản lý TV`.

## SQL Backfill

Thêm SQL idempotent để backfill row weekly report hiện có:

- set `settings.featureKey = "weekly_report"`
- đổi `content_url` từ `/weekly-report/tv` sang `/tv-management/weekly-report/tv`
- chỉ áp dụng cho row `content_type = 'internal'` có `content_url` weekly report cũ hoặc mới

## Testing Strategy

### Unit tests

- navigation không còn show `/weekly-report`, nhưng vẫn show `/tv-management` cho `super_admin`
- weekly report helper URLs build sang namespace mới
- TV screen helper nhận diện row weekly report qua `featureKey`
- TV screen helper vẫn nhận diện được row legacy qua `contentUrl`
- TV screen helper trả về đúng href cài đặt cho row weekly report

### Verification

- `cmd /c npx tsx --test test\unit\navigation.test.ts test\unit\tvScreenLinks.test.ts test\unit\weeklyReportLinks.test.ts`
- `cmd /c npm run build`

## Risks

- Nếu edit TV row mà không preserve `settings`, `featureKey` sẽ bị mất và nút cài đặt biến mất.
- Nếu chỉ đổi route management mà không đổi TV/detail URL helpers, drilldown sẽ vẫn rơi về namespace cũ.
- Nếu SQL backfill chưa chạy, public alias `/tv/{slug}` có thể đi qua thêm một bước redirect từ URL cũ sang URL mới; chấp nhận được trong pha chuyển tiếp.

## Approved Direction

Đã được user duyệt trong phiên này:

- dùng `settings.featureKey = "weekly_report"` làm định danh chính
- tạo route hợp nhất mới dưới `/tv-management/weekly-report`
- giữ `Báo cáo giao ban` như một TV screen row trong danh sách hiện có
- thêm nút `Cài đặt báo cáo giao ban` riêng cho row đó
- route cũ chỉ còn chuyển hướng, không dùng lại luồng cũ
