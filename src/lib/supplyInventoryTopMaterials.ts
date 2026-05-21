/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { InventoryItem, TopMaterial } from "@/types/inventory";

const getInventoryValue = (item: Pick<InventoryItem, "currentStock" | "unitPrice">): number =>
  (Number(item.currentStock) || 0) * (Number(item.unitPrice) || 0);

export const buildSupplyTopMaterials = (
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
        left.warehouse.localeCompare(right.warehouse, "vi")
      );
    })
    .slice(0, limit);
