/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getWeeklyReportWeekContext, normalizeDateRangeBoundary } from "./date";
import {
  getExaminationStats,
  getImagingStats,
  getInfectiousStats,
  getLaboratoryStats,
  getSpecialistStats,
  getTransferStats,
  getWeeklyReportDetails,
} from "./queries";
import {
  completeWeeklyReportLog,
  createWeeklyReportInfectiousCode,
  createWeeklyReportLog,
  createWeeklyReportServiceMapping,
  deleteWeeklyReportInfectiousCode,
  deleteWeeklyReportServiceMapping,
  getLatestWeeklyReportLog,
  getWeeklyReportSnapshot,
  listWeeklyReportInfectiousCodes,
  listWeeklyReportServiceMappings,
  searchWeeklyReportServiceCatalog,
  updateWeeklyReportInfectiousCode,
  updateWeeklyReportServiceMapping,
  upsertWeeklyReportSnapshot,
} from "./store";
import {
  WeeklyReportCurrentOptions,
  WeeklyReportCustomRequest,
  WeeklyReportData,
  WeeklyReportDetailsQuery,
  WeeklyReportGenerateOptions,
  WeeklyReportInfectiousCode,
  WeeklyReportServiceMapping,
  WeeklyReportStatus,
} from "./types";

async function buildWeeklyReport(date?: string | Date): Promise<WeeklyReportData> {
  const week = getWeeklyReportWeekContext(date);
  const [codes, mappings] = await Promise.all([
    listWeeklyReportInfectiousCodes(),
    listWeeklyReportServiceMappings(),
  ]);

  const [examination, laboratory, imaging, specialist, infectious, transfer] =
    await Promise.all([
      getExaminationStats(
        week.startDate,
        week.endDate,
        week.prevStartDate,
        week.prevEndDate,
        mappings,
      ),
      getLaboratoryStats(week.startDate, week.endDate, week.prevStartDate, week.prevEndDate),
      getImagingStats(week.startDate, week.endDate, week.prevStartDate, week.prevEndDate),
      getSpecialistStats(week.startDate, week.endDate, week.prevStartDate, week.prevEndDate),
      getInfectiousStats(week.startDate, week.endDate, codes),
      getTransferStats(week.startDate, week.endDate, week.prevStartDate, week.prevEndDate),
    ]);

  return {
    meta: {
      generated_at: new Date().toISOString(),
      week_start: week.startDate.toISOString(),
      week_end: week.endDate.toISOString(),
      week_number: week.weekNumber,
      year: week.year,
      source: "generated",
    },
    data: {
      examination,
      laboratory,
      imaging,
      specialist,
      infectious,
      transfer,
    },
  };
}

export async function getCurrentWeeklyReport(
  options: WeeklyReportCurrentOptions = {},
): Promise<WeeklyReportData> {
  const week = getWeeklyReportWeekContext(options.date);
  const snapshot = await getWeeklyReportSnapshot(week.year, week.weekNumber);

  if (snapshot?.report_data) {
    return {
      ...snapshot.report_data,
      meta: {
        ...snapshot.report_data.meta,
        source: "snapshot",
        snapshot_generated_at: snapshot.generated_at,
      },
    };
  }

  return generateWeeklyReportSnapshot({ date: options.date, trigger: "auto" });
}

export async function generateWeeklyReportSnapshot(
  options: WeeklyReportGenerateOptions = {},
): Promise<WeeklyReportData> {
  const week = getWeeklyReportWeekContext(options.date);
  const logId = await createWeeklyReportLog("GENERATE", {
    trigger: options.trigger ?? "manual",
    year: week.year,
    week_number: week.weekNumber,
  });

  try {
    const report = await buildWeeklyReport(options.date);
    await upsertWeeklyReportSnapshot(report);
    await completeWeeklyReportLog(logId, "SUCCESS", {
      details: {
        trigger: options.trigger ?? "manual",
        year: report.meta.year,
        week_number: report.meta.week_number,
      },
    });
    return report;
  } catch (error) {
    await completeWeeklyReportLog(logId, "FAILED", {
      errorMessage: error instanceof Error ? error.message : "Unknown weekly report error",
      details: {
        trigger: options.trigger ?? "manual",
        year: week.year,
        week_number: week.weekNumber,
      },
    });
    throw error;
  }
}

export async function getWeeklyReportStatus(date?: string | Date): Promise<WeeklyReportStatus> {
  const week = getWeeklyReportWeekContext(date);
  const [snapshot, latestLog] = await Promise.all([
    getWeeklyReportSnapshot(week.year, week.weekNumber),
    getLatestWeeklyReportLog(),
  ]);

  return {
    week: {
      year: week.year,
      week_number: week.weekNumber,
      week_start: week.startDate.toISOString(),
      week_end: week.endDate.toISOString(),
    },
    snapshot: snapshot
      ? {
          id: snapshot.id,
          generated_at: snapshot.generated_at,
        }
      : null,
    latest_log: latestLog,
  };
}

export async function getWeeklyReportCustomReport(
  payload: WeeklyReportCustomRequest,
): Promise<Record<string, unknown>> {
  const start = normalizeDateRangeBoundary(payload.startDate, "start");
  const end = normalizeDateRangeBoundary(payload.endDate, "end");

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw new Error("Invalid custom report date range");
  }

  const durationMs = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs);
  const [codes, mappings] = await Promise.all([
    listWeeklyReportInfectiousCodes(),
    listWeeklyReportServiceMappings(),
  ]);

  const result: Record<string, unknown> = {};

  for (const indicator of payload.indicators) {
    if (indicator === "examination") {
      result.examination = await getExaminationStats(start, end, previousStart, previousEnd, mappings);
    } else if (indicator === "laboratory") {
      result.laboratory = await getLaboratoryStats(start, end, previousStart, previousEnd);
    } else if (indicator === "imaging") {
      result.imaging = await getImagingStats(start, end, previousStart, previousEnd);
    } else if (indicator === "specialist") {
      result.specialist = await getSpecialistStats(start, end, previousStart, previousEnd);
    } else if (indicator === "infectious") {
      result.infectious = await getInfectiousStats(start, end, codes);
    } else if (indicator === "transfer") {
      result.transfer = await getTransferStats(start, end, previousStart, previousEnd);
    }
  }

  return {
    meta: {
      generated_at: new Date().toISOString(),
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      indicators: payload.indicators,
    },
    data: result,
  };
}

export async function getWeeklyReportDetailRows(
  query: WeeklyReportDetailsQuery,
): Promise<Record<string, unknown>[]> {
  const [mappings, codes] = await Promise.all([
    listWeeklyReportServiceMappings(),
    listWeeklyReportInfectiousCodes(),
  ]);

  return getWeeklyReportDetails(query, mappings, codes);
}

export async function listWeeklyReportInfectiousCodeSettings(): Promise<WeeklyReportInfectiousCode[]> {
  return listWeeklyReportInfectiousCodes();
}

export async function createWeeklyReportInfectiousCodeSetting(
  payload: Partial<WeeklyReportInfectiousCode>,
): Promise<WeeklyReportInfectiousCode> {
  return createWeeklyReportInfectiousCode(payload);
}

export async function updateWeeklyReportInfectiousCodeSetting(
  id: string,
  payload: Partial<WeeklyReportInfectiousCode>,
): Promise<WeeklyReportInfectiousCode> {
  return updateWeeklyReportInfectiousCode(id, payload);
}

export async function deleteWeeklyReportInfectiousCodeSetting(id: string): Promise<void> {
  return deleteWeeklyReportInfectiousCode(id);
}

export async function listWeeklyReportServiceMappingSettings(): Promise<WeeklyReportServiceMapping[]> {
  return listWeeklyReportServiceMappings();
}

export async function createWeeklyReportServiceMappingSetting(
  payload: Partial<WeeklyReportServiceMapping>,
): Promise<WeeklyReportServiceMapping> {
  return createWeeklyReportServiceMapping(payload);
}

export async function updateWeeklyReportServiceMappingSetting(
  id: string,
  payload: Partial<WeeklyReportServiceMapping>,
): Promise<WeeklyReportServiceMapping> {
  return updateWeeklyReportServiceMapping(id, payload);
}

export async function deleteWeeklyReportServiceMappingSetting(id: string): Promise<void> {
  return deleteWeeklyReportServiceMapping(id);
}

export async function searchWeeklyReportServiceCatalogByTerm(term: string) {
  if (!term.trim()) return [];
  return searchWeeklyReportServiceCatalog(term.trim());
}

