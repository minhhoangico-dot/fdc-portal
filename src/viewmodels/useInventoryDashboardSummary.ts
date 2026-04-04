/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from "react";

import { countActiveInventoryAnomalies } from "@/lib/inventory-dashboard-summary";
import { mapInventorySnapshotToItem } from "@/lib/inventory-identity";
import { supabase } from "@/lib/supabase";
import type { InventoryAnomaly, InventoryItem } from "@/types/inventory";
import {
  formatLocalDate,
  mapInventoryAnomaly,
  UseInventoryOptions,
} from "@/viewmodels/inventory/shared";

const PAGE_SIZE = 1000;

export function useInventoryDashboardSummary(options: UseInventoryOptions = {}) {
  const enabled = options.enabled ?? true;
  const [anomalyCount, setAnomalyCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!enabled) return;

    setError(null);
    const todayDate = formatLocalDate(new Date());

    const loadInventory = async (snapshotDate: string): Promise<InventoryItem[]> => {
      let rows: any[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("fdc_inventory_snapshots")
          .select("*")
          .eq("snapshot_date", snapshotDate)
          .order("name")
          .range(from, from + PAGE_SIZE - 1);

        if (error) {
          console.error("[useInventoryDashboardSummary] loadInventory error:", error);
          setError("Không thể tải tổng hợp tồn kho");
          hasMore = false;
          continue;
        }

        if (data && data.length > 0) {
          rows = [...rows, ...data];
          from += PAGE_SIZE;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      return rows.map((row: any) => mapInventorySnapshotToItem(row));
    };

    let inventory = await loadInventory(todayDate);

    if (inventory.length === 0) {
      const { data: latest, error: latestError } = await supabase
        .from("fdc_inventory_snapshots")
        .select("snapshot_date")
        .order("snapshot_date", { ascending: false })
        .limit(1);

      if (latestError) {
        console.error("[useInventoryDashboardSummary] latest snapshot error:", latestError);
        setError("Không thể tải tổng hợp tồn kho");
      } else if (latest && latest.length > 0) {
        const latestDate = latest[0].snapshot_date as string;
        if (latestDate && latestDate !== todayDate) {
          inventory = await loadInventory(latestDate);
        }
      }
    }

    const { data: anomalyRows, error: anomalyError } = await supabase
      .from("fdc_analytics_anomalies")
      .select("*")
      .order("detected_at", { ascending: false });

    if (anomalyError) {
      console.error("[useInventoryDashboardSummary] fetchAnomalies error:", anomalyError);
      setError("Không thể tải tổng hợp cảnh báo tồn kho");
      return;
    }

    const anomalies: InventoryAnomaly[] = (anomalyRows || []).map(mapInventoryAnomaly);
    setAnomalyCount(countActiveInventoryAnomalies(anomalies, inventory));
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setAnomalyCount(0);
      setError(null);
      return;
    }

    fetchSummary();

    const channel = supabase
      .channel("public:fdc_inventory_dashboard_summary")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fdc_inventory_snapshots" },
        fetchSummary,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fdc_analytics_anomalies" },
        fetchSummary,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, fetchSummary]);

  return { anomalyCount, error };
}
