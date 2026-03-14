import { supabase } from "../db/supabase";
import { logger } from "../lib/logger";
import { logSync } from "../lib/syncLog";

export async function detectAnomaliesJob(): Promise<void> {
  const startTime = Date.now();
  let anomaliesCreated = 0;
  let anomaliesResolved = 0;

  try {
    logger.info("Starting detectAnomaliesJob (Dynamic Thresholds)...");

    const todayDate = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split("T")[0];

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

      const detectedRules: any[] = [];
      let daysToExpiry = Infinity;
      if (todaySnap.expiry_date) {
        const expiry = new Date(todaySnap.expiry_date).getTime();
        daysToExpiry = (expiry - Date.now()) / (1000 * 3600 * 24);
      }

      if (daysToExpiry < 0) {
        detectedRules.push({
          rule: "expired",
          severity: "critical",
          description: `Thuốc đã hết hạn từ ${Math.abs(Math.floor(daysToExpiry))} ngày trước.`,
        });
      } else if (daysToExpiry <= 90) {
        detectedRules.push({
          rule: "near_expiry",
          severity: daysToExpiry <= 30 ? "high" : "medium",
          description: `Thuốc sắp hết hạn trong ${Math.ceil(daysToExpiry)} ngày.`,
        });
      }

      if (todaySnap.current_stock === 0) {
        const yesterdaySnap = (history as any[]).find((s) => {
          const d = new Date(todayDate);
          d.setDate(d.getDate() - 1);
          return s.snapshot_date === d.toISOString().split("T")[0];
        });
        if (yesterdaySnap && yesterdaySnap.current_stock > 0) {
          detectedRules.push({
            rule: "zero_stock",
            severity: "high",
            description: `Kho vừa hết hàng hôm nay (hôm qua còn ${yesterdaySnap.current_stock}).`,
          });
        }
      } else if (avgDailyUsage > 0 && todaySnap.current_stock <= avgDailyUsage * 7) {
        const daysLeft = Math.floor(todaySnap.current_stock / avgDailyUsage);
        detectedRules.push({
          rule: "low_stock",
          severity: daysLeft <= 3 ? "high" : "medium",
          description: `Tồn kho thấp, dự kiến chỉ đủ dùng trong ${daysLeft} ngày (Tiêu thụ trung bình ${avgDailyUsage.toFixed(
            1,
          )}/ngày).`,
        });
      }

      if ((history as any[]).length >= 2) {
        const yesterdaySnap = (history as any[])[(history as any[]).length - 2];
        if (todaySnap.snapshot_date === todayDate && yesterdaySnap.snapshot_date !== todayDate) {
          const todayUsage = yesterdaySnap.current_stock - todaySnap.current_stock;
          if (avgDailyUsage >= 2 && todayUsage > 0) {
            if (todayUsage > avgDailyUsage * 1.5 && todayUsage >= 10) {
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

      const existingAnomaliesForItem = currentActiveAnomalies.filter(
        (a) => a.material_name === todaySnap.name,
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

