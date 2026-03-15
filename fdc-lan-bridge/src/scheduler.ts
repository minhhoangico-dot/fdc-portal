import cron from "node-cron";
import { logger } from "./lib/logger";
import { syncInventoryJob } from "./jobs/syncInventory";
import { syncPatientVolumeJob } from "./jobs/syncPatientVolume";
import { syncMisaPaymentsJob } from "./jobs/syncMisaPayments";
import { scanMisaPhieuchiJob } from "./jobs/scanMisaPhieuchi";
import { syncAttendanceJob } from "./jobs/syncAttendance";
import { syncMisaSuppliesJob } from "./jobs/syncMisaSupplies";
import { updateHealthJob } from "./jobs/updateHealth";
import { syncMedicineImportsJob } from "./jobs/syncMedicineImports";
import { detectAnomaliesJob } from "./jobs/detectAnomalies";
import { syncSupplyConsumptionJob } from "./jobs/syncSupplyConsumption";
import { syncSupplyInwardJob } from "./jobs/syncSupplyInward";
import { syncSupplyMonthlyStatsJob } from "./jobs/syncSupplyMonthlyStats";

export function startScheduler(): void {
  logger.info("Initializing Node Cron Scheduler...");

  cron.schedule("* * * * *", updateHealthJob);
  logger.info("Cron registered: updateHealthJob (Every 1 minute: * * * * *)");

  cron.schedule("*/5 * * * *", syncMisaPaymentsJob);
  logger.info("Cron registered: syncMisaPaymentsJob (Every 5 minutes: */5 * * * *)");

  cron.schedule("*/5 * * * *", scanMisaPhieuchiJob);
  logger.info("Cron registered: scanMisaPhieuchiJob (Every 5 minutes: */5 * * * *)");

  cron.schedule("*/15 * * * *", syncAttendanceJob);
  logger.info("Cron registered: syncAttendanceJob (Every 15 minutes: */15 * * * *)");

  cron.schedule("0 6 * * *", async () => {
    logger.info("Running scheduled syncInventoryJob (Medicine)...");
    await syncInventoryJob();

    logger.info("Running scheduled detectAnomaliesJob...");
    await detectAnomaliesJob();

    logger.info("Running scheduled syncMisaSuppliesJob (Supplies)...");
    await syncMisaSuppliesJob();

    logger.info("Running scheduled syncPatientVolumeJob...");
    void syncPatientVolumeJob();

    logger.info("Running scheduled syncMedicineImportsJob...");
    void syncMedicineImportsJob();

    logger.info("Running scheduled syncSupplyConsumptionJob...");
    await syncSupplyConsumptionJob();

    logger.info("Running scheduled syncSupplyInwardJob...");
    await syncSupplyInwardJob();

    logger.info("Running scheduled syncSupplyMonthlyStatsJob...");
    await syncSupplyMonthlyStatsJob();
  });
}

