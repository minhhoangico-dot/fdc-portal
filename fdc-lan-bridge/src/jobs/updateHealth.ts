import { checkHisConnection } from "../db/his";
import { checkMisaConnection } from "../db/misa";
import { supabase } from "../db/supabase";
import { BRIDGE_HEALTH_ROW_ID } from "../lib/bridgeHealth";
import { logger } from "../lib/logger";

export async function updateHealthJob(): Promise<void> {
  try {
    const hisHealthy = await checkHisConnection();
    const misaHealthy = await checkMisaConnection();
    const overallStatus = hisHealthy && misaHealthy ? "online" : "degraded";
    const timestamp = new Date().toISOString();

    const { error, status } = await supabase.from("fdc_sync_health").upsert({
      id: BRIDGE_HEALTH_ROW_ID,
      bridge_status: overallStatus,
      last_heartbeat: timestamp,
      his_connected: hisHealthy,
      misa_connected: misaHealthy,
      face_connected: false,
      updated_at: timestamp,
    });

    if (error) {
      logger.error(`Failed to update fdc_sync_health heartbeat: ${error.message}`, {
        code: error.code,
        details: error.details,
        hint: error.hint,
        status,
      });
      return;
    }

    logger.info(`Health heartbeat updated: ${overallStatus} (HIS=${hisHealthy}, MISA=${misaHealthy})`);
  } catch (err) {
    logger.error("Failed health heartbeat job", err);
  }
}

