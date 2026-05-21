/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from "node:test";
import assert from "node:assert/strict";

import { buildInventoryItemKey } from "../../src/lib/inventory-identity";
import {
  buildPharmacyTopMaterials,
  getDerivedPharmacyInventoryStatus,
} from "../../src/lib/pharmacyInventoryPresentation";
import type { InventoryAnomaly, InventoryItem } from "../../src/types/inventory";

const item = (overrides: Partial<InventoryItem>): InventoryItem => ({
  id: "row-1",
  name: "Paracetamol 1g/100ml",
  sku: "BSGD00932",
  sourceId: "S10111",
  inventoryKey: buildInventoryItemKey("S10111", "Khám Bệnh") || undefined,
  category: "Thuoc",
  warehouse: "Khám Bệnh",
  currentStock: 3,
  unit: "Chai",
  status: "in_stock",
  lastUpdated: "2026-04-06",
  unitPrice: 100_000,
  ...overrides,
});

const anomaly = (overrides: Partial<InventoryAnomaly>): InventoryAnomaly => ({
  id: "a-1",
  materialId: "Paracetamol 1g/100ml",
  inventoryKey: buildInventoryItemKey("S10111", "Khám Bệnh"),
  moduleType: "pharmacy",
  rule: "low_stock",
  severity: "high",
  description: "Low stock",
  detectedAt: "2026-04-06T00:00:00.000Z",
  acknowledged: false,
  ...overrides,
});

test("keeps same medicine name split by warehouse in pharmacy top materials", () => {
  const topMaterials = buildPharmacyTopMaterials([
    item(),
    item({
      id: "row-2",
      sourceId: "S10069",
      inventoryKey: buildInventoryItemKey("S10069", "Khoa Dược / Vật tư") || undefined,
      warehouse: "Khoa Dược / Vật tư",
      currentStock: 4,
    }),
  ]);

  assert.equal(topMaterials.length, 2);
  assert.deepEqual(
    topMaterials.map((entry) => entry.warehouse).sort(),
    ["Khám Bệnh", "Khoa Dược / Vật tư"].sort(),
  );
  assert.deepEqual(
    topMaterials.map((entry) => entry.chartLabel).sort(),
    [
      "Paracetamol 1g/100ml (Khám Bệnh)",
      "Paracetamol 1g/100ml (Khoa Dược / Vật tư)",
    ].sort(),
  );
});

test("derives low-stock display state from active pharmacy anomalies", () => {
  const status = getDerivedPharmacyInventoryStatus(item(), [anomaly()]);
  assert.equal(status, "low_stock");
});

test("derives out-of-stock display state from zero stock rows", () => {
  const status = getDerivedPharmacyInventoryStatus(
    item({ currentStock: 0, status: "out_of_stock" }),
    [],
  );
  assert.equal(status, "out_of_stock");
});
