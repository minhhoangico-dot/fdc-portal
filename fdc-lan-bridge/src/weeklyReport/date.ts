/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { WeeklyReportWeekContext } from "./types";

dayjs.extend(isoWeek);

function normalizeDateInput(value?: string | Date): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }

  return new Date(value);
}

export function getWeeklyReportWeekContext(value?: string | Date): WeeklyReportWeekContext {
  const refDate = normalizeDateInput(value);
  const current = dayjs(refDate);
  const startDate = current.startOf("isoWeek");
  const endDate = current.endOf("isoWeek");
  const prevStartDate = startDate.subtract(1, "week");
  const prevEndDate = endDate.subtract(1, "week");

  return {
    refDate,
    startDate: startDate.toDate(),
    endDate: endDate.toDate(),
    prevStartDate: prevStartDate.toDate(),
    prevEndDate: prevEndDate.toDate(),
    weekNumber: startDate.isoWeek(),
    year: startDate.isoWeekYear(),
  };
}

export function normalizeDateRangeBoundary(value: string, boundary: "start" | "end"): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T${boundary === "start" ? "00:00:00" : "23:59:59.999"}`);
  }

  return new Date(value);
}

