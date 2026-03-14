import mssql from "mssql";
import { misaPool } from "../db/misa";
import { supabase } from "../db/supabase";
import { addDays, toHoChiMinhDate } from "../lib/date";
import { logger } from "../lib/logger";
import {
  aggregateDailyValuesFromSnapshots,
  InventorySnapshotWriteRow,
} from "../lib/pharmacyInventorySync";
import {
  buildMisaInventorySnapshotsFromDeltas,
  MisaInventoryDelta,
  MisaInventorySnapshotMeta,
  MisaInventorySnapshotSeed,
} from "../lib/misaInventorySync";
import { logSync } from "../lib/syncLog";

const SNAPSHOT_BATCH_SIZE = 500;
const DAILY_VALUE_BATCH_SIZE = 180;

const MISA_WAREHOUSE_NAME = "Kh\u1ed1i V\u1eadt T\u01b0";
const DEFAULT_UNIT = "C\u00e1i";
const DEFAULT_CATEGORY = "V\u1eadt t\u01b0";

const MISA_CURRENT_SNAPSHOT_QUERY = `
  SELECT
    i.InventoryItemCode,
    MAX(i.InventoryItemName) as InventoryItemName,
    MAX(i.InventoryAccount) as InventoryAccount,
    MAX(u.UnitName) as UnitName,
    SUM(ISNULL(l.InwardQuantity, 0)) - SUM(ISNULL(l.OutwardQuantity, 0)) as balance,
    SUM(ISNULL(l.InwardAmount, 0)) - SUM(ISNULL(l.OutwardAmount, 0)) as total_value
  FROM InventoryItem i
  LEFT JOIN InventoryLedger l ON i.InventoryItemID = l.InventoryItemID
  LEFT JOIN Unit u ON CAST(u.UnitID AS VARCHAR(36)) = CAST(i.UnitID AS VARCHAR(36))
  WHERE i.InventoryAccount LIKE '152%'
  GROUP BY i.InventoryItemCode
  HAVING SUM(ISNULL(l.InwardQuantity, 0)) - SUM(ISNULL(l.OutwardQuantity, 0)) > 0
`;

const MISA_METADATA_QUERY = `
  SELECT
    i.InventoryItemCode,
    MAX(i.InventoryItemName) as InventoryItemName,
    MAX(i.InventoryAccount) as InventoryAccount,
    MAX(u.UnitName) as UnitName
  FROM InventoryItem i
  LEFT JOIN Unit u ON CAST(u.UnitID AS VARCHAR(36)) = CAST(i.UnitID AS VARCHAR(36))
  WHERE i.InventoryAccount LIKE '152%'
  GROUP BY i.InventoryItemCode
`;

const MISA_BASELINE_QUERY = `
  SELECT
    i.InventoryItemCode,
    SUM(ISNULL(l.InwardQuantity, 0)) - SUM(ISNULL(l.OutwardQuantity, 0)) as balance,
    SUM(ISNULL(l.InwardAmount, 0)) - SUM(ISNULL(l.OutwardAmount, 0)) as total_value
  FROM InventoryItem i
  LEFT JOIN InventoryLedger l
    ON i.InventoryItemID = l.InventoryItemID
   AND l.RefDate < @startDate
  WHERE i.InventoryAccount LIKE '152%'
  GROUP BY i.InventoryItemCode
  HAVING
    ABS(SUM(ISNULL(l.InwardQuantity, 0)) - SUM(ISNULL(l.OutwardQuantity, 0))) > 0
    OR ABS(SUM(ISNULL(l.InwardAmount, 0)) - SUM(ISNULL(l.OutwardAmount, 0))) > 0
`;

const MISA_DAILY_DELTAS_QUERY = `
  SELECT
    CONVERT(varchar(10), CAST(l.RefDate AS date), 23) as snapshot_date,
    i.InventoryItemCode,
    SUM(ISNULL(l.InwardQuantity, 0) - ISNULL(l.OutwardQuantity, 0)) as delta_stock,
    SUM(ISNULL(l.InwardAmount, 0) - ISNULL(l.OutwardAmount, 0)) as delta_value
  FROM InventoryLedger l
  JOIN InventoryItem i ON i.InventoryItemID = l.InventoryItemID
  WHERE i.InventoryAccount LIKE '152%'
    AND l.RefDate >= @startDate
    AND l.RefDate < DATEADD(DAY, 1, @endDate)
  GROUP BY CAST(l.RefDate AS date), i.InventoryItemCode
  HAVING
    ABS(SUM(ISNULL(l.InwardQuantity, 0) - ISNULL(l.OutwardQuantity, 0))) > 0
    OR ABS(SUM(ISNULL(l.InwardAmount, 0) - ISNULL(l.OutwardAmount, 0))) > 0
`;

type MisaCurrentSnapshotRow = {
  InventoryItemCode: string | null;
  InventoryItemName: string | null;
  InventoryAccount: string | null;
  UnitName: string | null;
  balance: number | string | null;
  total_value: number | string | null;
};

type MisaMetadataRow = {
  InventoryItemCode: string | null;
  InventoryItemName: string | null;
  InventoryAccount: string | null;
  UnitName: string | null;
};

type MisaBaselineRow = {
  InventoryItemCode: string | null;
  balance: number | string | null;
  total_value: number | string | null;
};

type MisaDeltaRow = {
  snapshot_date: string | Date;
  InventoryItemCode: string | null;
  delta_stock: number | string | null;
  delta_value: number | string | null;
};

type SnapshotAggregateRow = {
  snapshot_date: string;
  current_stock: number | string | null;
  unit_price: number | string | null;
};

type MisaSyncOptions =
  | {
      kind: "incremental";
      logName: "syncMisaSupplies";
    }
  | {
      kind: "backfill";
      days: number;
      logName: "backfillMisaInventorySnapshots";
    };

const misaSnapshotSelect = (columns: string) =>
  supabase
    .from("fdc_inventory_snapshots")
    .select(columns)
    .like("his_medicineid", "misa_%");

const toMisaHisMedicineId = (inventoryItemCode: string): string =>
  `misa_${inventoryItemCode}`;

const toSnapshotDateString = (value: string | Date): string =>
  typeof value === "string" ? value.slice(0, 10) : toHoChiMinhDate(new Date(value));

const toPositiveNumber = (value: number | string | null | undefined): number =>
  Number(value) || 0;

const isNotNull = <T,>(value: T | null): value is T => value !== null;

const toCategory = (inventoryAccount: string | null | undefined): string => {
  if (inventoryAccount?.startsWith("1521")) {
    return "Nguy\u00ean v\u1eadt li\u1ec7u";
  }
  if (inventoryAccount?.startsWith("1522")) {
    return "V\u1eadt t\u01b0 y t\u1ebf";
  }
  if (inventoryAccount?.startsWith("1523")) {
    return "V\u0103n ph\u00f2ng ph\u1ea9m";
  }
  return DEFAULT_CATEGORY;
};

const normalizeItemName = (
  inventoryItemName: string | null | undefined,
  inventoryItemCode: string,
): string => inventoryItemName?.trim() || `V\u1eadt t\u01b0 ${inventoryItemCode}`;

const normalizeUnitName = (unitName: string | null | undefined): string =>
  unitName?.trim() || DEFAULT_UNIT;

async function ensureMisaConnected(): Promise<void> {
  if (!misaPool.connected) {
    await misaPool.connect();
  }
}

async function fetchLatestMisaSnapshotDate(): Promise<string | null> {
  const { data, error } = await misaSnapshotSelect("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const rows = ((data || []) as unknown) as Array<{ snapshot_date: string }>;
  return rows[0]?.snapshot_date ?? null;
}

async function fetchLatestMisaDailyValueDate(): Promise<string | null> {
  const { data, error } = await supabase
    .from("fdc_inventory_daily_value")
    .select("snapshot_date")
    .eq("module_type", "inventory")
    .order("snapshot_date", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const rows = ((data || []) as unknown) as Array<{ snapshot_date: string }>;
  return rows[0]?.snapshot_date ?? null;
}

async function fetchMisaInventoryMetadata(): Promise<
  Map<string, MisaInventorySnapshotMeta>
> {
  const result = await new mssql.Request(misaPool).query(MISA_METADATA_QUERY);
  const rows = result.recordset as MisaMetadataRow[];

  const metadata = new Map<string, MisaInventorySnapshotMeta>();

  for (const row of rows) {
    const inventoryItemCode = row.InventoryItemCode?.trim();
    if (!inventoryItemCode) {
      continue;
    }

    const hisMedicineId = toMisaHisMedicineId(inventoryItemCode);
    metadata.set(hisMedicineId, {
      his_medicineid: hisMedicineId,
      medicine_code: inventoryItemCode,
      name: normalizeItemName(row.InventoryItemName, inventoryItemCode),
      category: toCategory(row.InventoryAccount),
      warehouse: MISA_WAREHOUSE_NAME,
      unit: normalizeUnitName(row.UnitName),
    });
  }

  return metadata;
}

async function fetchBaselineMisaSnapshots(
  startDate: string,
  metadataByHisMedicineId: Map<string, MisaInventorySnapshotMeta>,
): Promise<MisaInventorySnapshotSeed[]> {
  const request = new mssql.Request(misaPool);
  request.input("startDate", mssql.Date, startDate);

  const result = await request.query(MISA_BASELINE_QUERY);
  const rows = result.recordset as MisaBaselineRow[];

  return rows
    .map((row): MisaInventorySnapshotSeed | null => {
      const inventoryItemCode = row.InventoryItemCode?.trim();
      if (!inventoryItemCode) {
        return null;
      }

      const hisMedicineId = toMisaHisMedicineId(inventoryItemCode);
      const metadata = metadataByHisMedicineId.get(hisMedicineId);

      return {
        his_medicineid: hisMedicineId,
        medicine_code: inventoryItemCode,
        name: metadata?.name ?? normalizeItemName(null, inventoryItemCode),
        category: metadata?.category ?? DEFAULT_CATEGORY,
        warehouse: metadata?.warehouse ?? MISA_WAREHOUSE_NAME,
        unit: metadata?.unit ?? DEFAULT_UNIT,
        current_stock: toPositiveNumber(row.balance),
        total_value: toPositiveNumber(row.total_value),
      };
    })
    .filter(isNotNull)
    .filter((seed) => seed.current_stock !== 0 || seed.total_value !== 0);
}

async function fetchMisaDeltas(
  startDate: string,
  endDate: string,
): Promise<MisaInventoryDelta[]> {
  if (startDate > endDate) {
    return [];
  }

  const request = new mssql.Request(misaPool);
  request.input("startDate", mssql.Date, startDate);
  request.input("endDate", mssql.Date, endDate);

  const result = await request.query(MISA_DAILY_DELTAS_QUERY);
  const rows = result.recordset as MisaDeltaRow[];

  return rows
    .map((row): MisaInventoryDelta | null => {
      const inventoryItemCode = row.InventoryItemCode?.trim();
      if (!inventoryItemCode) {
        return null;
      }

      return {
        snapshot_date: toSnapshotDateString(row.snapshot_date),
        his_medicineid: toMisaHisMedicineId(inventoryItemCode),
        delta_stock: toPositiveNumber(row.delta_stock),
        delta_value: toPositiveNumber(row.delta_value),
      };
    })
    .filter(isNotNull);
}

async function fetchCurrentMisaSnapshotRows(
  snapshotDate: string,
): Promise<InventorySnapshotWriteRow[]> {
  const result = await new mssql.Request(misaPool).query(MISA_CURRENT_SNAPSHOT_QUERY);
  const rows = result.recordset as MisaCurrentSnapshotRow[];

  return rows
    .map((row): InventorySnapshotWriteRow | null => {
      const inventoryItemCode = row.InventoryItemCode?.trim();
      if (!inventoryItemCode) {
        return null;
      }

      const currentStock = toPositiveNumber(row.balance);
      if (currentStock <= 0) {
        return null;
      }

      const totalValue = toPositiveNumber(row.total_value);
      return {
        his_medicineid: toMisaHisMedicineId(inventoryItemCode),
        medicine_code: inventoryItemCode,
        name: normalizeItemName(row.InventoryItemName, inventoryItemCode),
        category: toCategory(row.InventoryAccount),
        warehouse: MISA_WAREHOUSE_NAME,
        current_stock: currentStock,
        approved_export: 0,
        unit_price: currentStock > 0 ? totalValue / currentStock : 0,
        unit: normalizeUnitName(row.UnitName),
        status: "in_stock" as const,
        snapshot_date: snapshotDate,
        batch_number: null,
        expiry_date: null,
      };
    })
    .filter(isNotNull);
}

async function upsertSnapshotRows(rows: InventorySnapshotWriteRow[]): Promise<void> {
  for (let index = 0; index < rows.length; index += SNAPSHOT_BATCH_SIZE) {
    const batch = rows.slice(index, index + SNAPSHOT_BATCH_SIZE);
    const { error } = await supabase
      .from("fdc_inventory_snapshots")
      .upsert(batch, { onConflict: "his_medicineid,snapshot_date" });

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
    const { data, error } = await misaSnapshotSelect(
      "snapshot_date, current_stock, unit_price, his_medicineid",
    )
      .gte("snapshot_date", startDate)
      .lte("snapshot_date", endDate)
      .order("snapshot_date", { ascending: true })
      .order("his_medicineid", { ascending: true })
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

function resolveHistoricalStartDate(
  options: MisaSyncOptions,
  todayDate: string,
  latestSnapshotDate: string | null,
): string | null {
  if (options.kind === "backfill") {
    const safeDays = Math.max(1, Math.trunc(options.days || 365));
    return addDays(todayDate, -safeDays);
  }

  if (latestSnapshotDate && latestSnapshotDate < todayDate) {
    return addDays(latestSnapshotDate, 1);
  }

  return null;
}

async function runMisaInventorySync(options: MisaSyncOptions): Promise<void> {
  const startTime = Date.now();
  let recordsSynced = 0;

  try {
    logger.info(`Starting ${options.logName}...`);
    await ensureMisaConnected();

    const todayDate = toHoChiMinhDate();
    const latestSnapshotDate = await fetchLatestMisaSnapshotDate();
    const latestDailyValueDate = await fetchLatestMisaDailyValueDate();
    const historicalStartDate = resolveHistoricalStartDate(
      options,
      todayDate,
      latestSnapshotDate,
    );
    const historicalEndDate = addDays(todayDate, -1);

    logger.info(
      `${options.logName}: latest snapshot=${latestSnapshotDate ?? "none"}, latest daily value=${latestDailyValueDate ?? "none"}, today=${todayDate}, historical start=${historicalStartDate ?? "none"}`,
    );

    let firstChangedSnapshotDate: string | null = null;

    if (historicalStartDate && historicalStartDate <= historicalEndDate) {
      const metadataByHisMedicineId = await fetchMisaInventoryMetadata();
      const [baselineSnapshots, deltas] = await Promise.all([
        fetchBaselineMisaSnapshots(historicalStartDate, metadataByHisMedicineId),
        fetchMisaDeltas(historicalStartDate, historicalEndDate),
      ]);

      const historicalSnapshots = buildMisaInventorySnapshotsFromDeltas({
        seeds: baselineSnapshots,
        metadataByHisMedicineId,
        deltas,
        startDate: historicalStartDate,
        endDate: historicalEndDate,
      });

      if (historicalSnapshots.length > 0) {
        await upsertSnapshotRows(historicalSnapshots);
        recordsSynced += historicalSnapshots.length;
        firstChangedSnapshotDate = historicalStartDate;
        logger.info(
          `${options.logName}: upserted ${historicalSnapshots.length} historical MISA snapshot rows (${historicalStartDate} -> ${historicalEndDate}).`,
        );
      }
    }

    const currentSnapshotRows = await fetchCurrentMisaSnapshotRows(todayDate);
    if (currentSnapshotRows.length > 0) {
      await upsertSnapshotRows(currentSnapshotRows);
      recordsSynced += currentSnapshotRows.length;
      firstChangedSnapshotDate = [firstChangedSnapshotDate, todayDate]
        .filter((value): value is string => Boolean(value))
        .sort((left, right) => left.localeCompare(right))[0];
      logger.info(
        `${options.logName}: upserted ${currentSnapshotRows.length} current MISA snapshot rows for ${todayDate}.`,
      );
    }

    const aggregateCandidates = new Set<string>();

    if (firstChangedSnapshotDate) {
      aggregateCandidates.add(firstChangedSnapshotDate);
    }
    aggregateCandidates.add(todayDate);

    if (latestDailyValueDate) {
      const nextDailyValueDate = addDays(latestDailyValueDate, 1);
      if (nextDailyValueDate <= todayDate) {
        aggregateCandidates.add(nextDailyValueDate);
      }
    }

    const aggregateStartDate = Array.from(aggregateCandidates).sort((left, right) =>
      left.localeCompare(right),
    )[0];

    const snapshotRowsForAggregation = await fetchSnapshotRowsForDailyAggregation(
      aggregateStartDate,
      todayDate,
    );

    const dailyValueRows = aggregateDailyValuesFromSnapshots(
      snapshotRowsForAggregation.map((row) => ({
        snapshot_date: row.snapshot_date,
        current_stock: toPositiveNumber(row.current_stock),
        unit_price: toPositiveNumber(row.unit_price),
      })),
      "inventory",
    );

    if (dailyValueRows.length > 0) {
      await upsertDailyValueRows(dailyValueRows);
      recordsSynced += dailyValueRows.length;
      logger.info(
        `${options.logName}: upserted ${dailyValueRows.length} inventory daily aggregate rows (${aggregateStartDate} -> ${todayDate}).`,
      );
    }

    await logSync(
      options.logName,
      "completed",
      "MISA",
      recordsSynced,
      null,
      Date.now() - startTime,
    );
    logger.info(
      `${options.logName} completed. Synced ${recordsSynced} rows in ${Date.now() - startTime}ms.`,
    );
  } catch (error: any) {
    logger.error(`${options.logName} failed:`, error);
    await logSync(
      options.logName,
      "failed",
      "MISA",
      recordsSynced,
      error?.message ?? String(error),
      Date.now() - startTime,
    );
  }
}

export async function syncMisaSuppliesJob(): Promise<void> {
  await runMisaInventorySync({
    kind: "incremental",
    logName: "syncMisaSupplies",
  });
}

export async function backfillMisaInventorySnapshotsJob(
  days = 365,
): Promise<void> {
  await runMisaInventorySync({
    kind: "backfill",
    days,
    logName: "backfillMisaInventorySnapshots",
  });
}
