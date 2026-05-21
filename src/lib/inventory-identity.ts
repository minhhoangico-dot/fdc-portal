/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InventoryAnomaly, InventoryItem } from "@/types/inventory";

const LEGACY_GROUPED_MISA_WAREHOUSE = "khoi vat tu";

type InventorySnapshotRow = {
  id: string;
  name: string;
  his_medicineid?: string | null;
  medicine_code?: string | null;
  category?: string | null;
  warehouse?: string | null;
  current_stock?: number | null;
  unit?: string | null;
  status?: InventoryItem["status"] | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  snapshot_date: string;
  unit_price?: number | null;
};

const normalizeInventoryKeyPart = (value?: string | null): string =>
  value?.trim().toLowerCase() || "";

const canonicalizeInventoryKeyPart = (value?: string | null): string =>
  normalizeInventoryKeyPart(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const canonicalizeInventorySourceFamily = (value?: string | null): string => {
  const normalized = canonicalizeInventoryKeyPart(value);
  const stockSuffixIndex = normalized.indexOf("__stock_");
  return stockSuffixIndex >= 0 ? normalized.slice(0, stockSuffixIndex) : normalized;
};

const parseInventoryKey = (key?: string | null): { sourceId: string; warehouse: string } | null => {
  if (!key) {
    return null;
  }

  const [sourceId, ...warehouseParts] = key.split("::");
  if (!sourceId || warehouseParts.length === 0) {
    return null;
  }

  return {
    sourceId,
    warehouse: warehouseParts.join("::"),
  };
};

export const buildInventoryItemKey = (
  sourceId?: string | null,
  warehouse?: string | null,
): string | null => {
  const normalizedSourceId = normalizeInventoryKeyPart(sourceId);
  const normalizedWarehouse = normalizeInventoryKeyPart(warehouse);

  if (!normalizedSourceId || !normalizedWarehouse) {
    return null;
  }

  return `${normalizedSourceId}::${normalizedWarehouse}`;
};

export const mapInventorySnapshotToItem = (
  item: InventorySnapshotRow,
): InventoryItem => {
  const sourceId = item.his_medicineid?.toString() || item.id;
  const warehouse = item.warehouse || "Kho Tong";
  const medicineCode = item.medicine_code?.toString() || undefined;

  return {
    id: item.id,
    name: item.name,
    sku: medicineCode || sourceId,
    category: item.category || "Khác",
    warehouse,
    currentStock: item.current_stock || 0,
    unit: item.unit || "Cái",
    status: (item.status as InventoryItem["status"]) || "in_stock",
    batchNumber: item.batch_number || undefined,
    expiryDate: item.expiry_date || undefined,
    lastUpdated: item.snapshot_date,
    unitPrice: item.unit_price || 0,
    medicineCode,
    sourceId,
    inventoryKey: buildInventoryItemKey(sourceId, warehouse) || undefined,
  };
};

export const anomalyMatchesInventoryItem = (
  anomaly: Pick<InventoryAnomaly, "materialId" | "inventoryKey">,
  item: Pick<InventoryItem, "name" | "inventoryKey">,
): boolean => {
  if (anomaly.inventoryKey) {
    if (anomaly.inventoryKey === item.inventoryKey) {
      return true;
    }

    const anomalyIdentity = parseInventoryKey(anomaly.inventoryKey);
    const itemIdentity = parseInventoryKey(item.inventoryKey);

    if (
      anomalyIdentity &&
      itemIdentity &&
      canonicalizeInventorySourceFamily(anomalyIdentity.sourceId) ===
        canonicalizeInventorySourceFamily(itemIdentity.sourceId) &&
      canonicalizeInventoryKeyPart(anomalyIdentity.warehouse) === "khoi vat tu"
    ) {
      return true;
    }

    return false;
  }

  return anomaly.materialId === item.name;
};

export const preferWarehouseSpecificInventoryItems = <
  T extends Pick<InventoryItem, "sourceId" | "warehouse">,
>(
  items: T[],
): T[] => {
  const sourceIdsWithRealWarehouses = new Set<string>();

  for (const item of items) {
    const sourceId = canonicalizeInventorySourceFamily(item.sourceId);
    if (!sourceId.startsWith("misa_")) {
      continue;
    }

    if (
      canonicalizeInventoryKeyPart(item.warehouse) !== LEGACY_GROUPED_MISA_WAREHOUSE
    ) {
      sourceIdsWithRealWarehouses.add(sourceId);
    }
  }

  return items.filter((item) => {
    const sourceId = canonicalizeInventorySourceFamily(item.sourceId);
    if (!sourceId.startsWith("misa_")) {
      return true;
    }

    if (
      canonicalizeInventoryKeyPart(item.warehouse) !== LEGACY_GROUPED_MISA_WAREHOUSE
    ) {
      return true;
    }

    return !sourceIdsWithRealWarehouses.has(sourceId);
  });
};
