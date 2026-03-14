import { listDatesBetween } from "./date";

export interface PharmacySnapshotSeed {
  his_medicineid: string;
  medicine_code?: string | null;
  name: string;
  category?: string | null;
  warehouse: string;
  current_stock: number;
  unit?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  unit_price?: number | null;
}

export interface PharmacySnapshotMeta {
  his_medicineid: string;
  medicine_code?: string | null;
  name: string;
  category?: string | null;
  warehouse: string;
  unit?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  unit_price?: number | null;
}

export interface PharmacyInventoryDelta {
  snapshot_date: string;
  his_medicineid: string;
  quantity: number;
}

export interface InventorySnapshotWriteRow extends PharmacySnapshotMeta {
  snapshot_date: string;
  current_stock: number;
  approved_export: number;
  status: "in_stock" | "out_of_stock";
  category: string;
  unit: string;
  unit_price: number;
}

export interface InventoryDailyValueWriteRow {
  snapshot_date: string;
  module_type: "pharmacy" | "inventory";
  total_stock: number;
  total_value: number;
}

interface PharmacySnapshotState extends PharmacySnapshotMeta {
  currentStock: number;
}

const toQuantityMapByDate = (
  deltas: PharmacyInventoryDelta[],
): Map<string, Map<string, number>> => {
  const byDate = new Map<string, Map<string, number>>();

  for (const delta of deltas) {
    const dateMap = byDate.get(delta.snapshot_date) ?? new Map<string, number>();
    dateMap.set(
      delta.his_medicineid,
      (dateMap.get(delta.his_medicineid) ?? 0) + (Number(delta.quantity) || 0),
    );
    byDate.set(delta.snapshot_date, dateMap);
  }

  return byDate;
};

const normalizeSnapshotMeta = (
  meta: PharmacySnapshotMeta,
): Omit<InventorySnapshotWriteRow, "snapshot_date" | "current_stock" | "approved_export" | "status"> => ({
  his_medicineid: meta.his_medicineid,
  medicine_code: meta.medicine_code ?? null,
  name: meta.name,
  category: meta.category || "Khac",
  warehouse: meta.warehouse,
  unit: meta.unit || "Cai",
  batch_number: meta.batch_number ?? null,
  expiry_date: meta.expiry_date ?? null,
  unit_price: Number(meta.unit_price) || 0,
});

export function buildMissingPharmacySnapshots(params: {
  baselineSnapshots: PharmacySnapshotSeed[];
  metadataByHisMedicineId: Map<string, PharmacySnapshotMeta>;
  importDeltas: PharmacyInventoryDelta[];
  exportDeltas: PharmacyInventoryDelta[];
  startDate: string;
  endDate: string;
}): InventorySnapshotWriteRow[] {
  const {
    baselineSnapshots,
    metadataByHisMedicineId,
    importDeltas,
    exportDeltas,
    startDate,
    endDate,
  } = params;

  if (startDate > endDate) {
    return [];
  }

  const state = new Map<string, PharmacySnapshotState>();
  for (const snapshot of baselineSnapshots) {
    state.set(snapshot.his_medicineid, {
      his_medicineid: snapshot.his_medicineid,
      medicine_code: snapshot.medicine_code ?? null,
      name: snapshot.name,
      category: snapshot.category ?? "Khac",
      warehouse: snapshot.warehouse,
      unit: snapshot.unit ?? "Cai",
      batch_number: snapshot.batch_number ?? null,
      expiry_date: snapshot.expiry_date ?? null,
      unit_price: Number(snapshot.unit_price) || 0,
      currentStock: Number(snapshot.current_stock) || 0,
    });
  }

  const importsByDate = toQuantityMapByDate(importDeltas);
  const exportsByDate = toQuantityMapByDate(exportDeltas);

  const rows: InventorySnapshotWriteRow[] = [];

  for (const date of listDatesBetween(startDate, endDate)) {
    const dailyImports = importsByDate.get(date) ?? new Map<string, number>();
    const dailyExports = exportsByDate.get(date) ?? new Map<string, number>();

    for (const [hisMedicineId, quantity] of dailyImports.entries()) {
      const existing = state.get(hisMedicineId);
      if (existing) {
        existing.currentStock += quantity;
        continue;
      }

      const metadata = metadataByHisMedicineId.get(hisMedicineId);
      if (!metadata) {
        continue;
      }

      state.set(hisMedicineId, {
        ...metadata,
        category: metadata.category ?? "Khac",
        unit: metadata.unit ?? "Cai",
        batch_number: metadata.batch_number ?? null,
        expiry_date: metadata.expiry_date ?? null,
        unit_price: Number(metadata.unit_price) || 0,
        currentStock: quantity,
      });
    }

    for (const [hisMedicineId, quantity] of dailyExports.entries()) {
      const existing = state.get(hisMedicineId);
      if (!existing) {
        continue;
      }

      existing.currentStock = Math.max(0, existing.currentStock - quantity);
    }

    for (const lot of state.values()) {
      if (lot.currentStock <= 0) {
        continue;
      }

      rows.push({
        ...normalizeSnapshotMeta(lot),
        snapshot_date: date,
        current_stock: Number(lot.currentStock) || 0,
        approved_export: dailyExports.get(lot.his_medicineid) ?? 0,
        status: "in_stock",
      });
    }
  }

  return rows;
}

export function aggregateDailyValuesFromSnapshots(
  snapshots: Array<Pick<InventorySnapshotWriteRow, "snapshot_date" | "current_stock" | "unit_price">>,
  moduleType: "pharmacy" | "inventory",
): InventoryDailyValueWriteRow[] {
  const byDate = new Map<string, { totalStock: number; totalValue: number }>();

  for (const snapshot of snapshots) {
    const current = byDate.get(snapshot.snapshot_date) ?? {
      totalStock: 0,
      totalValue: 0,
    };

    const stock = Number(snapshot.current_stock) || 0;
    const price = Number(snapshot.unit_price) || 0;

    current.totalStock += stock;
    current.totalValue += stock * price;
    byDate.set(snapshot.snapshot_date, current);
  }

  return Array.from(byDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([snapshotDate, total]) => ({
      snapshot_date: snapshotDate,
      module_type: moduleType,
      total_stock: total.totalStock,
      total_value: total.totalValue,
    }));
}
