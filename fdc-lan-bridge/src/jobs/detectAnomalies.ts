import { supabase } from "../db/supabase";
import {
  buildInventoryItemKey,
  detectModuleType,
  fetchThresholdConfigs,
  resolveThresholds,
  type AnomalyRule,
} from "../lib/anomalyThresholds";
import { toHoChiMinhDate } from "../lib/date";
import { logger } from "../lib/logger";
import { logSync } from "../lib/syncLog";

const matchesActiveAnomalyForItem = (
  anomaly: any,
  moduleType: "pharmacy" | "supply",
  itemKey: string | null,
  itemName: string,
): boolean => {
  if (anomaly.module_type && anomaly.module_type !== moduleType) {
    return false;
  }

  if (anomaly.inventory_item_key) {
    return anomaly.inventory_item_key === itemKey;
  }

  return anomaly.material_name === itemName;
};

export async function detectAnomaliesJob(): Promise<void> {
  const startTime = Date.now();
  let anomaliesCreated = 0;
  let anomaliesResolved = 0;

  try {
    logger.info("Starting detectAnomaliesJob (Dynamic Thresholds)...");

    const todayDate = toHoChiMinhDate();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = toHoChiMinhDate(thirtyDaysAgo);

    // Load configurable thresholds from Supabase
    const thresholdMap = await fetchThresholdConfigs();

    const { data: rawSnapshots, error: snapError } = await supabase
      .from("fdc_inventory_snapshots")
      .select("*")
      .gte("snapshot_date", cutoffDate)
      .order("snapshot_date", { ascending: true });

    if (snapError) {
      throw new Error(`Failed to fetch snapshots: ${snapError.message}`);
    }
    if (!rawSnapshots || rawSnapshots.length === 0) {
      logger.warn("No snapshots found to analyze.");
      return;
    }

    const historyMap: Record<string, any[]> = {};
    for (const snap of rawSnapshots as any[]) {
      const key = `${snap.his_medicineid}_${snap.warehouse}`;
      if (!historyMap[key]) historyMap[key] = [];
      historyMap[key].push(snap);
    }

    const { data: activeAnomalies, error: anomalyError } = await supabase
      .from("fdc_analytics_anomalies")
      .select("*")
      .eq("is_acknowledged", false);

    if (anomalyError) {
      throw new Error(`Failed to fetch active anomalies: ${anomalyError.message}`);
    }

    const currentActiveAnomalies: any[] = activeAnomalies || [];
    const newAnomaliesToInsert: any[] = [];
    const anomaliesToAcknowledge: string[] = [];

    for (const [, history] of Object.entries(historyMap)) {
      const todaySnap = (history as any[]).find((s) => s.snapshot_date === todayDate);
      if (!todaySnap) continue;

      // Determine module type and resolve thresholds
      const moduleType = detectModuleType(todaySnap.his_medicineid);
      const category = todaySnap.category || "__default__";
      const config = resolveThresholds(thresholdMap, moduleType, category);
      const itemKey = buildInventoryItemKey(todaySnap.his_medicineid, todaySnap.warehouse);

      // Calculate average daily usage from 30-day history
      let totalUsage = 0;
      let daysWithData = 0;
      for (let i = 1; i < (history as any[]).length; i++) {
        const prev = (history as any[])[i - 1];
        const curr = (history as any[])[i];
        if (curr.current_stock < prev.current_stock) {
          totalUsage += prev.current_stock - curr.current_stock;
        }
        daysWithData++;
      }

      const avgDailyUsage = daysWithData > 0 ? totalUsage / daysWithData : 0;

      const detectedRules: { rule: AnomalyRule; severity: string; description: string }[] = [];

      // --- Expiry rules ---
      let daysToExpiry = Infinity;
      if (todaySnap.expiry_date) {
        const expiry = new Date(todaySnap.expiry_date).getTime();
        daysToExpiry = (expiry - Date.now()) / (1000 * 3600 * 24);
      }

      if (config.enabledRules.has("expired") && daysToExpiry < 0) {
        detectedRules.push({
          rule: "expired",
          severity: "critical",
          description: `Thuốc đã hết hạn từ ${Math.abs(Math.floor(daysToExpiry))} ngày trước.`,
        });
      } else if (config.enabledRules.has("near_expiry") && daysToExpiry <= config.nearExpiryDays) {
        detectedRules.push({
          rule: "near_expiry",
          severity: daysToExpiry <= config.nearExpiryHighDays ? "high" : "medium",
          description: `Thuốc sắp hết hạn trong ${Math.ceil(daysToExpiry)} ngày.`,
        });
      }

      // --- Zero stock rule ---
      if (config.enabledRules.has("zero_stock") && todaySnap.current_stock === 0) {
        const yesterdaySnap = (history as any[]).find((s) => {
          const d = new Date(todayDate);
          d.setDate(d.getDate() - 1);
          return s.snapshot_date === toHoChiMinhDate(d);
        });
        if (yesterdaySnap && yesterdaySnap.current_stock > 0) {
          detectedRules.push({
            rule: "zero_stock",
            severity: "high",
            description: `Kho vừa hết hàng hôm nay (hôm qua còn ${yesterdaySnap.current_stock}).`,
          });
        }
      }

      // --- Low stock rule ---
      if (
        config.enabledRules.has("low_stock") &&
        todaySnap.current_stock > 0 &&
        avgDailyUsage > 0 &&
        todaySnap.current_stock <= avgDailyUsage * config.lowStockDays
      ) {
        const daysLeft = Math.floor(todaySnap.current_stock / avgDailyUsage);
        detectedRules.push({
          rule: "low_stock",
          severity: daysLeft <= config.lowStockHighDays ? "high" : "medium",
          description: `Tồn kho thấp, dự kiến chỉ đủ dùng trong ${daysLeft} ngày (Tiêu thụ trung bình ${avgDailyUsage.toFixed(
            1,
          )}/ngày).`,
        });
      }

      // --- Stock spike rule ---
      if (config.enabledRules.has("stock_spike") && (history as any[]).length >= 2) {
        const yesterdaySnap = (history as any[])[(history as any[]).length - 2];
        if (todaySnap.snapshot_date === todayDate && yesterdaySnap.snapshot_date !== todayDate) {
          const todayUsage = yesterdaySnap.current_stock - todaySnap.current_stock;
          if (avgDailyUsage >= config.spikeMinAvgUsage && todayUsage > 0) {
            if (todayUsage > avgDailyUsage * config.spikeMultiplier && todayUsage >= config.spikeMinUsage) {
              detectedRules.push({
                rule: "stock_spike",
                severity: "medium",
                description: `Lượng xuất đột biến: ${todayUsage} ${todaySnap.unit} (Trung bình: ${avgDailyUsage.toFixed(
                  1,
                )}/ngày).`,
              });
            }
          }
        }
      }

      // --- Match & dedup against existing active anomalies ---
      const existingAnomaliesForItem = currentActiveAnomalies.filter(
        (a) => matchesActiveAnomalyForItem(a, moduleType, itemKey, todaySnap.name),
      );

      for (const existing of existingAnomaliesForItem) {
        if (!detectedRules.some((r) => r.rule === existing.rule_id)) {
          anomaliesToAcknowledge.push(existing.id);
        }
      }

      for (const detected of detectedRules) {
        if (!existingAnomaliesForItem.some((e) => e.rule_id === detected.rule)) {
          newAnomaliesToInsert.push({
            material_name: todaySnap.name,
            inventory_item_key: itemKey,
            module_type: moduleType,
            rule_id: detected.rule,
            severity: detected.severity,
            description: detected.description,
            detected_at: new Date().toISOString(),
            is_acknowledged: false,
          });
        }
      }
    }

    if (anomaliesToAcknowledge.length > 0) {
      const { error: ackError } = await supabase
        .from("fdc_analytics_anomalies")
        .update({ is_acknowledged: true })
        .in("id", anomaliesToAcknowledge);

      if (ackError) {
        logger.error("Failed to auto-resolve anomalies", ackError);
      } else {
        anomaliesResolved = anomaliesToAcknowledge.length;
      }
    }

    if (newAnomaliesToInsert.length > 0) {
      const { error: insError } = await supabase
        .from("fdc_analytics_anomalies")
        .insert(newAnomaliesToInsert);

      if (insError) {
        logger.error("Failed to insert new anomalies", insError);
      } else {
        anomaliesCreated = newAnomaliesToInsert.length;
      }
    }

    logger.info(
      `detectAnomaliesJob completed. Found ${anomaliesCreated} new, resolved ${anomaliesResolved} in ${
        Date.now() - startTime
      }ms`,
    );

    await logSync(
      "detectAnomalies",
      "completed",
      "SYSTEM",
      anomaliesCreated,
      null,
      Date.now() - startTime,
    );
  } catch (err: any) {
    logger.error("Error in detectAnomaliesJob:", err);
    await logSync(
      "detectAnomalies",
      "failed",
      "SYSTEM",
      0,
      err?.message ?? String(err),
      Date.now() - startTime,
    );
  }
}
