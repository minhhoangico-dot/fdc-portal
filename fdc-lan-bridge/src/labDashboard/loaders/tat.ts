/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { hisPool } from "../../db/his";
import { logger } from "../../lib/logger";
import { buildTatDetailRows, LabDashboardTimelineDetailInput } from "../detailHelpers";
import { buildTatSourceProvenance } from "../sourceProvenance";
import {
  LabDashboardDetailRow,
  LabDashboardDetailSourceInfo,
  LabDashboardSectionFreshness,
  LabDashboardTat,
  LabDashboardTatDetailRow,
  LabDashboardTatFocus,
  LabDashboardTimelineProvenanceRow,
} from "../types";
import {
  buildFreshness,
  errorMessageFor,
  fetchTimelineDetailRows,
  LAB_ORDER_TIMELINE_CTE,
  resolveTatTypeKey,
  roundMetric,
} from "./shared";

type TatOverviewRow = {
  average_minutes: string | number | null;
  median_minutes: string | number | null;
  requested_to_processing_minutes: string | number | null;
  processing_to_result_minutes: string | number | null;
};

type TatByTypeRow = {
  dm_servicesubgroupid: number | null;
  subgroup_name: string | null;
  minutes: string | number | null;
};

type TatSummaryResult = {
  tat: LabDashboardTat;
  freshness: LabDashboardSectionFreshness;
};

export async function loadTatSummary(asOfDate: string, generatedAt: string): Promise<TatSummaryResult> {
  const overviewQuery = hisPool.query<TatOverviewRow>(
    `
      ${LAB_ORDER_TIMELINE_CTE},
      tat_rows AS (
        SELECT
          EXTRACT(EPOCH FROM (result_at - requested_at)) / 60.0 AS total_minutes,
          CASE
            WHEN processing_at IS NOT NULL AND processing_at >= requested_at
              THEN EXTRACT(EPOCH FROM (processing_at - requested_at)) / 60.0
            ELSE NULL
          END AS requested_to_processing_minutes,
          CASE
            WHEN processing_at IS NOT NULL AND result_at >= processing_at
              THEN EXTRACT(EPOCH FROM (result_at - processing_at)) / 60.0
            ELSE NULL
          END AS processing_to_result_minutes
        FROM orders
        WHERE result_at IS NOT NULL
          AND result_at >= requested_at
      )
      SELECT
        ROUND(AVG(total_minutes))::int AS average_minutes,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_minutes))::int AS median_minutes,
        ROUND(AVG(requested_to_processing_minutes))::int AS requested_to_processing_minutes,
        ROUND(AVG(processing_to_result_minutes))::int AS processing_to_result_minutes
      FROM tat_rows
    `,
    [asOfDate],
  );

  const byTypeQuery = hisPool.query<TatByTypeRow>(
    `
      ${LAB_ORDER_TIMELINE_CTE},
      tat_rows AS (
        SELECT
          dm_servicesubgroupid,
          subgroup_name,
          EXTRACT(EPOCH FROM (result_at - requested_at)) / 60.0 AS total_minutes
        FROM orders
        WHERE result_at IS NOT NULL
          AND result_at >= requested_at
      )
      SELECT
        dm_servicesubgroupid,
        subgroup_name,
        ROUND(AVG(total_minutes))::int AS minutes
      FROM tat_rows
      GROUP BY dm_servicesubgroupid, subgroup_name
      HAVING ROUND(AVG(total_minutes))::int IS NOT NULL
      ORDER BY minutes ASC, subgroup_name ASC
    `,
    [asOfDate],
  );

  const [overviewResult, byTypeResult] = await Promise.all([
    overviewQuery,
    byTypeQuery,
  ]);

  return {
    tat: {
      averageMinutes: roundMetric(overviewResult.rows[0]?.average_minutes),
      medianMinutes: roundMetric(overviewResult.rows[0]?.median_minutes),
      requestedToProcessingMinutes: roundMetric(overviewResult.rows[0]?.requested_to_processing_minutes),
      processingToResultMinutes: roundMetric(overviewResult.rows[0]?.processing_to_result_minutes),
      byType: byTypeResult.rows.map((row) => ({
        key: resolveTatTypeKey(row.dm_servicesubgroupid, row.subgroup_name || "Kh\u00e1c"),
        name: row.subgroup_name || "Kh\u00e1c",
        minutes: roundMetric(row.minutes),
      })),
    },
    freshness: buildFreshness("his", generatedAt, asOfDate),
  };
}

export async function loadTatDetail(
  asOfDate: string,
  generatedAt: string,
  focus: LabDashboardTatFocus,
): Promise<{ rows: LabDashboardDetailRow[]; sourceInfo: LabDashboardDetailSourceInfo }> {
  const freshness = buildFreshness("his", generatedAt, asOfDate);
  let timelineRows: LabDashboardTimelineDetailInput[] = [];
  let rows: LabDashboardTatDetailRow[] = [];

  try {
    timelineRows = await fetchTimelineDetailRows(asOfDate);
    rows = buildTatDetailRows(timelineRows, focus);
    return {
      rows,
      sourceInfo: buildTatSourceProvenance({
        asOfDate,
        generatedAt: freshness.generatedAt,
        dataDate: freshness.dataDate,
        focus,
        timelineRows: timelineRows as LabDashboardTimelineProvenanceRow[],
        displayedRows: rows,
      }),
    };
  } catch (error) {
    const message = errorMessageFor(error, "Unable to load TAT detail rows.");
    logger.error("Lab dashboard tat detail failed", error);
    return {
      rows,
      sourceInfo: buildTatSourceProvenance({
        asOfDate,
        generatedAt: freshness.generatedAt,
        dataDate: freshness.dataDate,
        focus,
        timelineRows: timelineRows as LabDashboardTimelineProvenanceRow[],
        displayedRows: rows,
        error: message,
      }),
    };
  }
}

