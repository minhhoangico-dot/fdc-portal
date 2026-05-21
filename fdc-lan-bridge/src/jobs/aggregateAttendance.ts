import { supabase } from "../db/supabase";
import { logger } from "../lib/logger";
import { logSync } from "../lib/syncLog";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const HCM_TZ = "Asia/Ho_Chi_Minh";

/**
 * Calls the existing `process_daily_attendance(target_date)` Postgres function
 * for each day in the window. That function reads
 * fdc_attendance_records + fdc_attendance_schedule (+ override) and upserts
 * fdc_emp_attendance — single source of truth in the database.
 */
export async function aggregateAttendanceJob(
  fromDate?: string,
): Promise<void> {
  const startTime = Date.now();
  let totalRowsProcessed = 0;
  let daysAttempted = 0;
  let daysFailed = 0;

  try {
    logger.info(
      `Starting aggregateAttendanceJob (fromDate=${fromDate || "yesterday"})...`,
    );

    const startDay = fromDate
      ? dayjs.tz(fromDate, HCM_TZ).startOf("day")
      : dayjs().tz(HCM_TZ).subtract(1, "day").startOf("day");
    const endDay = dayjs().tz(HCM_TZ).startOf("day");

    let cursor = startDay;
    while (cursor.isBefore(endDay) || cursor.isSame(endDay, "day")) {
      const dateStr = cursor.format("YYYY-MM-DD");
      daysAttempted += 1;
      try {
        const { data, error } = await supabase.rpc("process_daily_attendance", {
          target_date: dateStr,
        });
        if (error) {
          throw new Error(error.message);
        }
        const processed = typeof data === "number" ? data : Number(data ?? 0);
        totalRowsProcessed += processed;
      } catch (err: any) {
        daysFailed += 1;
        logger.error(
          `process_daily_attendance(${dateStr}) failed: ${err?.message ?? String(err)}`,
        );
      }
      cursor = cursor.add(1, "day");
    }

    logger.info(
      `aggregateAttendanceJob finished: ${totalRowsProcessed} rows across ${daysAttempted} day(s), ${daysFailed} failed.`,
    );

    await logSync(
      "aggregateAttendance",
      daysFailed === 0 ? "completed" : "partial",
      "SYSTEM",
      totalRowsProcessed,
      daysFailed > 0 ? `${daysFailed} day(s) failed` : null,
      Date.now() - startTime,
    );
  } catch (error: any) {
    logger.error("aggregateAttendanceJob failed:", error);
    await logSync(
      "aggregateAttendance",
      "failed",
      "SYSTEM",
      totalRowsProcessed,
      error?.message ?? String(error),
      Date.now() - startTime,
    );
  }
}
