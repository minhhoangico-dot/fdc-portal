import { hisPool } from "../db/his";
import { supabase } from "../db/supabase";
import { addDays, toHoChiMinhDate } from "../lib/date";
import { logger } from "../lib/logger";
import {
  aggregateDailyValuesFromSnapshots,
  buildMissingPharmacySnapshots,
  InventorySnapshotWriteRow,
  PharmacyInventoryDelta,
  PharmacySnapshotMeta,
  PharmacySnapshotSeed,
} from "../lib/pharmacyInventorySync";
import { logSync } from "../lib/syncLog";

const SNAPSHOT_BATCH_SIZE = 500;
const DAILY_VALUE_BATCH_SIZE = 180;

const PHARMACY_LOT_METADATA_CTE = `
  SELECT
    'S' || s.medicinestoreid as his_medicineid,
    d.medicinecode as medicine_code,
    d.medicinename as name,
    d.donvisudung as unit,
    dep.departmentname as warehouse_name,
    d.medicine_solo as batch_number,
    CASE
      WHEN d.medicine_hsdyear > 0
      THEN TO_DATE(
        d.medicine_hsdyear || '-' ||
        LPAD(d.medicine_hsdmonth::text, 2, '0') || '-' ||
        LPAD(d.medicine_hsdday::text, 2, '0'),
        'YYYY-MM-DD'
      )
      ELSE NULL
    END as expiry_date,
    COALESCE(d.medicine_gia, 0) +
      (COALESCE(d.medicine_gia, 0) * COALESCE(d.medicine_gia_vat, 0) / 100) as unit_price
  FROM tb_medicinestore s
  JOIN (
    SELECT DISTINCT ON (medicineid)
      medicineid,
      medicinecode,
      medicinename,
      donvisudung,
      medicine_solo,
      medicine_hsdday,
      medicine_hsdmonth,
      medicine_hsdyear,
      medicine_gia,
      medicine_gia_vat
    FROM tb_medicinedata
    ORDER BY
      medicineid,
      CASE WHEN medicine_solo IS NOT NULL AND medicine_solo <> '' THEN 0 ELSE 1 END,
      medicinedataid DESC
  ) d ON s.medicineid = d.medicineid
  LEFT JOIN tb_department dep ON s.departmentid = dep.departmentid
  WHERE s.departmentid <> 6
    AND (s.roomid IS NULL OR s.roomid NOT IN (69, 108))
`;

const PHARMACY_CURRENT_SNAPSHOT_QUERY = `
  SELECT
    meta.his_medicineid,
    meta.medicine_code,
    meta.name,
    meta.unit,
    meta.warehouse_name,
    s.soluongtonkho as current_stock,
    COALESCE(e.day_export, 0) as approved_export,
    meta.batch_number,
    meta.expiry_date,
    meta.unit_price
  FROM tb_medicinestore s
  JOIN (
    ${PHARMACY_LOT_METADATA_CTE}
  ) meta ON meta.his_medicineid = 'S' || s.medicinestoreid
  LEFT JOIN (
    SELECT medicineid_org as medicineid, SUM(soluong) as day_export
    FROM tb_medicinedata
    WHERE medicine_export_date::date = $1::date
      AND medicine_export_status = 1
    GROUP BY medicineid_org
  ) e ON s.medicineid = e.medicineid
  WHERE s.soluongtonkho > 0
    AND s.departmentid <> 6
    AND (s.roomid IS NULL OR s.roomid NOT IN (69, 108))
`;

const PHARMACY_IMPORT_DELTAS_QUERY = `
  SELECT
    'S' || s.medicinestoreid as his_medicineid,
    d.medicine_import_date::date::text as snapshot_date,
    SUM(COALESCE(d.soluong, 0)) as quantity
  FROM tb_medicinedata d
  JOIN tb_medicinestore s ON s.medicineid = d.medicineid
  WHERE d.medicine_import_status = 1
    AND d.medicine_import_date IS NOT NULL
    AND d.medicine_import_date::date >= $1::date
    AND d.medicine_import_date::date <= $2::date
    AND s.departmentid <> 6
    AND (s.roomid IS NULL OR s.roomid NOT IN (69, 108))
  GROUP BY 1, 2
`;

const PHARMACY_EXPORT_DELTAS_QUERY = `
  SELECT
    'S' || s.medicinestoreid as his_medicineid,
    d.medicine_export_date::date::text as snapshot_date,
    SUM(COALESCE(d.soluong, 0)) as quantity
  FROM tb_medicinedata d
  JOIN tb_medicinestore s ON s.medicineid = d.medicineid_org
  WHERE d.medicine_export_status = 1
    AND d.medicine_export_date IS NOT NULL
    AND d.medicine_export_date::date >= $1::date
    AND d.medicine_export_date::date <= $2::date
    AND s.departmentid <> 6
    AND (s.roomid IS NULL OR s.roomid NOT IN (69, 108))
  GROUP BY 1, 2
`;

type CurrentSnapshotRow = {
  his_medicineid: string;
  medicine_code: string | null;
  name: string;
  unit: string | null;
  warehouse_name: string | null;
  current_stock: number | string | null;
  approved_export: number | string | null;
  batch_number: string | null;
  expiry_date: string | null;
  unit_price: number | string | null;
};

type SnapshotDateRow = {
  snapshot_date: string;
};

type SnapshotAggregateRow = {
  snapshot_date: string;
  current_stock: number | string | null;
  unit_price: number | string | null;
};

type SupabaseBaselineSnapshotRow = {
  his_medicineid: string;
  medicine_code: string | null;
  name: string;
  category: string | null;
  warehouse: string;
  current_stock: number | string | null;
  unit: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  unit_price: number | string | null;
};

type HisInventoryDeltaRow = {
  his_medicineid: string;
  snapshot_date: string;
  quantity: number | string | null;
};

const toPharmacySnapshotWriteRow = (
  item: CurrentSnapshotRow,
  snapshotDate: string,
): InventorySnapshotWriteRow => ({
  his_medicineid: item.his_medicineid,
  medicine_code: item.medicine_code ?? null,
  name: item.name,
  category: "Khac",
  warehouse: item.warehouse_name || "Kho Tong",
  current_stock: Number(item.current_stock) || 0,
  approved_export: Number(item.approved_export) || 0,
  unit: item.unit || "Cai",
  status: "in_stock",
  snapshot_date: snapshotDate,
  batch_number: item.batch_number ?? null,
  expiry_date: item.expiry_date ?? null,
  unit_price: Number(item.unit_price) || 0,
});

const pharmacySnapshotSelect = (columns: string) =>
  supabase
    .from("fdc_inventory_snapshots")
    .select(columns)
    .not("his_medicineid", "is", null)
    .not("his_medicineid", "like", "misa_%");

async function fetchLatestPharmacySnapshotDate(): Promise<string | null> {
  const { data, error } = await supabase
    .from("fdc_inventory_snapshots")
    .select("snapshot_date")
    .not("his_medicineid", "is", null)
    .not("his_medicineid", "like", "misa_%")
    .order("snapshot_date", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0]?.snapshot_date ?? null;
}

async function fetchLatestPharmacyDailyValueDate(): Promise<string | null> {
  const { data, error } = await supabase
    .from("fdc_inventory_daily_value")
    .select("snapshot_date")
    .eq("module_type", "pharmacy")
    .order("snapshot_date", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0]?.snapshot_date ?? null;
}

async function fetchBaselineSnapshots(
  snapshotDate: string,
): Promise<PharmacySnapshotSeed[]> {
  let from = 0;
  let hasMore = true;
  const rows: PharmacySnapshotSeed[] = [];

  while (hasMore) {
    const { data, error } = await pharmacySnapshotSelect(
      "his_medicineid, medicine_code, name, category, warehouse, current_stock, unit, batch_number, expiry_date, unit_price",
    )
      .eq("snapshot_date", snapshotDate)
      .order("his_medicineid", { ascending: true })
      .range(from, from + SNAPSHOT_BATCH_SIZE - 1);

    if (error) {
      throw error;
    }

    const batch = ((data || []) as unknown) as SupabaseBaselineSnapshotRow[];
    rows.push(
      ...batch.map((row) => ({
        his_medicineid: row.his_medicineid,
        medicine_code: row.medicine_code,
        name: row.name,
        category: row.category,
        warehouse: row.warehouse,
        current_stock: Number(row.current_stock) || 0,
        unit: row.unit,
        batch_number: row.batch_number,
        expiry_date: row.expiry_date,
        unit_price: Number(row.unit_price) || 0,
      })),
    );

    from += SNAPSHOT_BATCH_SIZE;
    hasMore = batch.length === SNAPSHOT_BATCH_SIZE;
  }

  return rows;
}

async function fetchPharmacyLotMetadata(): Promise<Map<string, PharmacySnapshotMeta>> {
  const result = await hisPool.query(PHARMACY_LOT_METADATA_CTE);
  const rows = result.rows as Array<{
    his_medicineid: string;
    medicine_code: string | null;
    name: string;
    unit: string | null;
    warehouse_name: string | null;
    batch_number: string | null;
    expiry_date: string | null;
    unit_price: number | string | null;
  }>;

  const metadata = new Map<string, PharmacySnapshotMeta>();
  rows.forEach((row) => {
    metadata.set(row.his_medicineid, {
      his_medicineid: row.his_medicineid,
      medicine_code: row.medicine_code,
      name: row.name,
      category: "Khac",
      warehouse: row.warehouse_name || "Kho Tong",
      unit: row.unit || "Cai",
      batch_number: row.batch_number,
      expiry_date: row.expiry_date,
      unit_price: Number(row.unit_price) || 0,
    });
  });

  return metadata;
}

async function fetchPharmacyDeltas(
  query: string,
  startDate: string,
  endDate: string,
): Promise<PharmacyInventoryDelta[]> {
  if (startDate > endDate) {
    return [];
  }

  const result = await hisPool.query(query, [startDate, endDate]);
  const rows = result.rows as HisInventoryDeltaRow[];

  return rows.map((row) => ({
    his_medicineid: row.his_medicineid,
    snapshot_date: row.snapshot_date,
    quantity: Number(row.quantity) || 0,
  }));
}

async function fetchCurrentPharmacySnapshotRows(
  snapshotDate: string,
): Promise<InventorySnapshotWriteRow[]> {
  const result = await hisPool.query(PHARMACY_CURRENT_SNAPSHOT_QUERY, [snapshotDate]);
  const rows = result.rows as CurrentSnapshotRow[];

  return rows.map((row) => toPharmacySnapshotWriteRow(row, snapshotDate));
}

async function upsertSnapshotRows(rows: InventorySnapshotWriteRow[]): Promise<void> {
  for (let index = 0; index < rows.length; index += SNAPSHOT_BATCH_SIZE) {
    const batch = rows.slice(index, index + SNAPSHOT_BATCH_SIZE);
    const { error } = await supabase
      .from("fdc_inventory_snapshots")
      .upsert(batch, {
        onConflict: "his_medicineid,warehouse,snapshot_date",
      });

    if (error) {
      throw error;
    }
  }
}

async function fetchSnapshotRowsForDailyAggregation(
  startDate: string,
  endDate: string,
): Promise<SnapshotAggregateRow[]> {
  let from = 0;
  let hasMore = true;
  const rows: SnapshotAggregateRow[] = [];

  while (hasMore) {
    const { data, error } = await pharmacySnapshotSelect(
      "snapshot_date, current_stock, unit_price",
    )
      .gte("snapshot_date", startDate)
      .lte("snapshot_date", endDate)
      .order("snapshot_date", { ascending: true })
      .range(from, from + SNAPSHOT_BATCH_SIZE - 1);

    if (error) {
      throw error;
    }

    const batch = ((data || []) as unknown) as SnapshotAggregateRow[];
    rows.push(...batch);
    from += SNAPSHOT_BATCH_SIZE;
    hasMore = batch.length === SNAPSHOT_BATCH_SIZE;
  }

  return rows;
}

async function upsertDailyValueRows(
  rows: ReturnType<typeof aggregateDailyValuesFromSnapshots>,
): Promise<void> {
  for (let index = 0; index < rows.length; index += DAILY_VALUE_BATCH_SIZE) {
    const batch = rows.slice(index, index + DAILY_VALUE_BATCH_SIZE);
    const { error } = await supabase
      .from("fdc_inventory_daily_value")
      .upsert(batch, { onConflict: "snapshot_date,module_type" });

    if (error) {
      throw error;
    }
  }
}

async function cleanupOldPharmacySnapshots(cutoffDate: string): Promise<void> {
  const { error } = await supabase
    .from("fdc_inventory_snapshots")
    .delete()
    .not("his_medicineid", "is", null)
    .not("his_medicineid", "like", "misa_%")
    .lt("snapshot_date", cutoffDate);

  if (error) {
    logger.warn("Failed to clean up old snapshots:", error);
  }
}

export async function syncInventoryJob(): Promise<void> {
  const startTime = Date.now();
  let recordsSynced = 0;

  try {
    logger.info("Starting syncInventoryJob (Pharmacy snapshots + backfill)...");

    const todayDate = toHoChiMinhDate();
    const latestSnapshotDate = await fetchLatestPharmacySnapshotDate();
    const latestDailyValueDate = await fetchLatestPharmacyDailyValueDate();

    logger.info(
      `syncInventoryJob: latest snapshot=${latestSnapshotDate ?? "none"}, latest daily value=${latestDailyValueDate ?? "none"}, today=${todayDate}`,
    );

    let firstBackfilledSnapshotDate: string | null = null;

    if (latestSnapshotDate && latestSnapshotDate < todayDate) {
      const backfillStartDate = addDays(latestSnapshotDate, 1);
      const backfillEndDate = addDays(todayDate, -1);

      if (backfillStartDate <= backfillEndDate) {
        logger.info(
          `syncInventoryJob: backfilling missing pharmacy snapshots from ${backfillStartDate} to ${backfillEndDate}.`,
        );

        const [baselineSnapshots, metadataByHisMedicineId, importDeltas, exportDeltas] =
          await Promise.all([
            fetchBaselineSnapshots(latestSnapshotDate),
            fetchPharmacyLotMetadata(),
            fetchPharmacyDeltas(PHARMACY_IMPORT_DELTAS_QUERY, backfillStartDate, backfillEndDate),
            fetchPharmacyDeltas(PHARMACY_EXPORT_DELTAS_QUERY, backfillStartDate, backfillEndDate),
          ]);

        if (baselineSnapshots.length === 0) {
          logger.warn(
            `syncInventoryJob: expected baseline snapshots on ${latestSnapshotDate} but found none; skipping historical snapshot backfill.`,
          );
        } else {
          const historicalSnapshots = buildMissingPharmacySnapshots({
            baselineSnapshots,
            metadataByHisMedicineId,
            importDeltas,
            exportDeltas,
            startDate: backfillStartDate,
            endDate: backfillEndDate,
          });

          if (historicalSnapshots.length > 0) {
            await upsertSnapshotRows(historicalSnapshots);
            recordsSynced += historicalSnapshots.length;
            firstBackfilledSnapshotDate = backfillStartDate;
            logger.info(
              `syncInventoryJob: upserted ${historicalSnapshots.length} historical pharmacy snapshot rows.`,
            );
          }
        }
      }
    }

    const currentSnapshotRows = await fetchCurrentPharmacySnapshotRows(todayDate);
    await upsertSnapshotRows(currentSnapshotRows);
    recordsSynced += currentSnapshotRows.length;
    logger.info(
      `syncInventoryJob: upserted ${currentSnapshotRows.length} current pharmacy snapshot rows for ${todayDate}.`,
    );

    const nextDailyValueDate = latestDailyValueDate
      ? addDays(latestDailyValueDate, 1)
      : todayDate;

    const aggregateStartDate = [todayDate, nextDailyValueDate, firstBackfilledSnapshotDate]
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => left.localeCompare(right))[0];

    const snapshotRowsForAggregation = await fetchSnapshotRowsForDailyAggregation(
      aggregateStartDate,
      todayDate,
    );

    const dailyValueRows = aggregateDailyValuesFromSnapshots(
      snapshotRowsForAggregation.map((row) => ({
        snapshot_date: row.snapshot_date,
        current_stock: Number(row.current_stock) || 0,
        unit_price: Number(row.unit_price) || 0,
      })),
      "pharmacy",
    );

    if (dailyValueRows.length > 0) {
      await upsertDailyValueRows(dailyValueRows);
      recordsSynced += dailyValueRows.length;
      logger.info(
        `syncInventoryJob: upserted ${dailyValueRows.length} pharmacy daily aggregate rows from ${aggregateStartDate} to ${todayDate}.`,
      );
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoffDate = toHoChiMinhDate(ninetyDaysAgo);
    await cleanupOldPharmacySnapshots(cutoffDate);

    await logSync(
      "syncInventory",
      "completed",
      "HIS",
      recordsSynced,
      null,
      Date.now() - startTime,
    );

    logger.info(
      `syncInventoryJob completed. Synced ${recordsSynced} rows in ${Date.now() - startTime}ms`,
    );
  } catch (err: any) {
    logger.error("Error in syncInventoryJob:", err);
    await logSync(
      "syncInventory",
      "failed",
      "HIS",
      recordsSynced,
      err?.message ?? String(err),
      Date.now() - startTime,
    );
  }
}
