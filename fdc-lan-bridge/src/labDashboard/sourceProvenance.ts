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

export interface QueueSourceProvenanceInput extends BaseSourceInfoInput {
  asOfDate: string;
  focus: LabDashboardQueueFocus;
  timelineRows: LabDashboardTimelineProvenanceRow[];
  displayedRows: LabDashboardQueueDetailRow[];
}

export interface TatSourceProvenanceInput extends BaseSourceInfoInput {
  asOfDate: string;
  focus: LabDashboardTatFocus;
  timelineRows: LabDashboardTimelineProvenanceRow[];
  displayedRows: LabDashboardTatDetailRow[];
  focusDisplayLabel?: string;
}

export interface AbnormalSourceProvenanceInput extends BaseSourceInfoInput {
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

export interface ReagentSourceProvenanceInput extends BaseSourceInfoInput {
  snapshotDate: string;
  focus: LabDashboardReagentFocus;
  positiveSnapshotRows: LabDashboardReagentSnapshotSourceRow[];
  labScopedRows: LabDashboardReagentSnapshotSourceRow[];
  matchedRows: LabDashboardReagentSnapshotSourceRow[];
  claimedRows: LabDashboardReagentDetailRow[];
  displayedRows: LabDashboardReagentDetailRow[];
  claimOrder: string[];
  focusDisplayLabel?: string;
  claimOrderDisplayLabels?: string[];
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

function resolveTatDisplayLabel(
  focus: LabDashboardTatFocus,
  displayedRows: LabDashboardTatDetailRow[],
  focusDisplayLabel?: string,
): string {
  if (!focus.startsWith("type:")) {
    return focusDisplayLabel || "";
  }

  return displayedRows[0]?.subgroupName || focusDisplayLabel || normalizeLabelFromSlug(focus.slice("type:".length));
}

function resolveReagentDisplayLabel(
  focus: LabDashboardReagentFocus,
  displayedRows: LabDashboardReagentDetailRow[],
  focusDisplayLabel?: string,
): string {
  if (focus === "all") {
    return focusDisplayLabel || "Toàn bộ";
  }

  return displayedRows[0]?.reagentName || focusDisplayLabel || normalizeLabelFromSlug(focus.slice("reagent:".length));
}

function resolveClaimOrderLabels(claimOrder: string[], claimOrderDisplayLabels?: string[]): string[] {
  if (claimOrderDisplayLabels && claimOrderDisplayLabels.length === claimOrder.length) {
    return claimOrderDisplayLabels;
  }

  return claimOrder.map((key) => normalizeLabelFromSlug(key));
}

function getTatFocusStep(
  focus: LabDashboardTatFocus,
  displayedRows: LabDashboardTatDetailRow[],
  metricReadyRows: LabDashboardTimelineProvenanceRow[],
  focusDisplayLabel?: string,
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
    const subgroupName = resolveTatDisplayLabel(focus, displayedRows, focusDisplayLabel);
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
  const patientCodeRows = validRequestedRows;
  const stageRows = patientCodeRows;
  const focusKey = `focus_${input.focus}`;
  const focusLabel = formatFocusLabel(input.focus);
  const focusRuleSummary =
    input.focus === "waiting"
      ? "Chỉ giữ các hồ sơ chưa có mốc xử lý và chưa có kết quả cuối; tập chờ này chỉ còn các patientrecord đã có tb_treatment.isthutien = 1."
      : input.focus === "processing"
        ? "Chỉ giữ các hồ sơ đã có tb_servicedata.order_date hợp lệ nhưng chưa có tb_servicedata.data_date hợp lệ."
        : "Chỉ giữ các hồ sơ đã có tb_servicedata.data_date hợp lệ trong ngày đang xem.";
  const focusReason =
    input.focus === "waiting"
      ? `Mục ${focusLabel} chỉ giữ các hồ sơ chưa có mốc xử lý và chưa có kết quả cuối; ở nhánh này queue chỉ giữ patientrecord đã có tb_treatment.isthutien = 1, nên ${input.displayedRows.length} dòng cuối cùng chính là danh sách đang hiển thị.`
      : input.focus === "processing"
        ? `Mục ${focusLabel} chỉ giữ các hồ sơ đã có mốc xử lý nhưng chưa có kết quả cuối, nên danh sách hiển thị chỉ còn các hồ sơ đang xử lý theo các mốc của tb_servicedata.`
        : `Mục ${focusLabel} chỉ giữ các hồ sơ đã có kết quả cuối hợp lệ, nên danh sách hiển thị chỉ còn các hồ sơ đã hoàn thành trong ngày theo tb_servicedata.data_date.`;

  return {
    ...buildSourceInfoBase("queue", "Hàng chờ xét nghiệm", "his", input.generatedAt, input.asOfDate, input.error),
    calculationNotes: [
      input.focus === "waiting"
        ? "Nguồn HIS: bắt đầu từ tb_servicedata theo ngày tiếp nhận, ghép tb_patientrecord và tb_patient để lấy mã bệnh nhân; riêng mục Chờ lấy mẫu chỉ giữ các patientrecord đã có EXISTS tb_treatment.isthutien = 1."
        : "Nguồn HIS: bắt đầu từ tb_servicedata theo ngày tiếp nhận, ghép tb_patientrecord và tb_patient để lấy mã bệnh nhân, rồi suy ra trạng thái từ các mốc nằm trên tb_servicedata.",
      input.focus === "waiting"
        ? "Mục Chờ lấy mẫu = tb_servicedata.order_date chưa hợp lệ, tb_servicedata.data_date chưa hợp lệ, nhưng cùng patientrecord đã có tb_treatment.isthutien = 1."
        : input.focus === "processing"
          ? "Mục Đang xử lý = đã có tb_servicedata.order_date hợp lệ nhưng chưa có tb_servicedata.data_date hợp lệ."
          : "Mục Đã hoàn thành = đã có tb_servicedata.data_date hợp lệ, vẫn bám theo tb_servicedata.servicedatausedate của ngày dữ liệu.",
    ],
    summary: `Danh sách này đi từ tb_servicedata là tập hồ sơ xét nghiệm gốc của ngày ${input.asOfDate}, ghép tb_patientrecord và tb_patient, sau đó chỉ giữ các hồ sơ phù hợp với mục ${focusLabel.toLowerCase()}.`,
    displayedRowCount: input.displayedRows.length,
    datasets: [
      {
        key: "lab_root_orders",
        label: "Hồ sơ xét nghiệm gốc",
        role: "tb_servicedata là tập hồ sơ đầu vào cho danh sách hàng chờ xét nghiệm.",
      },
      {
        key: "patient_codes",
        label: "Mã bệnh nhân",
        role: "Mã bệnh nhân được bổ sung qua tb_patientrecord và tb_patient để hiển thị trong danh sách chi tiết.",
      },
      {
        key: "processing_timestamps",
        label: "Mốc xử lý",
        role: "Mốc xử lý lấy từ tb_servicedata.order_date để biết hồ sơ đã bắt đầu xử lý hay vẫn đang chờ lấy mẫu.",
      },
      {
        key: "result_timestamps",
        label: "Mốc trả kết quả",
        role: "Mốc trả kết quả lấy từ tb_servicedata.data_date hoặc dòng con cùng gốc trong tb_servicedata để biết hồ sơ đã hoàn thành hay vẫn còn nằm trong hàng chờ.",
      },
    ],
    pipeline: [
      buildPipelineStep(
        "raw_day_orders",
        "Tập hồ sơ gốc trong ngày",
        "Lấy các hồ sơ xét nghiệm gốc từ tb_servicedata có tb_servicedata.servicedatausedate thuộc ngày đang xem.",
        input.timelineRows.length,
        input.timelineRows.length,
      ),
      buildPipelineStep(
        "valid_requested_at",
        "Giữ hồ sơ có thời điểm tiếp nhận hợp lệ",
        "Loại các hồ sơ thiếu tb_servicedata.servicedatausedate hợp lệ trước khi đối soát hàng chờ.",
        input.timelineRows.length,
        validRequestedRows.length,
      ),
      buildPipelineStep(
        "attach_patient_codes",
        "Bổ sung mã bệnh nhân để hiển thị",
        "Chuẩn hóa mã bệnh nhân qua tb_patientrecord và tb_patient để hiển thị; hồ sơ thiếu mã sẽ được thay bằng mã Ẩn danh thay vì bị loại khỏi danh sách.",
        validRequestedRows.length,
        patientCodeRows.length,
      ),
      buildPipelineStep(
        "derive_stage",
        "Suy ra trạng thái hồ sơ",
        "Xác định hồ sơ đang chờ, đang xử lý hay đã hoàn thành từ tb_servicedata.order_date và tb_servicedata.data_date.",
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
  const tatFocus = getTatFocusStep(input.focus, input.displayedRows, metricReadyRows, input.focusDisplayLabel);

  return {
    ...buildSourceInfoBase("tat", "TAT xét nghiệm", "his", input.generatedAt, input.asOfDate, input.error),
    calculationNotes: [
      "Nguồn HIS: dùng tb_servicedata làm tập hồ sơ gốc, ghép tb_patientrecord và tb_patient để hiển thị patientcode, rồi chỉ giữ các hồ sơ đã có tb_servicedata.data_date hợp lệ.",
      tatFocus.note,
    ],
    summary: `Danh sách này đi từ tb_servicedata trong ngày ${input.asOfDate}, ghép tb_patientrecord và tb_patient, rồi chỉ giữ các hồ sơ đã hoàn thành để đối soát thời gian xử lý và trả kết quả.`,
    displayedRowCount: input.displayedRows.length,
    datasets: [
      {
        key: "lab_root_orders",
        label: "Hồ sơ xét nghiệm gốc",
        role: "tb_servicedata là tập hồ sơ đầu vào để tính các mốc thời gian TAT.",
      },
      {
        key: "requested_timestamps",
        label: "Mốc tiếp nhận",
        role: "Mốc tiếp nhận lấy từ tb_servicedata.servicedatausedate để làm mốc đầu cho các phép tính TAT.",
      },
      {
        key: "processing_timestamps",
        label: "Mốc xử lý",
        role: "Mốc xử lý lấy từ tb_servicedata.order_date để tách thời gian chờ xử lý và thời gian trả kết quả.",
      },
      {
        key: "result_timestamps",
        label: "Mốc trả kết quả",
        role: "Mốc trả kết quả lấy từ tb_servicedata.data_date hoặc dòng con cùng gốc trong tb_servicedata để xác định hồ sơ đã hoàn thành và tính TAT.",
      },
    ],
    pipeline: [
      buildPipelineStep(
        "raw_day_orders",
        "Tập hồ sơ gốc trong ngày",
        "Lấy các hồ sơ xét nghiệm gốc từ tb_servicedata có tb_servicedata.servicedatausedate thuộc ngày đang xem.",
        input.timelineRows.length,
        input.timelineRows.length,
      ),
      buildPipelineStep(
        "valid_requested_at",
        "Giữ hồ sơ có thời điểm tiếp nhận hợp lệ",
        "Loại các hồ sơ thiếu tb_servicedata.servicedatausedate hợp lệ trước khi tính TAT.",
        input.timelineRows.length,
        validRequestedRows.length,
      ),
      buildPipelineStep(
        "completed_orders",
        "Giữ hồ sơ đã hoàn thành",
        "Chỉ giữ các hồ sơ đã có tb_servicedata.data_date hợp lệ và có tổng TAT hợp lệ.",
        validRequestedRows.length,
        completedRows.length,
      ),
      buildPipelineStep(
        "metric_ready_rows",
        "Giữ hồ sơ đủ mốc cho chỉ số đang xem",
        "Loại các hồ sơ còn thiếu tb_servicedata.servicedatausedate, tb_servicedata.order_date hoặc tb_servicedata.data_date theo chỉ số đang xem.",
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
      "Nguồn HIS: lấy từ tb_servicedata có tb_servicedata.data_date trong ngày, tb_servicedata.data_value có giá trị, và tb_servicedata.data_value_lh mang cờ bất thường; tb_patientrecord và tb_patient chỉ bổ sung patientcode.",
      "Mức độ nghiêm trọng được suy ra từ abnormal_flag kết hợp giá trị số và khoảng tham chiếu nếu có.",
    ],
    summary: `Danh sách này đi từ tb_servicedata trong ngày ${input.asOfDate}, ghép tb_patientrecord và tb_patient, rồi chỉ giữ các kết quả có cờ nằm ngoài khoảng tham chiếu.`,
    displayedRowCount: input.displayedRows.length,
    datasets: [
      {
        key: "lab_results",
        label: "Kết quả xét nghiệm trong ngày",
        role: "tb_servicedata là tập kết quả đầu vào để phát hiện các dòng bất thường.",
      },
      {
        key: "reference_ranges",
        label: "Khoảng tham chiếu",
        role: "Khoảng tham chiếu đọc từ tb_servicedata.datareference để diễn giải mức độ lệch của kết quả khi có dữ liệu tham chiếu.",
      },
      {
        key: "abnormal_flags",
        label: "Cờ bất thường",
        role: "Cờ bất thường đọc từ tb_servicedata.data_value_lh để biết kết quả đang vượt ngưỡng cao hay thấp trước khi suy ra mức độ cảnh báo.",
      },
    ],
    pipeline: [
      buildPipelineStep(
        "abnormal_results",
        "Tập kết quả bất thường",
        "Giữ các dòng tb_servicedata trong ngày đã có data_value và data_value_lh hợp lệ.",
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
  const focusName = resolveReagentDisplayLabel(input.focus, input.displayedRows, input.focusDisplayLabel);
  const focusKey = input.focus === "all" ? "focus_all" : "focus_reagent";
  const focusLabel = input.focus === "all" ? "Giu toan bo vat tu dang hien thi" : `Loc theo vat tu ${focusName}`;
  const focusRuleSummary =
    input.focus === "all"
      ? "Giu toan bo cac dong vat tu cua kho xet nghiem sau khi da sap theo current_stock tang dan."
      : `Chi giu cac dong vat tu co khoa hien thi trung voi ${focusName}.`;

  return {
    ...buildSourceInfoBase(
      "reagents",
      "Ton kho khoa xet nghiem",
      "supabase",
      input.generatedAt,
      input.snapshotDate,
      input.error,
    ),
    calculationNotes: [
      "Nguon Supabase: doc truc tiep tung dong duong ton tu fdc_inventory_snapshots o snapshot_date moi nhat.",
      "Chi giu cac dong fdc_inventory_snapshots co warehouse thuoc Khoa Xet Nghiem; khong con gop theo nhom hoa chat cau hinh san.",
      input.focus === "all"
        ? "Che do nay hien thi toan bo vat tu that cua kho xet nghiem sau khi da sap theo ton thap truoc de uu tien theo doi tren TV."
        : "Muc nay chi giu lai vat tu dang duoc chon, nen danh sach chi tiet va source tab cung bam vao mot khoa vat tu that.",
    ],
    summary: `Danh sach nay lay truc tiep tu fdc_inventory_snapshots cua ngay ${input.snapshotDate}, chi giu warehouse thuoc Khoa Xet Nghiem roi sap tung vat tu theo ton thap truoc.`,
    displayedRowCount: input.displayedRows.length,
    datasets: [
      {
        key: "inventory_snapshot",
        label: "Du lieu ton kho moi nhat",
        role: "fdc_inventory_snapshots cung cap tung dong vat tu that cho phan ton kho khoa xet nghiem.",
      },
      {
        key: "lab_warehouse",
        label: "Kho khoa xet nghiem",
        role: "Loc tren cot warehouse cua fdc_inventory_snapshots de chi con cac dong thuoc Khoa Xet Nghiem.",
      },
      {
        key: "inventory_item_sorting",
        label: "Sap thu tu vat tu",
        role: "Cac dong vat tu duoc sap theo current_stock tang dan roi theo ten de TV uu tien hien thi vat tu sap het.",
      },
    ],
    pipeline: [
      buildPipelineStep(
        "positive_stock_snapshot",
        "Giu cac dong con duong ton",
        "Giu cac dong fdc_inventory_snapshots co current_stock lon hon 0 o snapshot_date moi nhat.",
        input.positiveSnapshotRows.length,
        input.positiveSnapshotRows.length,
      ),
      buildPipelineStep(
        "lab_warehouse_scope",
        "Giu dong thuoc kho xet nghiem",
        "Chi giu cac dong fdc_inventory_snapshots co warehouse thuoc Khoa Xet Nghiem.",
        input.positiveSnapshotRows.length,
        input.labScopedRows.length,
      ),
      buildPipelineStep(
        "sort_inventory_rows",
        "Sap vat tu ton thap truoc",
        "Sap cac dong vat tu cua kho xet nghiem theo current_stock tang dan, roi theo ten vat tu tang dan.",
        input.labScopedRows.length,
        input.matchedRows.length,
      ),
      buildPipelineStep(
        focusKey,
        focusLabel,
        focusRuleSummary,
        input.matchedRows.length,
        input.displayedRows.length,
      ),
    ],
    focusReason:
      input.focus === "all"
        ? "Muc Toan bo giu tat ca vat tu that cua kho xet nghiem sau khi da loc kho va sap theo ton thap truoc, nen danh sach hien tai chinh la tap vat tu dang duoc TV su dung."
        : `Muc ${focusName} chi giu vat tu ${focusName}, nen danh sach hien tai chi con cac dong cua dung vat tu nay.`,
    metricExplanation: [
      {
        label: "Thu tu hien thi vat tu",
        description:
          "TV uu tien cac vat tu co current_stock thap hon len truoc; neu ton bang nhau thi sap theo ten vat tu de danh sach on dinh giua cac lan tai.",
      },
      {
        label: "Hien thi theo vat tu dang xem",
        description:
          input.focus === "all"
            ? "Muc Toan bo giu tat ca vat tu that cua kho xet nghiem sau buoc loc va sap xep."
            : `Muc ${focusName} chi giu vat tu ${focusName} de detail screen va TV drill-down cung nhin vao mot vat tu that.`,
      },
    ],
  };
}
