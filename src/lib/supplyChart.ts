/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  SupplyAccountFilter,
  SupplyChartPoint,
  SupplyDailyConsumptionRow,
  SupplyMonthlyStatRow,
  SupplyTimeRange,
} from "@/types/inventory";

export function monthsAgo(months: number, baseDate = new Date()): string {
  const date = new Date(baseDate);
  date.setDate(1);
  date.setMonth(date.getMonth() - months);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function rangeToMonths(range: SupplyTimeRange): number {
  switch (range) {
    case "1M":
      return 1;
    case "3M":
      return 3;
    case "6M":
      return 6;
    case "1Y":
      return 12;
  }
}

export const RANGE_LABELS: Record<SupplyTimeRange, string> = {
  "1M": "1 tháng",
  "3M": "3 tháng",
  "6M": "6 tháng",
  "1Y": "1 năm",
};

interface BuildSupplyChartDataOptions {
  dailyData: SupplyDailyConsumptionRow[];
  monthlyData: SupplyMonthlyStatRow[];
  timeRange: SupplyTimeRange;
  accountFilter: SupplyAccountFilter;
  now?: Date;
}

export function buildSupplyChartData({
  dailyData,
  monthlyData,
  timeRange,
  accountFilter,
  now = new Date(),
}: BuildSupplyChartDataOptions): SupplyChartPoint[] {
  const useDaily = timeRange === "1M" || timeRange === "3M";

  if (useDaily) {
    const days = timeRange === "1M" ? 31 : 93;
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoff = cutoffDate.toISOString().split("T")[0];

    const byDate = new Map<
      string,
      { amount: number; qty: number; patients: number }
    >();

    dailyData.forEach((row) => {
      if (row.report_date < cutoff) return;
      if (accountFilter !== "all" && row.account !== accountFilter) return;
      if (accountFilter === "all" && row.account === "all") return;

      const existing = byDate.get(row.report_date) || {
        amount: 0,
        qty: 0,
        patients: 0,
      };

      byDate.set(row.report_date, {
        amount: existing.amount + Number(row.outward_amount || 0),
        qty: existing.qty + Number(row.outward_qty || 0),
        patients: Math.max(existing.patients, Number(row.patient_visits || 0)),
      });
    });

    const monthlyTotalsByMonth = new Map<string, number>();
    monthlyData.forEach((row) => {
      if (accountFilter === "all" && row.account !== "all") return;
      if (accountFilter !== "all" && row.account !== accountFilter) return;
      monthlyTotalsByMonth.set(row.report_month, Number(row.consumption_amount) || 0);
    });

    return Array.from(byDate.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([date, value]) => {
        const perVisit =
          value.patients && value.patients > 0
            ? value.amount / value.patients
            : 0;
        const [year, month] = date.split("-");
        const sameMonthLastYear = `${parseInt(year, 10) - 1}-${month}`;

        return {
          period: date,
          consumption: value.amount,
          consumptionLY:
            timeRange === "3M" ? monthlyTotalsByMonth.get(sameMonthLastYear) || 0 : 0,
          patientVolume: value.patients,
          consumptionQty: value.qty,
          consumptionPerVisit: perVisit,
        };
      });
  }

  const cutoff = monthsAgo(rangeToMonths(timeRange), now);
  const byMonth = new Map<
    string,
    {
      amount: number;
      amountLY: number;
      qty: number;
      patients: number;
    }
  >();

  monthlyData
    .filter((row) => row.report_month >= cutoff)
    .forEach((row) => {
      if (accountFilter === "all" && row.account === "all") {
        byMonth.set(row.report_month, {
          amount: Number(row.consumption_amount || 0),
          amountLY: Number(row.consumption_amount_ly || 0),
          qty: Number(row.consumption_qty || 0),
          patients: Number(row.patient_volume || 0),
        });
        return;
      }

      if (accountFilter !== "all" && row.account === accountFilter) {
        const existing = byMonth.get(row.report_month) || {
          amount: 0,
          amountLY: 0,
          qty: 0,
          patients: 0,
        };

        byMonth.set(row.report_month, {
          amount: existing.amount + Number(row.consumption_amount || 0),
          amountLY: existing.amountLY + Number(row.consumption_amount_ly || 0),
          qty: existing.qty + Number(row.consumption_qty || 0),
          patients: Number(row.patient_volume || 0),
        });
      }
    });

  return Array.from(byMonth.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([period, value]) => ({
      period,
      consumption: value.amount,
      consumptionLY: value.amountLY,
      patientVolume: value.patients,
      consumptionQty: value.qty,
      consumptionPerVisit:
        value.patients && value.patients > 0 ? value.amount / value.patients : 0,
    }));
}
