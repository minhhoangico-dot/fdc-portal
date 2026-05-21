/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from "node:test";
import assert from "node:assert/strict";

import { buildInventoryItemKey } from "../../src/lib/inventory-identity";
import { buildSupplyTopMaterials } from "../../src/lib/supplyInventoryTopMaterials";
import type { InventoryItem } from "../../src/types/inventory";

const item = (overrides: Partial<InventoryItem>): InventoryItem => ({
  id: "row-1",
  name: "Bo xanh nu size M",
  sku: "AO018",
  sourceId: "misa_AO018",
  inventoryKey: buildInventoryItemKey("misa_AO018", "Kho vat tu - Khac") || undefined,
  category: "Vat tu",
  warehouse: "Kho vat tu - Khac",
  currentStock: 170,
  unit: "Bo",
  status: "in_stock",
  lastUpdated: "2026-04-06",
  unitPrice: 105_351.047,
  ...overrides,
});

test("keeps same item name split by warehouse in top supply materials", () => {
  const topMaterials = buildSupplyTopMaterials([
    item(),
    item({
      id: "row-2",
      warehouse: "Kho vat tu - Dich vu",
      inventoryKey:
        buildInventoryItemKey("misa_AO018", "Kho vat tu - Dich vu") || undefined,
      currentStock: 9,
      unitPrice: 308_000,
    }),
  ]);

  assert.equal(topMaterials.length, 2);
  assert.equal(topMaterials[0]?.warehouse, "Kho vat tu - Khac");
  assert.equal(topMaterials[1]?.warehouse, "Kho vat tu - Dich vu");
  assert.notEqual(topMaterials[0]?.chartLabel, topMaterials[1]?.chartLabel);
});
