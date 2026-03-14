import express, { Request, Response } from "express";
import { config } from "./config";
import { logger } from "./lib/logger";
import { BRIDGE_HEALTH_ROW_ID } from "./lib/bridgeHealth";
import { checkHisConnection } from "./db/his";
import { checkMisaConnection } from "./db/misa";
import { supabase } from "./db/supabase";

import { syncInventoryJob } from "./jobs/syncInventory";
import { syncPatientVolumeJob } from "./jobs/syncPatientVolume";
import { syncMedicineImportsJob } from "./jobs/syncMedicineImports";
import { detectAnomaliesJob } from "./jobs/detectAnomalies";

import { syncMisaPaymentsJob } from "./jobs/syncMisaPayments";
import { scanMisaPhieuchiJob } from "./jobs/scanMisaPhieuchi";
import {
  backfillMisaInventorySnapshotsJob,
  syncMisaSuppliesJob,
} from "./jobs/syncMisaSupplies";
import { syncSupplyConsumptionJob } from "./jobs/syncSupplyConsumption";
import { syncSupplyMonthlyStatsJob } from "./jobs/syncSupplyMonthlyStats";

import { syncAttendanceJob } from "./jobs/syncAttendance";

export const app = express();

app.get("/health", async (_req: Request, res: Response) => {
  const hisStatus = await checkHisConnection();
  const misaStatus = await checkMisaConnection();

  let queueDepth = 0;
  let lastHeartbeat: string | null = null;

  try {
    const { data, error } = await supabase
      .from("fdc_sync_health")
      .select("queue_depth, last_heartbeat")
      .eq("id", BRIDGE_HEALTH_ROW_ID)
      .maybeSingle();

    if (error) {
      logger.error(`Failed to fetch fdc_sync_health: ${error.message}`, {
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
    }

    if (data) {
      queueDepth = data.queue_depth || 0;
      lastHeartbeat = data.last_heartbeat || null;
    }
  } catch (err) {
    logger.error("Failed to fetch fdc_sync_health", err);
  }

  res.json({
    status: hisStatus && misaStatus ? "healthy" : "degraded",
    uptimeSeconds: process.uptime(),
    hisConnected: hisStatus,
    misaConnected: misaStatus,
    queueDepth,
    lastHeartbeat,
    timestamp: new Date().toISOString(),
  });
});

app.post("/sync/:type", async (req: Request, res: Response) => {
  const type = req.params.type;

  try {
    switch (type) {
      case "HIS": {
        void (async () => {
          await syncInventoryJob();
          await detectAnomaliesJob();
          await syncPatientVolumeJob();
          await syncMedicineImportsJob();
          await syncSupplyMonthlyStatsJob();
        })();
        return res.json({ ok: true });
      }
      case "MISA": {
        void (async () => {
          await syncMisaPaymentsJob();
          await scanMisaPhieuchiJob();
          await syncMisaSuppliesJob();
          await syncSupplyConsumptionJob();
          await syncSupplyMonthlyStatsJob();
        })();
        return res.json({ ok: true });
      }
      case "timekeeping": {
        void (async () => {
          await syncAttendanceJob();
        })();
        return res.json({ ok: true });
      }
      case "backfill-inventory": {
        const days = Number(req.query.days) || 365;
        void backfillMisaInventorySnapshotsJob(days);
        return res.json({ ok: true, message: `Backfilling ${days} days` });
      }
      default:
        return res.status(400).json({ ok: false, error: "Unknown sync type" });
    }
  } catch (error) {
    logger.error("Failed to start sync", { type, error });
    return res.status(500).json({ ok: false, error: "Failed to start sync" });
  }
});

export function startServer(): void {
  app.listen(config.port, () => {
    logger.info(`FDC LAN Bridge Health Server listening on port ${config.port}`);
  });
}

