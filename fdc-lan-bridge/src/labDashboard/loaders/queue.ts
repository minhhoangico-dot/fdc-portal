/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { hisPool } from "../../db/his";
import { logger } from "../../lib/logger";
import { buildQueueDetailRows, LabDashboardTimelineDetailInput } from "../detailHelpers";
import { buildQueueSourceProvenance } from "../sourceProvenance";
import {
  LabDashboardDetailRow,
  LabDashboardDetailSourceInfo,
  LabDashboardQueue,
  LabDashboardQueueDetailRow,
  LabDashboardQueueFocus,
  LabDashboardSectionFreshness,
} from "../types";
import {
  buildFreshness,
  errorMessageFor,
  fetchTimelineDetailRows,
  LAB_ORDER_TIMELINE_CTE,
  toNumber,
} from "./shared";

type QueueCountsRow = {
  waiting_for_sample: string | number | null;
  processing: string | number | null;
  completed_today: string | number | null;
};

type QueueSummaryResult = {
  queue: LabDashboardQueue;
  freshness: LabDashboardSectionFreshness;
};

export async function loadQueueSummary(asOfDate: string, generatedAt: string): Promise<QueueSummaryResult> {
  const countsQuery = hisPool.query<QueueCountsRow>(
    `
      ${LAB_ORDER_TIMELINE_CTE}
      SELECT
        COUNT(*) FILTER (WHERE result_at IS NULL AND processing_at IS NULL) AS waiting_for_sample,
        COUNT(*) FILTER (WHERE result_at IS NULL AND processing_at IS NOT NULL) AS processing,
        COUNT(*) FILTER (WHERE result_at IS NOT NULL) AS completed_today
      FROM orders
    `,
    [asOfDate],
  );


  const countsResult = await countsQuery;

  return {
    queue: {
      waitingForSample: toNumber(countsResult.rows[0]?.waiting_for_sample),
      processing: toNumber(countsResult.rows[0]?.processing),
      completedToday: toNumber(countsResult.rows[0]?.completed_today),
    },
    freshness: buildFreshness("his", generatedAt, asOfDate),
  };
}

export async function loadQueueDetail(
  asOfDate: string,
  generatedAt: string,
  focus: LabDashboardQueueFocus,
): Promise<{ rows: LabDashboardDetailRow[]; sourceInfo: LabDashboardDetailSourceInfo }> {
  const freshness = buildFreshness("his", generatedAt, asOfDate);
  let timelineRows: LabDashboardTimelineDetailInput[] = [];
  let rows: LabDashboardQueueDetailRow[] = [];

  try {
    timelineRows = await fetchTimelineDetailRows(asOfDate);
    rows = buildQueueDetailRows(timelineRows, focus);
    return {
      rows,
      sourceInfo: buildQueueSourceProvenance({
        asOfDate,
        generatedAt: freshness.generatedAt,
        dataDate: freshness.dataDate,
        focus,
        timelineRows,
        displayedRows: rows,
      }),
    };
  } catch (error) {
    const message = errorMessageFor(error, "Unable to load queue detail rows.");
    logger.error("Lab dashboard queue detail failed", error);
    return {
      rows,
      sourceInfo: buildQueueSourceProvenance({
        asOfDate,
        generatedAt: freshness.generatedAt,
        dataDate: freshness.dataDate,
        focus,
        timelineRows,
        displayedRows: rows,
        error: message,
      }),
    };
  }
}

