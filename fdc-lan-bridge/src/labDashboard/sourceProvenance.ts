/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  LabDashboardAbnormalDetailRow,
  LabDashboardAbnormalFocus,
  LabDashboardDetailDatasetInfo,
  LabDashboardDetailMetricExplanation,
  LabDashboardDetailPipelineStep,
  LabDashboardDetailSourceInfo,
  LabDashboardQueueDetailRow,
  LabDashboardQueueFocus,
  LabDashboardReagentDetailRow,
  LabDashboardReagentFocus,
  LabDashboardSectionSource,
  LabDashboardTatDetailRow,
  LabDashboardTatFocus,
  LabDashboardTimelineProvenanceRow,
} from "./types";

interface BaseSourceInfoInput {
  generatedAt: string;
  dataDate?: string;
  error?: string;
}

interface QueueSourceProvenanceInput extends BaseSourceInfoInput {
  asOfDate: string;
  focus: LabDashboardQueueFocus;
  timelineRows: LabDashboardTimelineProvenanceRow[];
  displayedRows: LabDashboardQueueDetailRow[];
}

interface TatSourceProvenanceInput extends BaseSourceInfoInput {
  asOfDate: string;
  focus: LabDashboardTatFocus;
  timelineRows: LabDashboardTimelineProvenanceRow[];
  displayedRows: LabDashboardTatDetailRow[];
}

interface AbnormalSourceProvenanceInput extends BaseSourceInfoInput {
  asOfDate: string;
  focus: LabDashboardAbnormalFocus;
  abnormalRows: LabDashboardAbnormalDetailRow[];
  displayedRows: LabDashboardAbnormalDetailRow[];
}

export interface LabDashboardReagentSnapshotSourceRow {
  sourceName: string;
  medicineCode?: string | null;
  warehouse?: string | null;
  currentStock: number;
  snapshotDate: string;
}

interface ReagentSourceProvenanceInput extends BaseSourceInfoInput {
  snapshotDate: string;
  focus: LabDashboardReagentFocus;
  positiveSnapshotRows: LabDashboardReagentSnapshotSourceRow[];
  labScopedRows: LabDashboardReagentSnapshotSourceRow[];
  matchedRows: LabDashboardReagentSnapshotSourceRow[];
  claimedRows: LabDashboardReagentDetailRow[];
  displayedRows: LabDashboardReagentDetailRow[];
  claimOrder: string[];
}

function buildPipelineStep(
  key: string,
  label: string,
  ruleSummary: string,
  inputCount: number,
  outputCount: number,
): LabDashboardDetailPipelineStep {
  return {
    key,
    label,
    ruleSummary,
    inputCount,
    outputCount,
  };
}

function buildSourceInfoBase(
  key: LabDashboardDetailSourceInfo["key"],
  label: string,
  source: LabDashboardSectionSource,
  generatedAt: string,
  dataDate: string | undefined,
  error: string | undefined,
): Pick<LabDashboardDetailSourceInfo, "key" | "label" | "source" | "generatedAt" | "dataDate" | "error"> {
  return {
    key,
    label,
    source,
    generatedAt,
    dataDate,
    error,
  };
}

function formatFocusLabel(focus: LabDashboardQueueFocus): string {
  if (focus === "waiting") {
    return "Chờ lấy mẫu";
  }
  if (focus === "processing") {
    return "Đang xử lý";
  }
  return "Đã hoàn thành";
}

function normalizeLabelFromSlug(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getTatFocusStep(
  focus: LabDashboardTatFocus,
  displayedRows: LabDashboardTatDetailRow[],
  metricReadyRows: LabDashboardTimelineProvenanceRow[],
): {
  step: LabDashboardDetailPipelineStep;
  focusReason: string;
  metricExplanation: LabDashboardDetailMetricExplanation[];
  note: string;
} {
  if (focus === "requested_to_processing") {
    return {
      step: buildPipelineStep(
        "focus_requested_to_processing",
        "Giữ hồ sơ theo mục Tiếp nhận → xử lý",
        "Chỉ giữ các hồ sơ hoàn thành có đủ mốc tiếp nhận và mốc bắt đầu xử lý hợp lệ.",
        metricReadyRows.length,
        displayedRows.length,
      ),
      focusReason:
        "Mục Tiếp nhận → xử lý chỉ giữ các hồ sơ hoàn thành có đủ hai mốc thời gian để đối soát thời gian từ lúc tiếp nhận đến lúc bắt đầu xử lý.",
      metricExplanation: [
        {
          label: "Thời gian tiếp nhận → xử lý",
          description: "Thời gian này được tính bằng thời điểm bắt đầu xử lý trừ thời điểm tiếp nhận.",
        },
      ],
      note: "Thời gian tiếp nhận → xử lý được tính bằng lúc bắt đầu xử lý trừ lúc tiếp nhận.",
    };
  }

  if (focus === "processing_to_result") {
    return {
      step: buildPipelineStep(
        "focus_processing_to_result",
        "Giữ hồ sơ theo mục Xử lý → trả kết quả",
        "Chỉ giữ các hồ sơ hoàn thành có đủ mốc bắt đầu xử lý và mốc trả kết quả hợp lệ.",
        metricReadyRows.length,
        displayedRows.length,
      ),
      focusReason:
        "Mục Xử lý → trả kết quả chỉ giữ các hồ sơ hoàn thành có đủ mốc bắt đầu xử lý và mốc trả kết quả, sau đó sắp theo thời gian chờ trả kết quả dài nhất.",
      metricExplanation: [
        {
          label: "Thời gian xử lý → trả kết quả",
          description: "Thời gian này được tính bằng thời điểm trả kết quả trừ thời điểm bắt đầu xử lý.",
        },
      ],
      note: "Thời gian xử lý → trả kết quả được tính bằng lúc trả kết quả trừ lúc bắt đầu xử lý.",
    };
  }

  if (focus.startsWith("type:")) {
    const subgroupName = displayedRows[0]?.subgroupName || normalizeLabelFromSlug(focus.slice("type:".length));
    return {
      step: buildPipelineStep(
        "focus_type",
        `Lọc theo nhóm ${subgroupName}`,
        `Chỉ giữ các hồ sơ hoàn thành thuộc nhóm xét nghiệm ${subgroupName}.`,
        metricReadyRows.length,
        displayedRows.length,
      ),
      focusReason: `Mục nhóm ${subgroupName} chỉ giữ các hồ sơ hoàn thành thuộc đúng nhóm xét nghiệm này, nên danh sách cuối cùng chỉ còn các dòng của ${subgroupName}.`,
      metricExplanation: [
        {
          label: "Lọc theo nhóm xét nghiệm",
          description: `Chỉ các hồ sơ hoàn thành thuộc nhóm ${subgroupName} mới được giữ lại trước khi sắp thứ tự hiển thị.`,
        },
      ],
      note: `Mục nhóm chỉ giữ lại các hồ sơ thuộc nhóm xét nghiệm ${subgroupName}.`,
    };
  }

  const metricLabel = focus === "median" ? "TAT trung vị" : "TAT tổng";
  const focusKey = focus === "median" ? "focus_median" : "focus_average";
  return {
    step: buildPipelineStep(
      focusKey,
      `Giữ danh sách ${metricLabel}`,
      "Giữ toàn bộ hồ sơ hoàn thành có tổng TAT hợp lệ rồi sắp theo tổng TAT giảm dần để phục vụ đối soát.",
      metricReadyRows.length,
      displayedRows.length,
    ),
    focusReason:
      "Mục này giữ toàn bộ hồ sơ hoàn thành có tổng TAT hợp lệ và sắp các hồ sơ có thời gian dài hơn lên trước để hỗ trợ đối soát.",
    metricExplanation: [
      {
        label: "Tổng TAT",
        description: "Tổng TAT được tính bằng thời điểm trả kết quả trừ thời điểm tiếp nhận.",
      },
    ],
    note: "Tổng TAT được tính bằng lúc trả kết quả trừ lúc tiếp nhận; danh sách được sắp theo chỉ số đang xem từ cao xuống thấp.",
  };
}

export function buildQueueSourceProvenance(input: QueueSourceProvenanceInput): LabDashboardDetailSourceInfo {
  const validRequestedRows = input.timelineRows.filter((row) => Boolean(row.requestedAt));
  const patientCodeRows = validRequestedRows.filter((row) => Boolean(row.patientCode));
  const stageRows = patientCodeRows;
  const focusKey = `focus_${input.focus}`;
  const focusLabel = formatFocusLabel(input.focus);
  const focusRuleSummary =
    input.focus === "waiting"
      ? "Chỉ giữ các hồ sơ chưa có mốc xử lý và chưa có kết quả cuối."
      : input.focus === "processing"
        ? "Chỉ giữ các hồ sơ đã có mốc xử lý nhưng chưa có kết quả cuối."
        : "Chỉ giữ các hồ sơ đã có kết quả cuối hợp lệ trong ngày đang xem.";
  const focusReason =
    input.focus === "waiting"
      ? `Mục ${focusLabel} chỉ giữ các hồ sơ chưa có mốc xử lý và chưa có kết quả cuối, nên ${input.displayedRows.length} dòng cuối cùng chính là danh sách đang hiển thị.`
      : input.focus === "processing"
        ? `Mục ${focusLabel} chỉ giữ các hồ sơ đã có mốc xử lý nhưng chưa có kết quả cuối, nên danh sách hiển thị chỉ còn các hồ sơ đang xử lý.`
        : `Mục ${focusLabel} chỉ giữ các hồ sơ đã có kết quả cuối hợp lệ, nên danh sách hiển thị chỉ còn các hồ sơ đã hoàn thành trong ngày.`;

  return {
    ...buildSourceInfoBase("queue", "Hàng chờ xét nghiệm", "his", input.generatedAt, input.asOfDate, input.error),
    calculationNotes: [
      "Nguồn HIS: hồ sơ xét nghiệm gốc trong ngày đang xem.",
      input.focus === "waiting"
        ? "Mục Chờ lấy mẫu = chưa có mốc xử lý hợp lệ và chưa có mốc trả kết quả hợp lệ."
        : input.focus === "processing"
          ? "Mục Đang xử lý = đã có mốc xử lý hợp lệ nhưng chưa có mốc trả kết quả hợp lệ."
          : "Mục Đã hoàn thành = đã có mốc trả kết quả hợp lệ, vẫn bám theo ngày tiếp nhận của ngày dữ liệu.",
    ],
    summary: `Danh sách này lấy từ các hồ sơ xét nghiệm gốc của ngày ${input.asOfDate}, sau đó chỉ giữ các hồ sơ phù hợp với mục ${focusLabel.toLowerCase()}.`,
    displayedRowCount: input.displayedRows.length,
    datasets: [
      {
        key: "lab_root_orders",
        label: "Hồ sơ xét nghiệm gốc",
        role: "Làm tập hồ sơ đầu vào cho danh sách hàng chờ xét nghiệm.",
      },
      {
        key: "patient_codes",
        label: "Mã bệnh nhân",
        role: "Bổ sung mã bệnh nhân để hiển thị trong danh sách chi tiết.",
      },
      {
        key: "processing_timestamps",
        label: "Mốc xử lý",
        role: "Cho biết hồ sơ đã bắt đầu xử lý hay vẫn đang chờ lấy mẫu.",
      },
      {
        key: "result_timestamps",
        label: "Mốc trả kết quả",
        role: "Cho biết hồ sơ đã hoàn thành hay vẫn còn nằm trong hàng chờ.",
      },
    ],
    pipeline: [
      buildPipelineStep(
        "raw_day_orders",
        "Tập hồ sơ gốc trong ngày",
        "Lấy các hồ sơ xét nghiệm gốc có ngày tiếp nhận thuộc ngày đang xem.",
        input.timelineRows.length,
        input.timelineRows.length,
      ),
      buildPipelineStep(
        "valid_requested_at",
        "Giữ hồ sơ có thời điểm tiếp nhận hợp lệ",
        "Loại các hồ sơ thiếu thời điểm tiếp nhận hợp lệ trước khi đối soát hàng chờ.",
        input.timelineRows.length,
        validRequestedRows.length,
      ),
      buildPipelineStep(
        "attach_patient_codes",
        "Bổ sung mã bệnh nhân để hiển thị",
        "Giữ các hồ sơ còn đủ mã bệnh nhân để hiển thị ở danh sách chi tiết.",
        validRequestedRows.length,
        patientCodeRows.length,
      ),
      buildPipelineStep(
        "derive_stage",
        "Suy ra trạng thái hồ sơ",
        "Xác định hồ sơ đang chờ, đang xử lý hay đã hoàn thành từ các mốc thời gian hiện có.",
        patientCodeRows.length,
        stageRows.length,
      ),
      buildPipelineStep(focusKey, `Lọc theo mục ${focusLabel}`, focusRuleSummary, stageRows.length, input.displayedRows.length),
    ],
    focusReason,
    metricExplanation: [
      {
        label: "Chờ lấy mẫu",
        description: "Hồ sơ chưa có mốc xử lý và chưa có kết quả cuối.",
      },
      {
        label: "Đang xử lý",
        description: "Hồ sơ đã có mốc xử lý nhưng chưa có kết quả cuối.",
      },
      {
        label: "Đã hoàn thành",
        description: "Hồ sơ đã có kết quả cuối hợp lệ.",
      },
    ],
  };
}

export function buildTatSourceProvenance(input: TatSourceProvenanceInput): LabDashboardDetailSourceInfo {
  const validRequestedRows = input.timelineRows.filter((row) => Boolean(row.requestedAt));
  const completedRows = validRequestedRows.filter(
    (row) => row.stage === "completed" && row.totalMinutes !== null,
  );
  const metricReadyRows = completedRows.filter((row) => {
    if (input.focus === "requested_to_processing") {
      return row.requestedToProcessingMinutes !== null;
    }
    if (input.focus === "processing_to_result") {
      return row.processingToResultMinutes !== null;
    }
    return true;
  });
  const tatFocus = getTatFocusStep(input.focus, input.displayedRows, metricReadyRows);

  return {
    ...buildSourceInfoBase("tat", "TAT xét nghiệm", "his", input.generatedAt, input.asOfDate, input.error),
    calculationNotes: [
        "Nguồn HIS: dùng cùng tập hồ sơ gốc như phần tổng hợp TAT, chỉ lấy các hồ sơ đã có mốc trả kết quả hợp lệ.",
      tatFocus.note,
    ],
    summary: `Danh sách này lấy từ các hồ sơ xét nghiệm đã hoàn thành trong ngày ${input.asOfDate} để đối soát thời gian xử lý và trả kết quả.`,
    displayedRowCount: input.displayedRows.length,
    datasets: [
      {
        key: "lab_root_orders",
        label: "Hồ sơ xét nghiệm gốc",
        role: "Là tập hồ sơ đầu vào để tính các mốc thời gian TAT.",
      },
      {
        key: "requested_timestamps",
        label: "Mốc tiếp nhận",
        role: "Làm mốc đầu cho các phép tính TAT.",
      },
      {
        key: "processing_timestamps",
        label: "Mốc xử lý",
        role: "Làm mốc giữa để tách thời gian chờ xử lý và thời gian trả kết quả.",
      },
      {
        key: "result_timestamps",
        label: "Mốc trả kết quả",
        role: "Làm mốc cuối để xác định hồ sơ đã hoàn thành và tính TAT.",
      },
    ],
    pipeline: [
      buildPipelineStep(
        "raw_day_orders",
        "Tập hồ sơ gốc trong ngày",
        "Lấy các hồ sơ xét nghiệm gốc có ngày tiếp nhận thuộc ngày đang xem.",
        input.timelineRows.length,
        input.timelineRows.length,
      ),
      buildPipelineStep(
        "valid_requested_at",
        "Giữ hồ sơ có thời điểm tiếp nhận hợp lệ",
        "Loại các hồ sơ thiếu thời điểm tiếp nhận hợp lệ trước khi tính TAT.",
        input.timelineRows.length,
        validRequestedRows.length,
      ),
      buildPipelineStep(
        "completed_orders",
        "Giữ hồ sơ đã hoàn thành",
        "Chỉ giữ các hồ sơ đã có kết quả cuối và có tổng TAT hợp lệ.",
        validRequestedRows.length,
        completedRows.length,
      ),
      buildPipelineStep(
        "metric_ready_rows",
        "Giữ hồ sơ đủ mốc cho chỉ số đang xem",
        "Loại các hồ sơ thiếu mốc thời gian cần thiết cho chỉ số hoặc mục hiện tại.",
        completedRows.length,
        metricReadyRows.length,
      ),
      tatFocus.step,
    ],
    focusReason: tatFocus.focusReason,
    metricExplanation: tatFocus.metricExplanation,
  };
}

export function buildAbnormalSourceProvenance(
  input: AbnormalSourceProvenanceInput,
): LabDashboardDetailSourceInfo {
  return {
    ...buildSourceInfoBase(
      "abnormal",
      "Kết quả bất thường",
      "his",
      input.generatedAt,
      input.asOfDate,
      input.error,
    ),
    calculationNotes: [
      "Nguồn HIS: kết quả xét nghiệm có data_date trong ngày, có data_value và có cờ bất thường.",
      "Mức độ nghiêm trọng được suy ra từ abnormal_flag kết hợp giá trị số và khoảng tham chiếu nếu có.",
    ],
    summary: `Danh sách này lấy từ các kết quả xét nghiệm trong ngày ${input.asOfDate} có cờ nằm ngoài khoảng tham chiếu.`,
    displayedRowCount: input.displayedRows.length,
    datasets: [
      {
        key: "lab_results",
        label: "Kết quả xét nghiệm trong ngày",
        role: "Là tập kết quả đầu vào để phát hiện các dòng bất thường.",
      },
      {
        key: "reference_ranges",
        label: "Khoảng tham chiếu",
        role: "Giúp diễn giải mức độ lệch của kết quả khi có dữ liệu tham chiếu.",
      },
      {
        key: "abnormal_flags",
        label: "Cờ bất thường",
        role: "Cho biết kết quả đang vượt ngưỡng cao hay thấp trước khi suy ra mức độ cảnh báo.",
      },
    ],
    pipeline: [
      buildPipelineStep(
        "abnormal_results",
        "Tập kết quả bất thường",
        "Giữ các kết quả trong ngày đã có giá trị đo và có cờ bất thường hợp lệ.",
        input.abnormalRows.length,
        input.abnormalRows.length,
      ),
      buildPipelineStep(
        "derive_severity",
        "Suy ra mức độ cảnh báo",
        "Quy đổi từng kết quả thành mức cao, thấp hoặc nguy kịch để ưu tiên đối soát.",
        input.abnormalRows.length,
        input.abnormalRows.length,
      ),
      buildPipelineStep(
        "focus_all",
        "Giữ toàn bộ kết quả bất thường",
        "Phần bất thường hiện chỉ có mục xem toàn bộ nên toàn bộ tập kết quả bất thường được giữ lại.",
        input.abnormalRows.length,
        input.displayedRows.length,
      ),
    ],
    focusReason:
      "Mục xem toàn bộ của phần bất thường giữ toàn bộ kết quả bất thường sau khi đã suy ra mức độ cảnh báo, nên danh sách hiện tại chính là toàn bộ kết quả bất thường trong ngày.",
    metricExplanation: [
      {
        label: "Mức độ cảnh báo",
        description: "Mỗi kết quả được diễn giải thành mức cao, thấp hoặc nguy kịch để người vận hành ưu tiên theo dõi.",
      },
    ],
  };
}

export function buildReagentSourceProvenance(
  input: ReagentSourceProvenanceInput,
): LabDashboardDetailSourceInfo {
  const focusName =
    input.focus === "all"
      ? "Toàn bộ"
      : input.displayedRows[0]?.reagentName || normalizeLabelFromSlug(input.focus.slice("reagent:".length));
  const focusKey = input.focus === "all" ? "focus_all" : "focus_reagent";
  const focusLabel = input.focus === "all" ? "Giữ toàn bộ dòng đã gán" : `Lọc theo nhóm hóa chất ${focusName}`;
  const claimOrderText = input.claimOrder.map((key) => normalizeLabelFromSlug(key)).join(", ");

  return {
    ...buildSourceInfoBase(
      "reagents",
      "Tồn kho khoa xét nghiệm",
      "supabase",
      input.generatedAt,
      input.snapshotDate,
      input.error,
    ),
    calculationNotes: [
      "Nguồn Supabase: dữ liệu tồn kho của ngày chụp mới nhất, chỉ lấy các dòng thuộc kho xét nghiệm.",
      "Mỗi dòng chỉ được gán cho một nhóm hóa chất theo thứ tự cấu hình hiện tại để số chi tiết khớp với phần tổng hợp.",
      input.focus === "all"
        ? "Chế độ này hiển thị toàn bộ các dòng tồn kho đang đóng góp vào các chỉ số tồn kho hóa chất."
        : "Mục này chỉ giữ lại các dòng tồn kho đã được gán vào nhóm hóa chất được chọn.",
    ],
    summary: `Danh sách này lấy từ dữ liệu tồn kho ngày ${input.snapshotDate} của khoa xét nghiệm, sau đó gán từng dòng vào đúng nhóm hóa chất theo thứ tự cấu hình hiện tại.`,
    displayedRowCount: input.displayedRows.length,
    datasets: [
      {
        key: "inventory_snapshot",
        label: "Dữ liệu tồn kho mới nhất",
        role: "Cung cấp tập dòng tồn kho đầu vào cho phần tồn kho khoa xét nghiệm.",
      },
      {
        key: "lab_warehouse",
        label: "Kho khoa xét nghiệm",
        role: "Giới hạn phạm vi chỉ còn các dòng thuộc kho của khoa xét nghiệm.",
      },
      {
        key: "reagent_claim_rules",
        label: "Quy tắc gán nhóm hóa chất",
        role: "Gán mỗi dòng tồn kho vào nhóm hóa chất đầu tiên phù hợp theo thứ tự cấu hình hiện tại.",
      },
    ],
    pipeline: [
      buildPipelineStep(
        "positive_stock_snapshot",
        "Tập dòng tồn còn dương",
        "Giữ các dòng tồn kho có số lượng lớn hơn 0 ở ngày chụp mới nhất.",
        input.positiveSnapshotRows.length,
        input.positiveSnapshotRows.length,
      ),
      buildPipelineStep(
        "lab_warehouse_scope",
        "Giữ dòng thuộc kho xét nghiệm",
        "Chỉ giữ các dòng tồn kho thuộc kho của khoa xét nghiệm.",
        input.positiveSnapshotRows.length,
        input.labScopedRows.length,
      ),
      buildPipelineStep(
        "reagent_keyword_match",
        "So khớp với bộ từ khóa hóa chất",
        "Giữ các dòng tồn kho có thể phù hợp với ít nhất một nhóm hóa chất đang theo dõi.",
        input.labScopedRows.length,
        input.matchedRows.length,
      ),
      buildPipelineStep(
        "claim_first_match",
        "Gán theo thứ tự phù hợp đầu tiên",
        `Mỗi dòng được gán cho nhóm hóa chất đầu tiên phù hợp theo thứ tự cấu hình hiện tại: ${claimOrderText}.`,
        input.matchedRows.length,
        input.claimedRows.length,
      ),
      buildPipelineStep(
        focusKey,
        focusLabel,
        input.focus === "all"
          ? "Giữ toàn bộ các dòng tồn kho đã được gán vào các nhóm hóa chất đang theo dõi."
          : `Chỉ giữ các dòng tồn kho đã được gán vào nhóm hóa chất ${focusName}.`,
        input.claimedRows.length,
        input.displayedRows.length,
      ),
    ],
    focusReason:
      input.focus === "all"
        ? "Mục xem toàn bộ giữ toàn bộ các dòng tồn kho đã được gán vào các nhóm hóa chất đang theo dõi, nên danh sách hiện tại là toàn bộ các dòng tồn kho đã được gán."
        : `Mục ${focusName} chỉ giữ các dòng tồn kho đã được gán vào nhóm hóa chất ${focusName}, nên danh sách hiện tại chỉ còn các dòng đóng góp cho ${focusName}.`,
    metricExplanation: [
      {
        label: "Thứ tự gán nhóm hóa chất",
        description:
          "Nếu một dòng tồn kho phù hợp với nhiều nhóm hóa chất, dòng phù hợp trước sẽ được giữ cho nhóm đó theo thứ tự cấu hình hiện tại.",
      },
      {
        label: "Hiển thị theo mục đang xem",
        description:
          input.focus === "all"
            ? "Mục Toàn bộ giữ tất cả các dòng tồn kho đã được gán vào các chỉ số tồn kho hóa chất."
            : `Mục ${focusName} chỉ giữ các dòng đã được gán vào nhóm hóa chất ${focusName}.`,
      },
    ],
  };
}
