import { supabase } from "../db/supabase";
import { logger } from "../lib/logger";
import { logSync } from "../lib/syncLog";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const HCM_TZ = "Asia/Ho_Chi_Minh";

interface Schedule {
  startTime: string;
  endTime: string;
  allowedLateMinutes: number;
}

const DEFAULT_SCHEDULE: Schedule = {
  startTime: "08:00",
  endTime: "17:30",
  allowedLateMinutes: 5,
};

interface AttendanceRow {
  employee_id: string;
  check_time: string;
}

async function loadSchedule(): Promise<Schedule> {
  const { data, error } = await supabase
    .from("fdc_attendance_settings")
    .select("value")
    .eq("key", "global_schedule")
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_SCHEDULE;
  }

  const value = data.value || {};
  return {
    startTime: value.startTime || DEFAULT_SCHEDULE.startTime,
    endTime: value.endTime || DEFAULT_SCHEDULE.endTime,
    allowedLateMinutes:
      typeof value.allowedLateMinutes === "number"
        ? value.allowedLateMinutes
        : DEFAULT_SCHEDULE.allowedLateMinutes,
  };
}

async function loadExceptions(): Promise<Map<string, Schedule>> {
  const map = new Map<string, Schedule>();
  const { data, error } = await supabase
    .from("fdc_attendance_schedule_exceptions")
    .select("employee_no, start_time, end_time, allowed_late_minutes");

  if (error || !data) return map;

  for (const row of data) {
    map.set(row.employee_no, {
      startTime: row.start_time,
      endTime: row.end_time,
      allowedLateMinutes: row.allowed_late_minutes ?? 0,
    });
  }
  return map;
}

async function loadEmployeeLinks(): Promise<
  Map<string, { user_id: string | null; name: string | null; department: string | null }>
> {
  const map = new Map<
    string,
    { user_id: string | null; name: string | null; department: string | null }
  >();
  const { data, error } = await supabase
    .from("fdc_attendance_employees")
    .select("employee_no, user_id, name, department");

  if (error || !data) return map;

  for (const row of data) {
    map.set(row.employee_no, {
      user_id: row.user_id ?? null,
      name: row.name ?? null,
      department: row.department ?? null,
    });
  }
  return map;
}

async function fetchEvents(
  fromIso: string,
  toIso: string,
): Promise<AttendanceRow[]> {
  const all: AttendanceRow[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("fdc_attendance_records")
      .select("employee_id, check_time")
      .gte("check_time", fromIso)
      .lt("check_time", toIso)
      .order("check_time", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Failed to fetch attendance records: ${error.message}`);
    }
    if (!data || data.length === 0) break;
    all.push(...(data as AttendanceRow[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return all;
}

function parseHcm(checkTime: string): dayjs.Dayjs {
  return dayjs(checkTime).tz(HCM_TZ);
}

function computeLateMinutes(checkIn: dayjs.Dayjs, schedule: Schedule): number {
  const [h, m] = schedule.startTime.split(":").map(Number);
  const workStart = checkIn.clone().hour(h).minute(m).second(0).millisecond(0);
  const diffMin = Math.round(checkIn.diff(workStart, "minute", true));
  return Math.max(0, diffMin);
}

function computeStatus(
  lateMinutes: number,
  schedule: Schedule,
): "on_time" | "late" {
  return lateMinutes <= schedule.allowedLateMinutes ? "on_time" : "late";
}

export async function aggregateAttendanceJob(
  fromDate?: string,
): Promise<void> {
  const startTime = Date.now();
  let recordsWritten = 0;

  try {
    logger.info(`Starting aggregateAttendanceJob (fromDate=${fromDate || "yesterday"})...`);

    const startDay = fromDate
      ? dayjs.tz(fromDate, HCM_TZ).startOf("day")
      : dayjs().tz(HCM_TZ).subtract(1, "day").startOf("day");
    const endDay = dayjs().tz(HCM_TZ).add(1, "day").startOf("day");

    const [schedule, exceptions, employeeLinks] = await Promise.all([
      loadSchedule(),
      loadExceptions(),
      loadEmployeeLinks(),
    ]);

    const events = await fetchEvents(
      startDay.toDate().toISOString(),
      endDay.toDate().toISOString(),
    );

    logger.info(`Aggregating ${events.length} events from ${startDay.format("YYYY-MM-DD")} to ${endDay.format("YYYY-MM-DD")}.`);

    const buckets = new Map<string, AttendanceRow[]>();
    for (const evt of events) {
      const dateStr = parseHcm(evt.check_time).format("YYYY-MM-DD");
      const key = `${evt.employee_id}|${dateStr}`;
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.push(evt);
      } else {
        buckets.set(key, [evt]);
      }
    }

    const payloads: Array<Record<string, unknown>> = [];

    for (const [key, rows] of buckets.entries()) {
      const [employeeNo, dateStr] = key.split("|");
      rows.sort((a, b) => a.check_time.localeCompare(b.check_time));

      const first = parseHcm(rows[0].check_time);
      const last = parseHcm(rows[rows.length - 1].check_time);
      const gapHours = last.diff(first, "hour", true);
      const checkInIso = first.toISOString();
      const checkOutIso = rows.length > 1 && gapHours >= 1 ? last.toISOString() : null;

      const effectiveSchedule = exceptions.get(employeeNo) ?? schedule;
      const lateMinutes = computeLateMinutes(first, effectiveSchedule);
      const status = computeStatus(lateMinutes, effectiveSchedule);
      const hoursWorked = checkOutIso
        ? Number(last.diff(first, "hour", true).toFixed(2))
        : 0;

      const link = employeeLinks.get(employeeNo);

      payloads.push({
        user_id: link?.user_id ?? null,
        employee_no: employeeNo,
        date: dateStr,
        check_in: checkInIso,
        check_out: checkOutIso,
        status,
        late_minutes: lateMinutes,
        hours_worked: hoursWorked,
        overtime_hours: 0,
        source: "aggregated",
        schedule_source: exceptions.has(employeeNo) ? "exception" : "global",
      });
    }

    const batchSize = 500;
    for (let i = 0; i < payloads.length; i += batchSize) {
      const batch = payloads.slice(i, i + batchSize);
      const { error: upsertErr } = await supabase
        .from("fdc_emp_attendance")
        .upsert(batch, { onConflict: "employee_no,date" });
      if (upsertErr) {
        throw new Error(
          `Failed to upsert aggregated attendance batch ${i}: ${upsertErr.message}`,
        );
      }
    }

    recordsWritten = payloads.length;
    logger.info(`aggregateAttendanceJob wrote ${recordsWritten} daily summaries.`);

    await logSync(
      "aggregateAttendance",
      "completed",
      "SYSTEM",
      recordsWritten,
      null,
      Date.now() - startTime,
    );
  } catch (error: any) {
    logger.error("aggregateAttendanceJob failed:", error);
    await logSync(
      "aggregateAttendance",
      "failed",
      "SYSTEM",
      recordsWritten,
      error?.message ?? String(error),
      Date.now() - startTime,
    );
  }
}
