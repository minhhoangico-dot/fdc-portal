/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  LabDashboardOrderStage,
  LabDashboardQueueDetailRow,
  LabDashboardQueueFocus,
  LabDashboardTatDetailRow,
  LabDashboardTatFocus,
  LabDashboardTatMetricFocus,
  LabDashboardDetailFocus,
  LabDashboardDetailSection,
  LabDashboardReagentDetailRow,
  LabDashboardReagentFocus,
} from "./types";

export interface LabDashboardTimelineDetailInput {
  serviceDataId: number;
  patientCode: string;
  subgroupKey: string;
  subgroupName: string;
  testName: string;
  requestedAt: string;
  processingAt: string | null;
  resultAt: string | null;
  totalMinutes: number | null;
  requestedToProcessingMinutes: number | null;
  processingToResultMinutes: number | null;
  stage: LabDashboardOrderStage;
}

export interface LabDashboardDetailQuery {
  section: LabDashboardDetailSection;
  focus: LabDashboardDetailFocus;
  asOfDate?: string;
}

export class LabDashboardDetailQueryError extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "LabDashboardDetailQueryError";
  }
}

function isQueueFocus(value: string): value is LabDashboardQueueFocus {
  return value === "waiting" || value === "processing" || value === "completed";
}

function isTatMetricFocus(value: string): value is LabDashboardTatMetricFocus {
  return (
    value === "average" ||
    value === "median" ||
    value === "requested_to_processing" ||
    value === "processing_to_result"
  );
}

function isTatFocus(value: string): value is LabDashboardTatFocus {
  if (isTatMetricFocus(value)) {
    return true;
  }

  return /^type:[a-z0-9-]+$/i.test(value);
}

function isReagentFocus(value: string): value is LabDashboardReagentFocus {
  return value === "all" || /^reagent:[a-z0-9-]+$/i.test(value);
}

export function parseLabDashboardDetailQuery(input: {
  section?: string | null;
  focus?: string | null;
  date?: string | null;
}): LabDashboardDetailQuery {
  const section = (input.section || "").trim();
  const focus = (input.focus || "").trim();
  const asOfDate = input.date?.trim() || undefined;

  if (section !== "queue" && section !== "tat" && section !== "abnormal" && section !== "reagents") {
    throw new LabDashboardDetailQueryError("Invalid section");
  }

  if (!focus) {
    throw new LabDashboardDetailQueryError(`Invalid focus for section ${section}`);
  }

  if (section === "queue" && !isQueueFocus(focus)) {
    throw new LabDashboardDetailQueryError("Invalid focus for section queue");
  }

  if (section === "tat" && !isTatFocus(focus)) {
    throw new LabDashboardDetailQueryError("Invalid focus for section tat");
  }

  if (section === "abnormal" && focus !== "all") {
    throw new LabDashboardDetailQueryError("Invalid focus for section abnormal");
  }

  if (section === "reagents" && !isReagentFocus(focus)) {
    throw new LabDashboardDetailQueryError("Invalid focus for section reagents");
  }

  return {
    section,
    focus: focus as LabDashboardDetailFocus,
    asOfDate,
  };
}

function compareIsoAscending(left: string, right: string): number {
  return new Date(left).getTime() - new Date(right).getTime();
}

function compareIsoDescending(left: string | null, right: string | null): number {
  return new Date(right || 0).getTime() - new Date(left || 0).getTime();
}

export function buildQueueDetailRows(
  rows: LabDashboardTimelineDetailInput[],
  focus: LabDashboardQueueFocus,
): LabDashboardQueueDetailRow[] {
  const filteredRows = rows
    .filter((row) => row.stage === focus)
    .sort((left, right) => {
      if (focus === "completed") {
        return compareIsoDescending(left.resultAt, right.resultAt);
      }

      return compareIsoAscending(left.requestedAt, right.requestedAt);
    });

  return filteredRows.map((row) => ({
    kind: "queue",
    serviceDataId: row.serviceDataId,
    patientCode: row.patientCode,
    subgroupKey: row.subgroupKey,
    subgroupName: row.subgroupName,
    stage: row.stage,
    requestedAt: row.requestedAt,
    processingAt: row.processingAt,
    resultAt: row.resultAt,
    totalMinutes: row.totalMinutes,
    requestedToProcessingMinutes: row.requestedToProcessingMinutes,
    processingToResultMinutes: row.processingToResultMinutes,
  }));
}

function getTatMetricValue(
  row: LabDashboardTimelineDetailInput,
  focus: LabDashboardTatFocus,
): number {
  if (focus === "requested_to_processing") {
    return row.requestedToProcessingMinutes ?? -1;
  }

  if (focus === "processing_to_result") {
    return row.processingToResultMinutes ?? -1;
  }

  return row.totalMinutes ?? -1;
}

export function buildTatDetailRows(
  rows: LabDashboardTimelineDetailInput[],
  focus: LabDashboardTatFocus,
): LabDashboardTatDetailRow[] {
  const filteredRows = rows
    .filter((row) => row.stage === "completed" && row.totalMinutes !== null)
    .filter((row) => {
      if (focus.startsWith("type:")) {
        return row.subgroupKey === focus.slice("type:".length);
      }
      if (focus === "requested_to_processing") {
        return row.requestedToProcessingMinutes !== null;
      }
      if (focus === "processing_to_result") {
        return row.processingToResultMinutes !== null;
      }
      return true;
    })
    .sort((left, right) => {
      const metricDiff = getTatMetricValue(right, focus) - getTatMetricValue(left, focus);
      if (metricDiff !== 0) {
        return metricDiff;
      }
      return compareIsoAscending(left.requestedAt, right.requestedAt);
    });

  return filteredRows.map((row) => ({
    kind: "tat",
    serviceDataId: row.serviceDataId,
    patientCode: row.patientCode,
    subgroupKey: row.subgroupKey,
    subgroupName: row.subgroupName,
    testName: row.testName,
    requestedAt: row.requestedAt,
    processingAt: row.processingAt,
    resultAt: row.resultAt,
    totalMinutes: row.totalMinutes,
    requestedToProcessingMinutes: row.requestedToProcessingMinutes,
    processingToResultMinutes: row.processingToResultMinutes,
  }));
}

export function buildReagentDetailRows(
  rows: LabDashboardReagentDetailRow[],
  focus: LabDashboardReagentFocus,
): LabDashboardReagentDetailRow[] {
  const filteredRows =
    focus === "all"
      ? rows
      : rows.filter((row) => row.reagentKey === focus.slice("reagent:".length));

  return [...filteredRows].sort((left, right) => {
    const stockDiff = left.currentStock - right.currentStock;
    if (stockDiff !== 0) {
      return stockDiff;
    }

    const reagentCompare = left.reagentName.localeCompare(right.reagentName, "vi");
    if (reagentCompare !== 0) {
      return reagentCompare;
    }

    return left.reagentKey.localeCompare(right.reagentKey, "vi");
  });
}
