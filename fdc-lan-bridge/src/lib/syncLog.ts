import { supabase } from "../db/supabase";
import { logger } from "./logger";

export async function logSync(
  syncType: string,
  status: string,
  source: string,
  recordsSynced: number,
  errorMessage: string | null = null,
  durationMs = 0,
): Promise<void> {
  const now = new Date();
  const startedAt = new Date(now.getTime() - durationMs);

  try {
    const { error } = await supabase.from("fdc_sync_logs").insert({
      sync_type: syncType,
      status,
      source,
      records_synced: recordsSynced,
      error_message: errorMessage,
      started_at: startedAt.toISOString(),
      completed_at: now.toISOString(),
    });

    if (error) {
      logger.error(`Failed to insert sync log. Error: ${error.message}`);
    } else {
      logger.info(
        `Sync log recorded: ${syncType} (${status}) - Records: ${recordsSynced}`,
      );
    }
  } catch (err) {
    logger.error("Error writing to fdc_sync_logs", err);
  }
}

