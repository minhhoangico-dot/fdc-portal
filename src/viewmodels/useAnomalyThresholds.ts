/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { AnomalyRule, AnomalyModuleType } from "@/types/inventory";

export interface AnomalyThresholdRow {
  id: string;
  moduleType: AnomalyModuleType;
  category: string;
  ruleId: AnomalyRule;
  nearExpiryDays: number | null;
  nearExpiryHighDays: number | null;
  lowStockDays: number | null;
  lowStockHighDays: number | null;
  spikeMultiplier: number | null;
  spikeMinUsage: number | null;
  spikeMinAvgUsage: number | null;
  enabled: boolean;
  updatedAt: string;
}

function mapRow(row: any): AnomalyThresholdRow {
  return {
    id: row.id,
    moduleType: row.module_type,
    category: row.category,
    ruleId: row.rule_id,
    nearExpiryDays: row.near_expiry_days,
    nearExpiryHighDays: row.near_expiry_high_days,
    lowStockDays: row.low_stock_days,
    lowStockHighDays: row.low_stock_high_days,
    spikeMultiplier: row.spike_multiplier != null ? Number(row.spike_multiplier) : null,
    spikeMinUsage: row.spike_min_usage,
    spikeMinAvgUsage: row.spike_min_avg_usage != null ? Number(row.spike_min_avg_usage) : null,
    enabled: row.enabled,
    updatedAt: row.updated_at,
  };
}

export function useAnomalyThresholds(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [thresholds, setThresholds] = useState<AnomalyThresholdRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchThresholds = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("fdc_anomaly_thresholds")
      .select("*")
      .order("module_type")
      .order("category")
      .order("rule_id");

    if (fetchError) {
      setError("Không thể tải cấu hình ngưỡng cảnh báo");
      console.error("[useAnomalyThresholds] fetch error:", fetchError);
    } else {
      setThresholds((data || []).map(mapRow));
    }

    setIsLoading(false);
  }, [enabled]);

  useEffect(() => {
    fetchThresholds();
  }, [fetchThresholds]);

  const updateThreshold = useCallback(
    async (id: string, updates: Partial<Record<string, number | boolean | null>>) => {
      setIsSaving(true);
      setSaveMessage(null);

      const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if ("nearExpiryDays" in updates) dbUpdates.near_expiry_days = updates.nearExpiryDays;
      if ("nearExpiryHighDays" in updates) dbUpdates.near_expiry_high_days = updates.nearExpiryHighDays;
      if ("lowStockDays" in updates) dbUpdates.low_stock_days = updates.lowStockDays;
      if ("lowStockHighDays" in updates) dbUpdates.low_stock_high_days = updates.lowStockHighDays;
      if ("spikeMultiplier" in updates) dbUpdates.spike_multiplier = updates.spikeMultiplier;
      if ("spikeMinUsage" in updates) dbUpdates.spike_min_usage = updates.spikeMinUsage;
      if ("spikeMinAvgUsage" in updates) dbUpdates.spike_min_avg_usage = updates.spikeMinAvgUsage;
      if ("enabled" in updates) dbUpdates.enabled = updates.enabled;

      const { error: updateError } = await supabase
        .from("fdc_anomaly_thresholds")
        .update(dbUpdates)
        .eq("id", id);

      if (updateError) {
        setSaveMessage("Lỗi khi lưu: " + updateError.message);
        console.error("[useAnomalyThresholds] update error:", updateError);
      } else {
        setSaveMessage("Đã lưu thành công");
        await fetchThresholds();
      }

      setIsSaving(false);
    },
    [fetchThresholds],
  );

  const toggleRule = useCallback(
    async (id: string, enabled: boolean) => {
      await updateThreshold(id, { enabled });
    },
    [updateThreshold],
  );

  return {
    thresholds,
    isLoading,
    isSaving,
    error,
    saveMessage,
    setSaveMessage,
    fetchThresholds,
    updateThreshold,
    toggleRule,
  };
}
