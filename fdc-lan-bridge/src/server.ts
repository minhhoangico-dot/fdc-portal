import express, { Request, Response } from "express";
import cors from "cors";
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
import { syncSupplyInwardJob } from "./jobs/syncSupplyInward";
import { syncSupplyMonthlyStatsJob } from "./jobs/syncSupplyMonthlyStats";

import { syncAttendanceJob } from "./jobs/syncAttendance";
import { LabDashboardDetailQueryError, parseLabDashboardDetailQuery } from "./labDashboard/detailHelpers";
import { getLabDashboardCurrent, getLabDashboardDetails } from "./labDashboard/service";
import { getTvAccessCheck } from "./tvAccess/service";
import {
  createWeeklyReportInfectiousCodeSetting,
  createWeeklyReportServiceMappingSetting,
  deleteWeeklyReportInfectiousCodeSetting,
  deleteWeeklyReportServiceMappingSetting,
  generateWeeklyReportSnapshot,
  getCurrentWeeklyReport,
  getWeeklyReportCustomReport,
  getWeeklyReportDetailRows,
  getWeeklyReportStatus,
  listWeeklyReportInfectiousCodeSettings,
  listWeeklyReportServiceMappingSettings,
  searchWeeklyReportServiceCatalogByTerm,
  updateWeeklyReportInfectiousCodeSetting,
  updateWeeklyReportServiceMappingSetting,
} from "./weeklyReport/service";

export const app = express();
app.set("trust proxy", true);
app.use(cors({
  origin: [
    "https://portal.fdc-nhanvien.org",
    "https://fdc-portal.pages.dev",
    /\.fdc-portal\.pages\.dev$/,
    "http://localhost:3000",
  ],
}));
app.use(express.json());

app.get("/tv-access/check", async (req: Request, res: Response) => {
  try {
    const result = getTvAccessCheck(req);
    return res.json(result);
  } catch (error) {
    logger.error("Failed to check TV access", error);
    return res.status(500).json({ error: "Failed to check TV access" });
  }
});

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
          await syncSupplyInwardJob();
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

app.get("/lab-dashboard/current", async (req: Request, res: Response) => {
  try {
    const asOfDate =
      typeof req.query.date === "string" && req.query.date.trim()
        ? req.query.date.trim()
        : undefined;
    const payload = await getLabDashboardCurrent(asOfDate);
    return res.json(payload);
  } catch (error) {
    logger.error("Failed to fetch lab dashboard", error);
    return res.status(500).json({ error: "Failed to fetch lab dashboard" });
  }
});

app.get("/lab-dashboard/details", async (req: Request, res: Response) => {
  try {
    const query = parseLabDashboardDetailQuery({
      section: typeof req.query.section === "string" ? req.query.section : null,
      focus: typeof req.query.focus === "string" ? req.query.focus : null,
      date: typeof req.query.date === "string" ? req.query.date : null,
    });
    const payload = await getLabDashboardDetails(query);
    return res.json(payload);
  } catch (error) {
    if (error instanceof LabDashboardDetailQueryError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    logger.error("Failed to fetch lab dashboard details", error);
    return res.status(500).json({ error: "Failed to fetch lab dashboard details" });
  }
});

app.get("/weekly-report/current", async (req: Request, res: Response) => {
  try {
    const report = await getCurrentWeeklyReport({ date: String(req.query.date || "") || undefined });
    return res.json(report);
  } catch (error) {
    logger.error("Failed to fetch current weekly report", error);
    return res.status(500).json({ error: "Failed to fetch weekly report" });
  }
});

app.get("/weekly-report/status", async (req: Request, res: Response) => {
  try {
    const status = await getWeeklyReportStatus(String(req.query.date || "") || undefined);
    return res.json(status);
  } catch (error) {
    logger.error("Failed to fetch weekly report status", error);
    return res.status(500).json({ error: "Failed to fetch weekly report status" });
  }
});

app.post("/weekly-report/generate", async (req: Request, res: Response) => {
  try {
    const report = await generateWeeklyReportSnapshot({
      date:
        typeof req.body?.date === "string" && req.body.date.trim()
          ? req.body.date
          : undefined,
      trigger: "manual",
    });

    return res.json({
      success: true,
      week_number: report.meta.week_number,
      year: report.meta.year,
      generated_at: report.meta.generated_at,
    });
  } catch (error) {
    logger.error("Failed to generate weekly report", error);
    return res.status(500).json({ error: "Failed to generate weekly report" });
  }
});

app.post("/weekly-report/custom", async (req: Request, res: Response) => {
  try {
    const indicators = Array.isArray(req.body?.indicators) ? req.body.indicators : [];
    const startDate = typeof req.body?.startDate === "string" ? req.body.startDate : "";
    const endDate = typeof req.body?.endDate === "string" ? req.body.endDate : "";

    if (indicators.length === 0 || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing custom report payload" });
    }

    const report = await getWeeklyReportCustomReport({ indicators, startDate, endDate });
    return res.json(report);
  } catch (error) {
    logger.error("Failed to generate custom weekly report", error);
    return res.status(500).json({ error: "Failed to generate custom report" });
  }
});

app.get("/weekly-report/details", async (req: Request, res: Response) => {
  try {
    const key = typeof req.query.key === "string" ? req.query.key : "";
    const start = typeof req.query.start === "string" ? req.query.start : "";
    const end = typeof req.query.end === "string" ? req.query.end : "";
    const type = typeof req.query.type === "string" ? req.query.type : null;

    if (!key || !start || !end) {
      return res.status(400).json({ error: "Missing detail parameters" });
    }

    const rows = await getWeeklyReportDetailRows({ key, type, start, end });
    return res.json(rows);
  } catch (error) {
    logger.error("Failed to fetch weekly report details", error);
    return res.status(500).json({ error: "Failed to fetch weekly report details" });
  }
});

app.get("/weekly-report/settings/icd-codes", async (_req: Request, res: Response) => {
  try {
    const data = await listWeeklyReportInfectiousCodeSettings();
    return res.json(data);
  } catch (error) {
    logger.error("Failed to list weekly report ICD codes", error);
    return res.status(500).json({ error: "Failed to list ICD codes" });
  }
});

app.post("/weekly-report/settings/icd-codes", async (req: Request, res: Response) => {
  try {
    const created = await createWeeklyReportInfectiousCodeSetting(req.body ?? {});
    return res.json(created);
  } catch (error) {
    logger.error("Failed to create weekly report ICD code", error);
    return res.status(500).json({ error: "Failed to create ICD code" });
  }
});

app.put("/weekly-report/settings/icd-codes/:id", async (req: Request, res: Response) => {
  try {
    const updated = await updateWeeklyReportInfectiousCodeSetting(req.params.id, req.body ?? {});
    return res.json(updated);
  } catch (error) {
    logger.error("Failed to update weekly report ICD code", error);
    return res.status(500).json({ error: "Failed to update ICD code" });
  }
});

app.delete("/weekly-report/settings/icd-codes/:id", async (req: Request, res: Response) => {
  try {
    await deleteWeeklyReportInfectiousCodeSetting(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete weekly report ICD code", error);
    return res.status(500).json({ error: "Failed to delete ICD code" });
  }
});

app.get("/weekly-report/settings/service-mappings", async (_req: Request, res: Response) => {
  try {
    const data = await listWeeklyReportServiceMappingSettings();
    return res.json(data);
  } catch (error) {
    logger.error("Failed to list weekly report service mappings", error);
    return res.status(500).json({ error: "Failed to list service mappings" });
  }
});

app.post("/weekly-report/settings/service-mappings", async (req: Request, res: Response) => {
  try {
    const created = await createWeeklyReportServiceMappingSetting(req.body ?? {});
    return res.json(created);
  } catch (error) {
    logger.error("Failed to create weekly report service mapping", error);
    return res.status(500).json({ error: "Failed to create service mapping" });
  }
});

app.put("/weekly-report/settings/service-mappings/:id", async (req: Request, res: Response) => {
  try {
    const updated = await updateWeeklyReportServiceMappingSetting(req.params.id, req.body ?? {});
    return res.json(updated);
  } catch (error) {
    logger.error("Failed to update weekly report service mapping", error);
    return res.status(500).json({ error: "Failed to update service mapping" });
  }
});

app.delete("/weekly-report/settings/service-mappings/:id", async (req: Request, res: Response) => {
  try {
    await deleteWeeklyReportServiceMappingSetting(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete weekly report service mapping", error);
    return res.status(500).json({ error: "Failed to delete service mapping" });
  }
});

app.get("/weekly-report/settings/service-catalog", async (req: Request, res: Response) => {
  try {
    const term = typeof req.query.q === "string" ? req.query.q : "";
    if (!term.trim()) {
      return res.json([]);
    }

    const rows = await searchWeeklyReportServiceCatalogByTerm(term);
    return res.json(rows);
  } catch (error) {
    logger.error("Failed to query weekly report service catalog", error);
    return res.status(500).json({ error: "Failed to query service catalog" });
  }
});

export function startServer(): void {
  app.listen(config.port, () => {
    logger.info(`FDC LAN Bridge Health Server listening on port ${config.port}`);
  });
}
