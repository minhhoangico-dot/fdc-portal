/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from "../lib/logger";
import { generateWeeklyReportSnapshot } from "../weeklyReport/service";

export async function generateWeeklyReportJob(
  date?: string | Date,
  trigger: "manual" | "auto" | "scheduler" = "scheduler",
): Promise<void> {
  logger.info("Starting weekly report snapshot generation", { trigger, date: date ?? null });
  await generateWeeklyReportSnapshot({ date, trigger });
  logger.info("Weekly report snapshot generation completed", { trigger, date: date ?? null });
}

