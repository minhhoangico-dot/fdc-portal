/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";

import { RANGE_LABELS, buildSupplyChartData, monthsAgo } from "@/lib/supplyChart";
import { subscribeToPostgresChanges } from "@/lib/supabase-realtime";
import { supabase } from "@/lib/supabase";
import type {
  SupplyAccountFilter,
  SupplyChartPoint,
  SupplyDailyConsumptionRow,
  SupplyMonthlyStatRow,
  SupplyTimeRange,
} from "@/types/inventory";

export function useSupplyChart() {
  const [timeRange, setTimeRange] = useState<SupplyTimeRange>("1Y");
  const [accountFilter, setAccountFilter] = useState<SupplyAccountFilter>("all");
  const [monthlyData, setMonthlyData] = useState<SupplyMonthlyStatRow[]>([]);
  const [dailyData, setDailyData] = useState<SupplyDailyConsumptionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasLoaded = useRef(false);

  const fetchMonthlyStats = useCallback(async () => {
    const cutoff = monthsAgo(12);

    const { data, error } = await supabase
      .from("fdc_supply_monthly_stats")
      .select("*")
      .gte("report_month", cutoff)
      .order("report_month", { ascending: true });

    if (error) {
      console.error("[useSupplyChart] fetch error:", error);
      setMonthlyData([]);
      return;
    }

    setMonthlyData(data || []);
  }, []);

  const fetchDailySummary = useCallback(async () => {
    try {
      const today = new Date();
      const past = new Date();
      past.setDate(today.getDate() - 95);
      const cutoff = past.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("fdc_supply_consumption_daily")
        .select("report_date, account, outward_amount, outward_qty, patient_visits")
        .gte("report_date", cutoff)
        .order("report_date", { ascending: true })
        .order("account", { ascending: true })
        .returns<SupplyDailyConsumptionRow[]>();

      if (error) {
        console.error("[useSupplyChart] daily fetch error:", error);
        setDailyData([]);
        return;
      }

      setDailyData(data || []);
    } catch (err) {
      console.error("[useSupplyChart] daily fetch unexpected error:", err);
      setDailyData([]);
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) setIsLoading(true);
    Promise.all([fetchMonthlyStats(), fetchDailySummary()]).finally(() => {
      hasLoaded.current = true;
      setIsLoading(false);
    });

    return subscribeToPostgresChanges(
      supabase,
      "supply-chart-realtime",
      [
        { table: "fdc_supply_monthly_stats" },
        { table: "fdc_supply_consumption_daily" },
      ],
      () => {
        fetchMonthlyStats();
        fetchDailySummary();
      },
    );
  }, [fetchMonthlyStats, fetchDailySummary]);

  const chartData: SupplyChartPoint[] = useMemo(() => {
    return buildSupplyChartData({
      dailyData,
      monthlyData,
      timeRange,
      accountFilter,
    });
  }, [dailyData, monthlyData, timeRange, accountFilter]);

  return {
    timeRange,
    setTimeRange,
    accountFilter,
    setAccountFilter,
    chartData,
    monthlyData,
    dailyData,
    isLoading,
    RANGE_LABELS,
  };
}
