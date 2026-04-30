/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from "../../db/supabase";
import { logger } from "../../lib/logger";
import { buildReagentDetailRows } from "../detailHelpers";
import { buildReagentSourceProvenance, LabDashboardReagentSnapshotSourceRow } from "../sourceProvenance";
import {
  LabDashboardDetailRow,
  LabDashboardDetailSourceInfo,
  LabDashboardReagent,
  LabDashboardReagentDetailRow,
  LabDashboardReagentFocus,
  LabDashboardReagentStatus,
  LabDashboardSectionFreshness,
} from "../types";
import { buildFreshness, errorMessageFor, normalizeText, slugify, toNumber } from "./shared";

const INVENTORY_BATCH_SIZE = 1000;
const DEFAULT_INVENTORY_UNIT = "Cái";

type SnapshotDateRow = {
  snapshot_date: string;
};

type InventorySnapshotRow = {
  name: string | null;
  warehouse: string | null;
  current_stock: string | number | null;
  unit: string | null;
  medicine_code: string | null;
  snapshot_date: string;
};

type ReagentSummaryResult = {
  reagents: LabDashboardReagent[];
  detailRows: LabDashboardReagentDetailRow[];
  snapshotDate: string;
  positiveSnapshotRows: LabDashboardReagentSnapshotSourceRow[];
  labScopedRows: LabDashboardReagentSnapshotSourceRow[];
  matchedRows: LabDashboardReagentSnapshotSourceRow[];
  freshness: LabDashboardSectionFreshness;
};

type ReagentsSummaryResult = {
  reagents: LabDashboardReagent[];
  freshness: LabDashboardSectionFreshness;
};

function isLikelyLabInventoryRow(row: InventorySnapshotRow): boolean {
  const warehouse = normalizeText(row.warehouse);
  return warehouse.includes("xet nghiem");
}

function normalizeInventoryStock(value: string | number | null | undefined): number {
  return Number(toNumber(value).toFixed(1));
}

function normalizeInventoryName(row: InventorySnapshotRow): string {
  return row.name?.trim() || row.medicine_code?.trim() || "Vat tu xet nghiem";
}

function normalizeInventoryUnit(unit: string | null | undefined): string {
  return unit?.trim() || DEFAULT_INVENTORY_UNIT;
}

function buildInventoryItemKey(row: InventorySnapshotRow): string {
  return slugify(row.medicine_code?.trim() || row.name?.trim() || "vat-tu-xet-nghiem");
}

function getReagentStatus(currentStock: number): LabDashboardReagentStatus {
  if (currentStock <= 1) return "critical";
  if (currentStock <= 2) return "low";
  return "ok";
}

function compareInventoryRowsByStockThenName(
  left: Pick<InventorySnapshotRow, "current_stock" | "name" | "medicine_code">,
  right: Pick<InventorySnapshotRow, "current_stock" | "name" | "medicine_code">,
): number {
  const stockDiff = normalizeInventoryStock(left.current_stock) - normalizeInventoryStock(right.current_stock);
  if (stockDiff !== 0) {
    return stockDiff;
  }

  const nameDiff = normalizeInventoryName(left as InventorySnapshotRow).localeCompare(
    normalizeInventoryName(right as InventorySnapshotRow),
    "vi",
  );
  if (nameDiff !== 0) {
    return nameDiff;
  }

  return buildInventoryItemKey(left as InventorySnapshotRow).localeCompare(
    buildInventoryItemKey(right as InventorySnapshotRow),
    "vi",
  );
}

function buildReagentRowsFromInventory(sourceRows: InventorySnapshotRow[]): {
  reagents: LabDashboardReagent[];
  detailRows: LabDashboardReagentDetailRow[];
} {
  const sortedRows = [...sourceRows].sort(compareInventoryRowsByStockThenName);
  const detailRows = sortedRows.map((row) => {
    const itemName = normalizeInventoryName(row);
    const itemKey = buildInventoryItemKey(row);
    const currentStock = normalizeInventoryStock(row.current_stock);
    const unit = normalizeInventoryUnit(row.unit);

    return {
      kind: "reagent" as const,
      reagentKey: itemKey,
      reagentName: itemName,
      sourceName: itemName,
      medicineCode: row.medicine_code?.trim() || null,
      warehouse: row.warehouse?.trim() || null,
      currentStock,
      unit,
      snapshotDate: row.snapshot_date,
    };
  });

  const reagents = detailRows.map((row) => ({
    key: row.reagentKey,
    name: row.reagentName,
    medicineCode: row.medicineCode,
    currentStock: row.currentStock,
    unit: row.unit,
    status: getReagentStatus(row.currentStock),
  }));

  return { reagents, detailRows };
}

function mapSnapshotSourceRows(rows: InventorySnapshotRow[]): LabDashboardReagentSnapshotSourceRow[] {
  return rows.map((row) => ({
    sourceName: row.name?.trim() || "Ẩn danh",
    medicineCode: row.medicine_code?.trim() || null,
    warehouse: row.warehouse?.trim() || null,
    currentStock: toNumber(row.current_stock),
    snapshotDate: row.snapshot_date,
  }));
}

async function fetchLatestInventorySnapshotDate(): Promise<string | null> {
  const { data, error } = await supabase
    .from("fdc_inventory_snapshots")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return ((data || []) as SnapshotDateRow[])[0]?.snapshot_date ?? null;
}

async function fetchInventorySnapshotRows(snapshotDate: string): Promise<InventorySnapshotRow[]> {
  let from = 0;
  let hasMore = true;
  const rows: InventorySnapshotRow[] = [];

  while (hasMore) {
    const { data, error } = await supabase
      .from("fdc_inventory_snapshots")
      .select("name, warehouse, current_stock, unit, medicine_code, snapshot_date")
      .eq("snapshot_date", snapshotDate)
      .gt("current_stock", 0)
      .order("name", { ascending: true })
      .range(from, from + INVENTORY_BATCH_SIZE - 1);

    if (error) {
      throw error;
    }

    const batch = ((data || []) as unknown) as InventorySnapshotRow[];
    rows.push(...batch);
    from += INVENTORY_BATCH_SIZE;
    hasMore = batch.length === INVENTORY_BATCH_SIZE;
  }

  return rows;
}

async function buildReagentSummary(generatedAt: string): Promise<ReagentSummaryResult> {
  const snapshotDate = await fetchLatestInventorySnapshotDate();
  if (!snapshotDate) {
    throw new Error("No inventory snapshot available for lab reagents.");
  }

  const snapshotRows = await fetchInventorySnapshotRows(snapshotDate);
  const positiveSnapshotRows = mapSnapshotSourceRows(snapshotRows);
  const scopedRows = snapshotRows.filter(isLikelyLabInventoryRow);
  const labScopedRows = mapSnapshotSourceRows(scopedRows);
  if (scopedRows.length === 0) {
    throw new Error("No lab inventory rows were found in the latest inventory snapshot.");
  }

  const allocation = buildReagentRowsFromInventory(scopedRows);

  return {
    reagents: allocation.reagents,
    detailRows: allocation.detailRows,
    snapshotDate,
    positiveSnapshotRows,
    labScopedRows,
    matchedRows: labScopedRows,
    freshness: buildFreshness("supabase", generatedAt, snapshotDate),
  };
}

export async function loadReagentsSummary(generatedAt: string): Promise<ReagentsSummaryResult> {
  const result = await buildReagentSummary(generatedAt);
  return {
    reagents: result.reagents,
    freshness: result.freshness,
  };
}

export async function loadReagentDetail(
  generatedAt: string,
  focus: LabDashboardReagentFocus,
): Promise<{ rows: LabDashboardDetailRow[]; sourceInfo: LabDashboardDetailSourceInfo }> {
  const freshness = buildFreshness("supabase", generatedAt);
  let snapshotDate = freshness.dataDate || "";
  let positiveSnapshotRows: LabDashboardReagentSnapshotSourceRow[] = [];
  let labScopedRows: LabDashboardReagentSnapshotSourceRow[] = [];
  let matchedRows: LabDashboardReagentSnapshotSourceRow[] = [];
  let claimedRows: LabDashboardReagentDetailRow[] = [];
  let rows: LabDashboardReagentDetailRow[] = [];

  try {
    const result = await buildReagentSummary(generatedAt);
    snapshotDate = result.snapshotDate;
    positiveSnapshotRows = result.positiveSnapshotRows;
    labScopedRows = result.labScopedRows;
    matchedRows = result.matchedRows;
    claimedRows = result.detailRows;
    rows = buildReagentDetailRows(result.detailRows, focus);
    return {
      rows,
      sourceInfo: buildReagentSourceProvenance({
        generatedAt: result.freshness.generatedAt,
        dataDate: result.freshness.dataDate,
        snapshotDate: result.snapshotDate,
        focus,
        positiveSnapshotRows: result.positiveSnapshotRows,
        labScopedRows: result.labScopedRows,
        matchedRows: result.matchedRows,
        claimedRows: result.detailRows,
        displayedRows: rows,
        claimOrder: [],
        claimOrderDisplayLabels: [],
      }),
    };
  } catch (error) {
    const message = errorMessageFor(error, "Unable to load reagent detail rows.");
    logger.error("Lab dashboard reagent detail failed", error);
    return {
      rows,
      sourceInfo: buildReagentSourceProvenance({
        generatedAt: freshness.generatedAt,
        dataDate: freshness.dataDate,
        snapshotDate,
        focus,
        positiveSnapshotRows,
        labScopedRows,
        matchedRows,
        claimedRows,
        displayedRows: rows,
        claimOrder: [],
        claimOrderDisplayLabels: [],
        error: message,
      }),
    };
  }
}

