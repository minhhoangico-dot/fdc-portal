import { listDatesBetween } from "./date";
import { InventorySnapshotWriteRow } from "./pharmacyInventorySync";

export interface MisaInventorySnapshotSeed {
  his_medicineid: string;
  medicine_code?: string | null;
  name: string;
  category?: string | null;
  warehouse: string;
  stock_id?: string | null;
  unit?: string | null;
  current_stock: number;
  total_value: number;
}

export interface MisaInventorySnapshotMeta {
  his_medicineid: string;
  medicine_code?: string | null;
  name: string;
  category?: string | null;
  warehouse: string;
  stock_id?: string | null;
  unit?: string | null;
}

export interface MisaInventoryDelta {
  snapshot_date: string;
  his_medicineid: string;
  warehouse: string;
  stock_id?: string | null;
  delta_stock: number;
  delta_value: number;
}

interface MisaInventoryState extends MisaInventorySnapshotMeta {
  currentStock: number;
  totalValue: number;
}

const buildMisaStateKey = (
  hisMedicineId: string,
  _stockId?: string | null,
  _warehouse?: string | null,
): string => hisMedicineId;

const normalizeMeta = (
  meta: MisaInventorySnapshotMeta,
): Omit<
  InventorySnapshotWriteRow,
  "snapshot_date" | "current_stock" | "approved_export" | "status" | "unit_price"
> => ({
  his_medicineid: meta.his_medicineid,
  medicine_code: meta.medicine_code ?? null,
  name: meta.name,
  category: meta.category || "Khac",
  warehouse: meta.warehouse,
  unit: meta.unit || "Cai",
  batch_number: null,
  expiry_date: null,
});

const toDeltaMapByDate = (
  deltas: MisaInventoryDelta[],
): Map<string, Map<string, { deltaStock: number; deltaValue: number }>> => {
  const byDate = new Map<string, Map<string, { deltaStock: number; deltaValue: number }>>();

  for (const delta of deltas) {
    const dateMap =
      byDate.get(delta.snapshot_date) ??
      new Map<string, { deltaStock: number; deltaValue: number }>();
    const stateKey = buildMisaStateKey(
      delta.his_medicineid,
      delta.stock_id,
      delta.warehouse,
    );
    const current = dateMap.get(stateKey) ?? {
      deltaStock: 0,
      deltaValue: 0,
    };

    current.deltaStock += Number(delta.delta_stock) || 0;
    current.deltaValue += Number(delta.delta_value) || 0;
    dateMap.set(stateKey, current);
    byDate.set(delta.snapshot_date, dateMap);
  }

  return byDate;
};

export function buildMisaInventorySnapshotsFromDeltas(params: {
  seeds: MisaInventorySnapshotSeed[];
  metadataByStateKey: Map<string, MisaInventorySnapshotMeta>;
  deltas: MisaInventoryDelta[];
  startDate: string;
  endDate: string;
}): InventorySnapshotWriteRow[] {
  const { seeds, metadataByStateKey, deltas, startDate, endDate } = params;

  if (startDate > endDate) {
    return [];
  }

  const state = new Map<string, MisaInventoryState>();
  for (const seed of seeds) {
    state.set(buildMisaStateKey(seed.his_medicineid, seed.stock_id, seed.warehouse), {
      his_medicineid: seed.his_medicineid,
      medicine_code: seed.medicine_code ?? null,
      name: seed.name,
      category: seed.category ?? "Khac",
      warehouse: seed.warehouse,
      stock_id: seed.stock_id ?? null,
      unit: seed.unit ?? "Cai",
      currentStock: Number(seed.current_stock) || 0,
      totalValue: Number(seed.total_value) || 0,
    });
  }

  const deltasByDate = toDeltaMapByDate(deltas);
  const rows: InventorySnapshotWriteRow[] = [];

  for (const date of listDatesBetween(startDate, endDate)) {
    const dateDeltas =
      deltasByDate.get(date) ??
      new Map<string, { deltaStock: number; deltaValue: number }>();

    for (const [stateKey, delta] of dateDeltas.entries()) {
      const existing = state.get(stateKey);
      if (existing) {
        existing.currentStock += delta.deltaStock;
        existing.totalValue += delta.deltaValue;
        if (existing.currentStock <= 0) {
          existing.currentStock = 0;
          existing.totalValue = 0;
        }
        continue;
      }

      const metadata = metadataByStateKey.get(stateKey);
      if (!metadata) {
        continue;
      }

      const initialStock = Number(delta.deltaStock) || 0;
      const initialValue = Number(delta.deltaValue) || 0;
      state.set(stateKey, {
        ...metadata,
        category: metadata.category ?? "Khac",
        stock_id: metadata.stock_id ?? null,
        unit: metadata.unit ?? "Cai",
        currentStock: initialStock > 0 ? initialStock : 0,
        totalValue: initialStock > 0 ? initialValue : 0,
      });
    }

    for (const item of state.values()) {
      if (item.currentStock <= 0) {
        continue;
      }

      rows.push({
        ...normalizeMeta(item),
        snapshot_date: date,
        current_stock: item.currentStock,
        approved_export: 0,
        status: "in_stock",
        unit_price: item.currentStock > 0 ? item.totalValue / item.currentStock : 0,
      });
    }
  }

  return rows;
}
