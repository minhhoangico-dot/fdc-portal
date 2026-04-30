/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { toHoChiMinhDate } from "../lib/date";
import { logger } from "../lib/logger";
import { loadAbnormalDetail, loadAbnormalSummary } from "./loaders/abnormal";
import { loadQueueDetail, loadQueueSummary } from "./loaders/queue";
import { loadReagentDetail, loadReagentsSummary } from "./loaders/reagents";
import { buildFreshness, errorMessageFor } from "./loaders/shared";
import { loadTatDetail, loadTatSummary } from "./loaders/tat";
import { LabDashboardDetailQuery } from "./detailHelpers";
import {
  LabDashboardAbnormal,
  LabDashboardDetailMeta,
  LabDashboardDetailPayload,
  LabDashboardDetailSourceInfo,
  LabDashboardMeta,
  LabDashboardPayload,
  LabDashboardQueue,
  LabDashboardQueueFocus,
  LabDashboardReagent,
  LabDashboardReagentFocus,
  LabDashboardSectionFreshness,
  LabDashboardTat,
  LabDashboardTatFocus,
} from "./types";

type QueueTatResult = {
  queue: LabDashboardQueue;
  tat: LabDashboardTat;
  freshness: {
    queue: LabDashboardSectionFreshness;
    tat: LabDashboardSectionFreshness;
  };
};

function buildDefaultQueue(): LabDashboardQueue {
  return {
    waitingForSample: 0,
    processing: 0,
    completedToday: 0,
  };
}

function buildDefaultTat(): LabDashboardTat {
  return {
    averageMinutes: 0,
    medianMinutes: 0,
    requestedToProcessingMinutes: 0,
    processingToResultMinutes: 0,
    byType: [],
  };
}

function buildDefaultAbnormal(): LabDashboardAbnormal {
  return {
    abnormalCount: 0,
    totalResults: 0,
    rows: [],
  };
}

function buildDefaultReagents(): LabDashboardReagent[] {
  return [];
}

async function buildQueueAndTat(asOfDate: string, generatedAt: string): Promise<QueueTatResult> {
  const [queueResult, tatResult] = await Promise.all([
    loadQueueSummary(asOfDate, generatedAt),
    loadTatSummary(asOfDate, generatedAt),
  ]);

  return {
    queue: queueResult.queue,
    tat: tatResult.tat,
    freshness: {
      queue: queueResult.freshness,
      tat: tatResult.freshness,
    },
  };
}

function buildMeta(generatedAt: string, asOfDate: string): LabDashboardMeta {
  return {
    generatedAt,
    asOfDate,
    source: "live",
    sectionFreshness: {
      queue: buildFreshness("his", generatedAt, asOfDate),
      tat: buildFreshness("his", generatedAt, asOfDate),
      abnormal: buildFreshness("his", generatedAt, asOfDate),
      reagents: buildFreshness("supabase", generatedAt),
    },
  };
}

function buildDetailTitle(section: string, focus: string): string {
  if (section === "queue") {
    if (focus === "waiting") return "Chi tiết hàng chờ lấy mẫu";
    if (focus === "processing") return "Chi tiết mẫu đang xử lý";
    return "Chi tiết mẫu đã hoàn thành";
  }

  if (section === "tat") {
    if (focus === "average") return "Chi tiết TAT trung bình";
    if (focus === "median") return "Chi tiết TAT trung vị";
    if (focus === "requested_to_processing") return "Chi tiết tiếp nhận → xử lý";
    if (focus === "processing_to_result") return "Chi tiết xử lý → trả kết quả";
    return `Chi tiết TAT nhóm ${focus.replace(/^type:/, "").replace(/-/g, " ")}`;
  }

  if (section === "abnormal") {
    return "Chi tiết kết quả bất thường";
  }

  return focus === "all"
    ? "Chi tiết tồn kho khoa xét nghiệm"
    : `Chi tiết tồn kho ${focus.replace(/^reagent:/, "").replace(/-/g, " ")}`;
}

function buildDetailDescription(section: string, focus: string): string {
  if (section === "queue") {
    if (focus === "waiting") return "Danh sách hồ sơ gốc chưa có mốc xử lý hoặc kết quả.";
    if (focus === "processing") return "Danh sách hồ sơ đã có mốc xử lý nhưng chưa có kết quả cuối.";
    return "Danh sách hồ sơ đã có kết quả trong ngày dữ liệu.";
  }

  if (section === "tat") {
    if (focus.startsWith("type:")) {
      return "Các hồ sơ đã hoàn thành của nhóm xét nghiệm được chọn, sắp theo thời gian xử lý dài nhất.";
    }
    if (focus === "requested_to_processing") {
      return "Các hồ sơ đã hoàn thành trong ngày, sắp theo thời gian từ tiếp nhận đến lúc bắt đầu xử lý.";
    }
    if (focus === "processing_to_result") {
      return "Các hồ sơ đã hoàn thành trong ngày, sắp theo thời gian từ xử lý đến lúc trả kết quả.";
    }
    return "Các hồ sơ đã hoàn thành trong ngày, sắp theo tổng TAT dài nhất.";
  }

  if (section === "abnormal") {
    return "Toàn bộ kết quả có cờ ngoài khoảng tham chiếu trong ngày dữ liệu.";
  }

  return "Các dòng tồn kho snapshot đang đóng góp vào số liệu tồn kho của khoa xét nghiệm.";
}

function buildDetailMeta(
  generatedAt: string,
  asOfDate: string,
  section: LabDashboardDetailQuery["section"],
  focus: LabDashboardDetailQuery["focus"],
  sourceDetails: LabDashboardDetailSourceInfo[],
): LabDashboardDetailMeta {
  return {
    generatedAt,
    asOfDate,
    section,
    focus,
    title: buildDetailTitle(section, focus),
    description: buildDetailDescription(section, focus),
    sourceDetails,
  };
}

export async function getLabDashboardCurrent(asOfDate: string = toHoChiMinhDate()): Promise<LabDashboardPayload> {
  const generatedAt = new Date().toISOString();
  const meta = buildMeta(generatedAt, asOfDate);
  const sectionErrors: Record<string, string> = {};

  const [queueTatResult, abnormalResult, reagentsResult] = await Promise.allSettled([
    buildQueueAndTat(asOfDate, generatedAt),
    loadAbnormalSummary(asOfDate, generatedAt),
    loadReagentsSummary(generatedAt),
  ]);

  let queue = buildDefaultQueue();
  let tat = buildDefaultTat();
  let abnormal = buildDefaultAbnormal();
  let reagents = buildDefaultReagents();

  if (queueTatResult.status === "fulfilled") {
    queue = queueTatResult.value.queue;
    tat = queueTatResult.value.tat;
    meta.sectionFreshness.queue = queueTatResult.value.freshness.queue;
    meta.sectionFreshness.tat = queueTatResult.value.freshness.tat;
  } else {
    const message = errorMessageFor(queueTatResult.reason, "Unable to load lab workflow metrics.");
    logger.error("Lab dashboard queue/TAT section failed", queueTatResult.reason);
    sectionErrors.queue = message;
    sectionErrors.tat = message;
  }

  if (abnormalResult.status === "fulfilled") {
    abnormal = abnormalResult.value.abnormal;
    meta.sectionFreshness.abnormal = abnormalResult.value.freshness;
  } else {
    const message = errorMessageFor(abnormalResult.reason, "Unable to load abnormal lab results.");
    logger.error("Lab dashboard abnormal section failed", abnormalResult.reason);
    sectionErrors.abnormal = message;
  }

  if (reagentsResult.status === "fulfilled") {
    reagents = reagentsResult.value.reagents;
    meta.sectionFreshness.reagents = reagentsResult.value.freshness;
  } else {
    const message = errorMessageFor(reagentsResult.reason, "Unable to load lab reagent inventory.");
    logger.error("Lab dashboard reagents section failed", reagentsResult.reason);
    sectionErrors.reagents = message;
  }

  if (Object.keys(sectionErrors).length > 0) {
    meta.sectionErrors = sectionErrors;
  }

  return {
    meta,
    queue,
    tat,
    abnormal,
    reagents,
  };
}

export async function getLabDashboardDetails(query: LabDashboardDetailQuery): Promise<LabDashboardDetailPayload> {
  const asOfDate = query.asOfDate || toHoChiMinhDate();
  const generatedAt = new Date().toISOString();

  if (query.section === "queue") {
    const result = await loadQueueDetail(asOfDate, generatedAt, query.focus as LabDashboardQueueFocus);
    return {
      meta: buildDetailMeta(generatedAt, asOfDate, query.section, query.focus, [result.sourceInfo]),
      rows: result.rows,
    };
  }

  if (query.section === "tat") {
    const result = await loadTatDetail(asOfDate, generatedAt, query.focus as LabDashboardTatFocus);
    return {
      meta: buildDetailMeta(generatedAt, asOfDate, query.section, query.focus, [result.sourceInfo]),
      rows: result.rows,
    };
  }

  if (query.section === "abnormal") {
    const result = await loadAbnormalDetail(asOfDate, generatedAt);
    return {
      meta: buildDetailMeta(generatedAt, asOfDate, query.section, query.focus, [result.sourceInfo]),
      rows: result.rows,
    };
  }

  const result = await loadReagentDetail(generatedAt, query.focus as LabDashboardReagentFocus);
  return {
    meta: buildDetailMeta(generatedAt, asOfDate, query.section, query.focus, [result.sourceInfo]),
    rows: result.rows,
  };
}
