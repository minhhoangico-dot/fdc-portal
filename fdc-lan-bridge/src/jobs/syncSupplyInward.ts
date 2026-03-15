import mssql from "mssql";
import { supabase } from "../db/supabase";
import { misaPool } from "../db/misa";
import { logger } from "../lib/logger";
import { logSync } from "../lib/syncLog";

const SUPPLY_INWARD_LOOKBACK_DAYS = 365;

export async function syncSupplyInwardJob(): Promise<void> {
  const startTime = Date.now();
  let recordsSynced = 0;

  try {
    logger.info("Starting syncSupplyInwardJob...");

    if (!misaPool.connected) {
      await misaPool.connect();
    }

    const request = new mssql.Request(misaPool);
    const result = await request.query(`
            SELECT
                CONVERT(VARCHAR(10), l.PostedDate, 23) as report_date,
                SUBSTRING(MAX(l.AccountNumber), 1, 4) as account,
                l.InventoryItemCode as item_code,
                MAX(l.InventoryItemName) as item_name,
                SUM(ISNULL(l.InwardQuantity, 0)) as inward_qty,
                SUM(ISNULL(l.InwardAmount, 0)) as inward_amount
            FROM InventoryLedger l
            WHERE l.AccountNumber LIKE '152%'
              AND CAST(l.PostedDate AS date) >= CAST(DATEADD(DAY, -${SUPPLY_INWARD_LOOKBACK_DAYS}, GETDATE()) AS date)
              AND l.InwardQuantity > 0
            GROUP BY CONVERT(VARCHAR(10), l.PostedDate, 23), l.InventoryItemCode
        `);

    const inwards = result.recordset as any[];
    logger.info(
      `Found ${inwards.length} inward records in MISA for recent days.`,
    );

    if (inwards.length === 0) {
      await logSync(
        "syncSupplyInward",
        "completed",
        "MISA",
        0,
        null,
        Date.now() - startTime,
      );
      return;
    }

    const payload = inwards.map((r) => ({
      report_date: r.report_date,
      account: r.account,
      item_code: r.item_code,
      item_name: r.item_name,
      inward_qty: Number(r.inward_qty) || 0,
      inward_amount: Number(r.inward_amount) || 0,
    }));

    const { error } = await supabase
      .from("fdc_supply_inward_daily")
      .upsert(payload, { onConflict: "report_date,account,item_code" });

    if (error) {
      logger.error("Error inserting Supabase inward records:", error);
      throw error;
    }

    recordsSynced = payload.length;
    await logSync(
      "syncSupplyInward",
      "completed",
      "MISA",
      recordsSynced,
      null,
      Date.now() - startTime,
    );
    logger.info(`syncSupplyInwardJob completed for ${recordsSynced} records.`);
  } catch (error: any) {
    logger.error("syncSupplyInwardJob failed:", error);
    await logSync(
      "syncSupplyInward",
      "failed",
      "MISA",
      recordsSynced,
      error?.message ?? String(error),
      Date.now() - startTime,
    );
  }
}
