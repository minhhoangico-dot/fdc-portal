# Lab Dashboard Source Provenance Design

Date: 2026-03-23
Status: Draft for review
Related routes: `/lab-dashboard/details`, `/lab-dashboard/tv`

## Summary

Tab `Nguồn dữ liệu` trên `/lab-dashboard/tv` hiện mới dừng ở mức metadata và vài `calculationNotes` ngắn theo section. Mức này chưa đủ để đối soát khi người vận hành cần trả lời các câu hỏi như:

- dữ liệu này đến từ tập nào
- đã lọc qua những bước nào
- tại sao đúng focus hiện tại lại cho ra đúng số dòng này
- số lượng thay đổi ở từng bước lọc là bao nhiêu

Thiết kế này mở rộng payload detail từ bridge để trả provenance có cấu trúc, giàu ngữ cảnh, và dễ hiểu cho người vận hành. UI tab `Nguồn dữ liệu` sẽ đọc trực tiếp từ contract này thay vì tự suy diễn logic từ `section` và `focus`.

## Goals

- Cho phép đối soát nguồn dữ liệu ở mức rất chi tiết nhưng dùng nhãn dễ hiểu.
- Hiển thị funnel số lượng qua từng bước lọc, từ tập đầu vào tới số dòng cuối đang hiển thị.
- Giải thích rõ vì sao focus hiện tại cho ra đúng danh sách đang mở.
- Giải thích cách tính metric hiện tại bằng ngôn ngữ vận hành, không ưu tiên tên cột kỹ thuật.
- Giữ nguyên tab `Danh sách chi tiết` và route detail hiện tại.

## Non-Goals

- Không trace provenance riêng cho từng dòng nếu tất cả các dòng dùng cùng một rule.
- Không thêm route bridge mới; tiếp tục dùng `GET /lab-dashboard/details`.
- Không đưa tên kỹ thuật như `tb_servicedata`, `order_date`, `data_date` thành nội dung chính trong UI mặc định.
- Không thêm export riêng cho provenance trong phạm vi này.

## Current Context

- Bridge hiện trả `LabDashboardDetailPayload` với `meta.sourceDetails[]`.
- `LabDashboardDetailSourceInfo` chỉ có:
  - `label`
  - `source`
  - `generatedAt`
  - `dataDate`
  - `error`
  - `calculationNotes`
- Portal tab `Nguồn dữ liệu` hiện render gần như nguyên xi `calculationNotes`.
- `rows` của detail payload đã đúng theo focus hiện tại và không chứa `patientName`.

## Proposed Approach

Khuyến nghị: mở rộng bridge contract của `sourceDetails` thành provenance có cấu trúc, rồi để portal chỉ trình bày lại theo layout đã thống nhất.

Vì sao:

- logic thật nằm ở bridge, nên provenance cũng phải được bridge phát ra
- funnel đếm số lượng ở từng bước cần dựa trên dữ liệu thật, không thể ghép text an toàn ở frontend
- cùng một focus có thể thay đổi logic query sau này; nếu UI tự dựng text sẽ dễ drift

## Proposed Contract

Giữ nguyên route:

- `GET /lab-dashboard/details?section=...&focus=...&date=...`

Mở rộng `LabDashboardDetailSourceInfo` theo hướng additive:

```ts
interface LabDashboardDetailDatasetInfo {
  key: string;
  label: string;
  role: string;
}

interface LabDashboardDetailPipelineStep {
  key: string;
  label: string;
  ruleSummary: string;
  inputCount: number;
  outputCount: number;
}

interface LabDashboardDetailMetricExplanation {
  label: string;
  description: string;
}

interface LabDashboardDetailSourceInfo {
  key: LabDashboardSectionKey;
  label: string;
  source: LabDashboardSectionSource;
  generatedAt: string;
  dataDate?: string;
  error?: string;

  // legacy fallback, still kept during rollout
  calculationNotes: string[];

  // new structured provenance
  summary?: string;
  displayedRowCount?: number;
  datasets?: LabDashboardDetailDatasetInfo[];
  pipeline?: LabDashboardDetailPipelineStep[];
  focusReason?: string;
  metricExplanation?: LabDashboardDetailMetricExplanation[];
}
```

Notes:

- `calculationNotes` stays for backward compatibility and rollout safety.
- `displayedRowCount` must equal the number of rows currently shown in `Danh sách chi tiết`.
- `datasets`, `pipeline`, `focusReason`, and `metricExplanation` are primary fields for the new UI.
- All strings should be operator-friendly Vietnamese labels first.

## Provenance Semantics

### 1. `summary`

One or two sentences that explain the origin of the current detail list in plain language.

Example for `queue/waiting`:

- `Danh sách này lấy từ các hồ sơ xét nghiệm gốc của ngày đang xem, sau đó chỉ giữ các hồ sơ chưa có mốc xử lý và chưa có kết quả cuối.`

### 2. `datasets`

List the human-readable data sources participating in the final result.

Examples:

- `Hồ sơ xét nghiệm gốc`
- `Kết quả xét nghiệm con`
- `Mã bệnh nhân để hiển thị`
- `Snapshot tồn kho khoa xét nghiệm mới nhất`

Each dataset includes:

- `label`: human-readable source name
- `role`: why it is needed in the final result

### 3. `pipeline`

Ordered funnel steps that explain how the final list was derived.

Each step includes:

- `label`: human-readable step name
- `ruleSummary`: filtering or transformation rule
- `inputCount`: rows entering the step
- `outputCount`: rows leaving the step

This is the core provenance view. It answers:

- where rows were removed
- which rule removed them
- how the final row count was reached

### 4. `focusReason`

One explicit explanation of why the currently visible rows are correct for the current `section + focus`.

This is separate from the pipeline because operators often need a short final answer:

- `Vì sao tôi đang nhìn đúng danh sách này?`

### 5. `metricExplanation`

One or more human-readable items that explain how the current KPI/focus is computed.

Examples:

- `Tổng TAT = thời điểm trả kết quả trừ thời điểm tiếp nhận`
- `Focus Chờ lấy mẫu chỉ giữ hồ sơ chưa có mốc xử lý và chưa có kết quả`
- `Focus Glucose chỉ giữ các dòng snapshot đã được rule match vào nhóm reagent Glucose`

## Section-by-Section Provenance Mapping

### Queue

`summary`

- `Danh sách này lấy từ các hồ sơ xét nghiệm gốc của ngày được chọn.`

`datasets`

- `Hồ sơ xét nghiệm gốc`
- `Mã bệnh nhân`
- `Mốc xử lý`
- `Mốc trả kết quả`

`pipeline`

- `Tập hồ sơ gốc trong ngày`
- `Giữ hồ sơ có thời điểm tiếp nhận hợp lệ`
- `Bổ sung mã bệnh nhân để hiển thị`
- `Suy ra trạng thái hồ sơ`
- `Lọc theo focus hiện tại`

`metricExplanation`

- `Chờ lấy mẫu = chưa có mốc xử lý và chưa có kết quả`
- `Đang xử lý = đã có mốc xử lý nhưng chưa có kết quả`
- `Hoàn thành = đã có kết quả cuối`

`focusReason`

- For `waiting`: final rows are only the orders with no processing marker and no final result.
- For `processing`: final rows are only the orders with a processing marker but no final result.
- For `completed`: final rows are only the orders with a valid final result.

### TAT

`summary`

- `Danh sách này lấy từ các hồ sơ xét nghiệm đã hoàn thành để đối soát thời gian xử lý và trả kết quả.`

`datasets`

- `Hồ sơ xét nghiệm gốc`
- `Mốc tiếp nhận`
- `Mốc xử lý`
- `Mốc trả kết quả`

`pipeline`

- `Tập hồ sơ gốc trong ngày`
- `Giữ hồ sơ có tiếp nhận hợp lệ`
- `Giữ hồ sơ đã có kết quả cuối`
- `Tính các khoảng thời gian`
- `Lọc theo focus hiện tại`
- `Sắp xếp theo metric đang xem`

`metricExplanation`

- `Tổng TAT = trả kết quả - tiếp nhận`
- `Tiếp nhận → xử lý = xử lý - tiếp nhận`
- `Xử lý → trả KQ = trả kết quả - xử lý`
- For `type:*`: only rows of that subgroup remain before sorting

`focusReason`

- For `average` and `median`: list remains all completed rows and is sorted by total TAT descending
- For `requested_to_processing`: list remains all completed rows and is sorted by requested-to-processing descending
- For `processing_to_result`: list remains all completed rows and is sorted by processing-to-result descending
- For `type:*`: list remains only completed rows of the selected subgroup

### Abnormal

`summary`

- `Danh sách này lấy từ các kết quả xét nghiệm trong ngày có cờ ngoài khoảng tham chiếu.`

`datasets`

- `Kết quả xét nghiệm trong ngày`
- `Mã bệnh nhân`
- `Khoảng tham chiếu`
- `Cờ bất thường`

`pipeline`

- `Tập kết quả trong ngày`
- `Giữ kết quả có giá trị đo`
- `Giữ kết quả có cờ bất thường`
- `Bổ sung khoảng tham chiếu và mã bệnh nhân`
- `Suy ra mức độ cảnh báo`

`metricExplanation`

- `Bất thường = kết quả có cờ ngoài khoảng tham chiếu`
- `Mức độ cảnh báo được suy từ cờ bất thường và khoảng tham chiếu nếu có`

`focusReason`

- Because `abnormal` currently has only `all`, the final rows are the entire abnormal result set after filtering.

### Reagents

`summary`

- `Danh sách này lấy từ snapshot tồn kho mới nhất của khoa xét nghiệm.`

`datasets`

- `Snapshot tồn kho mới nhất`
- `Kho xét nghiệm`
- `Rule match reagent`

`pipeline`

- `Tập snapshot mới nhất`
- `Giữ dòng có tồn lớn hơn 0`
- `Giữ dòng thuộc kho xét nghiệm`
- `So khớp dòng với nhóm reagent`
- `Claim mỗi dòng vào một nhóm reagent`
- `Lọc theo focus hiện tại`

`metricExplanation`

- `Focus Toàn bộ giữ tất cả các dòng snapshot đang đóng góp vào các KPI reagent`
- `Focus một reagent chỉ giữ các dòng đã match vào reagent đó`

`focusReason`

- For `all`: final rows are every claimed snapshot line contributing to the reagent summary
- For `reagent:*`: final rows are only the lines claimed into the selected reagent bucket

## Bridge Implementation Notes

The bridge should compute provenance from the same arrays and filters already used to derive the detail rows.

### Queue / TAT

Use the shared timeline dataset already built for detail rows.

Recommended provenance counting strategy:

- start from raw timeline candidates for the day
- count rows after each filter/derivation step
- count rows after focus-specific filtering
- set `displayedRowCount` from the final detail row array length

### Abnormal

Use the same abnormal result rows already fetched for detail mode.

Recommended provenance counting strategy:

- total results in day
- after non-empty value filter
- after abnormal-flag filter
- after final severity derivation

### Reagents

Use the snapshot rows already fetched for reagent summary/detail.

Recommended provenance counting strategy:

- latest snapshot rows
- after `current_stock > 0`
- after lab warehouse scoping
- after reagent keyword matching
- after claim into the selected reagent bucket or `all`

## Portal UI Design

Replace the current plain note list in `Nguồn dữ liệu` with a structured read order:

### Block 1: Source Summary

- main label
- source system
- data date
- payload generated time
- displayed row count
- summary paragraph

### Block 2: Data Funnel

Render `pipeline` as an ordered step list.

Each step shows:

- step label
- short rule summary
- `inputCount -> outputCount`

This block is the primary operator-facing provenance artifact.

### Block 3: Why This Focus Produces These Rows

Render `focusReason` as a dedicated card.

This answers the operator’s quick verification question directly.

### Block 4: How The Current Metric Works

Render `metricExplanation[]` as bullet items or short cards.

This explains the KPI/focus without exposing raw schema names by default.

### Block 5: Participating Sources

Render `datasets[]` as a simple list of:

- dataset label
- role in the final output

### Error Handling

If `error` exists:

- still render summary and source metadata
- still render any pipeline steps that were computed
- show the error as a clearly marked failure state in the same source card

## Rollout and Compatibility

This should be additive across bridge and portal:

- bridge starts returning the new provenance fields
- portal prefers the new structured fields when present
- portal falls back to `calculationNotes` when the new fields are absent

This avoids a hard deployment dependency between portal and bridge.

## Testing Strategy

### Bridge

Add tests for `/lab-dashboard/details` payloads so that:

- `sourceDetails[0].summary` exists and is human-readable
- `datasets` are present for each section
- `pipeline` contains ordered steps with real counts
- `displayedRowCount` equals `rows.length`
- `focusReason` changes correctly by focus
- `patientName` still never appears anywhere in the detail payload

### Portal

Add tests for the source-tab renderer so that:

- structured provenance renders the summary, funnel, focus reason, metric explanation, and datasets
- fallback to legacy `calculationNotes` still works
- error state still preserves provenance blocks

### Verification

- `cmd /c npm --prefix fdc-lan-bridge test`
- `cmd /c npm --prefix fdc-lan-bridge run build`
- `cmd /c npm run build`
- manual smoke on `/lab-dashboard/tv`:
  - open queue, tat, abnormal, and reagent detail
  - verify funnel counts render
  - verify focus reason matches the opened focus
  - verify labels are operator-friendly
  - compare summary layout against `to be intergrate/lab-dashboard.html`

## Risks

- Provenance counts can drift from the displayed rows if the bridge builds funnel steps from a slightly different filter path than the actual detail array builder.
- Reagent provenance is especially sensitive because claim order affects which rows contribute to which reagent.
- TAT provenance can become misleading if sort logic and filter logic are explained together but computed in different places.

## Recommendation

Implement this as an additive contract extension on `sourceDetails`, with provenance computed in the bridge and rendered by the portal.

This is the smallest design that meets the user need for very detailed, trustworthy, easy-to-read source tracking without introducing a separate provenance endpoint or per-row trace complexity.
