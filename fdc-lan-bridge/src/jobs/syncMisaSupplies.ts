import mssql from "mssql";
import { supabase } from "../db/supabase";
import { misaPool } from "../db/misa";
import { toHoChiMinhDate } from "../lib/date";
import { logger } from "../lib/logger";
import { logSync } from "../lib/syncLog";

export async function syncMisaSuppliesJob(): Promise<void> {
  const startTime = Date.now();
  let recordsSynced = 0;

  try {
    logger.info("Starting syncMisaSuppliesJob...");

    if (!misaPool.connected) {
      await misaPool.connect();
    }

    const request = new mssql.Request(misaPool);
    const result = await request.query(`
            SELECT 
                i.InventoryItemCode,
                MAX(i.InventoryItemName) as InventoryItemName,
                MAX(i.InventoryAccount) as InventoryAccount,
                MAX(CAST(i.UnitID AS VARCHAR(36))) as UnitID,
                SUM(ISNULL(l.InwardQuantity, 0)) - SUM(ISNULL(l.OutwardQuantity, 0)) as balance,
                SUM(ISNULL(l.InwardAmount, 0)) - SUM(ISNULL(l.OutwardAmount, 0)) as total_value
            FROM InventoryItem i
            LEFT JOIN InventoryLedger l ON i.InventoryItemID = l.InventoryItemID
            WHERE i.InventoryAccount LIKE '152%'
            GROUP BY i.InventoryItemCode
            HAVING SUM(ISNULL(l.InwardQuantity, 0)) - SUM(ISNULL(l.OutwardQuantity, 0)) > 0
        `);

    const supplies = result.recordset as any[];
    logger.info(
      `Found ${supplies.length} supply items in MISA with positive stock`,
    );

    const unitResult = await request.query(`
             SELECT CAST(UnitID AS VARCHAR(36)) as UnitID, UnitName FROM Unit
        `);
    const unitMap: Record<string, string> = {};
    (unitResult.recordset as any[]).forEach((u) => {
      unitMap[u.UnitID] = u.UnitName;
    });

    const snapshotDate = toHoChiMinhDate();

    const payload = supplies.map((item) => {
      const stock = Number(item.balance) || 0;
      const totalValue = Number(item.total_value) || 0;
      const price = stock > 0 ? totalValue / stock : 0;
      const unitName = item.UnitID ? unitMap[item.UnitID] : "Cái";

      let category = "Vật tư";
      if (item.InventoryAccount?.startsWith("1521")) category = "Nguyên vật liệu";
      if (item.InventoryAccount?.startsWith("1522")) category = "Vật tư y tế";
      if (item.InventoryAccount?.startsWith("1523")) category = "Văn phòng phẩm";

      return {
        misa_inventory_id: item.InventoryItemCode,
        his_medicineid: `misa_${item.InventoryItemCode}`,
        name: item.InventoryItemName || `Vật tư ${item.InventoryItemCode}`,
        category,
        warehouse: "Khối Vật Tư",
        current_stock: stock,
        approved_export: 0,
        unit_price: price,
        unit: unitName || "Cái",
        status: stock > 0 ? "in_stock" : "out_of_stock",
        snapshot_date: snapshotDate,
      };
    });

    const batchSize = 500;
    for (let i = 0; i < payload.length; i += batchSize) {
      const batch = payload.slice(i, i + batchSize);
      const { error } = await supabase
        .from("fdc_inventory_snapshots")
        .upsert(batch, { onConflict: "his_medicineid,snapshot_date" });
      if (error) {
        logger.error(
          `Error inserting Supabase inventory batch ${i / batchSize}:`,
          error,
        );
        throw error;
      }
    }

    const totalStock = payload.reduce(
      (sum, item) => sum + (Number(item.current_stock) || 0),
      0,
    );
    const totalValue = payload.reduce(
      (sum, item) =>
        sum +
        (Number(item.current_stock) || 0) * (Number(item.unit_price) || 0),
      0,
    );

    const { error: aggError } = await supabase
      .from("fdc_inventory_daily_value")
      .upsert(
        [
          {
            snapshot_date: snapshotDate,
            module_type: "inventory",
            total_stock: totalStock,
            total_value: totalValue,
          },
        ],
        { onConflict: "snapshot_date,module_type" },
      );

    if (aggError) {
      logger.error(
        "Failed to upsert fdc_inventory_daily_value aggregate",
        aggError,
      );
    }

    recordsSynced = payload.length;
    await logSync(
      "syncMisaSupplies",
      "completed",
      "MISA",
      recordsSynced,
      null,
      Date.now() - startTime,
    );
    logger.info(`syncMisaSuppliesJob completed for ${recordsSynced} records.`);
  } catch (error: any) {
    logger.error("syncMisaSuppliesJob failed:", error);
    await logSync(
      "syncMisaSupplies",
      "failed",
      "MISA",
      recordsSynced,
      error?.message ?? String(error),
      Date.now() - startTime,
    );
  }
}

