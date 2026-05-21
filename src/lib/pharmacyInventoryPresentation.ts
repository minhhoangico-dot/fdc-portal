/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  InventoryAnomaly,
  InventoryFilterStatus,
  InventoryItem,
  InventoryStatus,
  TopMaterial,
} from "@/types/inventory";
import { getInventoryValue, hasNearExpiry } from "@/viewmodels/inventory/shared";

const isActiveAnomaly = (
  anomaly: Pick<InventoryAnomaly, "acknowledged">,
): boolean => !anomaly.acknowledged;

export const getDerivedPharmacyInventoryStatus = (
  item: Pick<InventoryItem, "currentStock" | "status">,
  anomaliesForItem: Array<Pick<InventoryAnomaly, "acknowledged" | "rule">>,
): InventoryStatus => {
  if (
    (Number(item.currentStock) || 0) <= 0 ||
    anomaliesForItem.some(
      (anomaly) => isActiveAnomaly(anomaly) && anomaly.rule === "zero_stock",
    )
  ) {
    return "out_of_stock";
  }

  if (
    item.status === "low_stock" ||
    anomaliesForItem.some(
      (anomaly) => isActiveAnomaly(anomaly) && anomaly.rule === "low_stock",
    )
  ) {
    return "low_stock";
  }

  return "in_stock";
};

export const hasPharmacyExceptionalAnomaly = (
  anomaliesForItem: Array<Pick<InventoryAnomaly, "acknowledged" | "rule">>,
): boolean =>
  anomaliesForItem.some(
    (anomaly) =>
      isActiveAnomaly(anomaly) &&
      anomaly.rule !== "low_stock" &&
      anomaly.rule !== "zero_stock",
  );

export const matchesPharmacyInventoryFilterStatus = (
  item: Pick<InventoryItem, "currentStock" | "status" | "expiryDate">,
  anomaliesForItem: Array<Pick<InventoryAnomaly, "acknowledged" | "rule">>,
  filterStatus: InventoryFilterStatus,
): boolean => {
  if (filterStatus === "all") {
    return true;
  }

  if (filterStatus === "near_expiry") {
    return hasNearExpiry(item);
  }

  if (filterStatus === "anomaly") {
    return anomaliesForItem.some(isActiveAnomaly);
  }

  return getDerivedPharmacyInventoryStatus(item, anomaliesForItem) === filterStatus;
};

export const buildPharmacyTopMaterials = (
  inventory: InventoryItem[],
  limit = 10,
): TopMaterial[] =>
  [...inventory]
    .map((item) => ({
      materialId: item.sku,
      name: item.name,
      warehouse: item.warehouse,
      chartLabel: `${item.name} (${item.warehouse})`,
      value: getInventoryValue(item),
      unit: item.unit,
      stock: item.currentStock,
    }))
    .sort((left, right) => {
      const valueDiff = right.value - left.value;
      if (valueDiff !== 0) {
        return valueDiff;
      }

      return (
        left.name.localeCompare(right.name, "vi") ||
        (left.warehouse || "").localeCompare(right.warehouse || "", "vi")
      );
    })
    .slice(0, limit);
