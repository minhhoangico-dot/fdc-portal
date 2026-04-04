/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InventoryAnomaly, InventoryItem } from "@/types/inventory";

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
    return anomaly.inventoryKey === item.inventoryKey;
  }

  return anomaly.materialId === item.name;
};
