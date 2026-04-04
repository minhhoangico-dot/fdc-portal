/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from "node:test";
import assert from "node:assert/strict";

import { countActiveInventoryAnomalies } from "../../src/lib/inventory-dashboard-summary";
import { buildInventoryItemKey } from "../../src/lib/inventory-identity";
import type { InventoryAnomaly, InventoryItem } from "../../src/types/inventory";

const inventoryItem = (overrides: Partial<InventoryItem>): InventoryItem => ({
  id: "item-1",
  name: "Paracetamol",
  sku: "SKU-1",
  category: "General",
  warehouse: "Kho Tong",
  currentStock: 10,
  unit: "Hop",
  status: "in_stock",
  lastUpdated: "2026-04-04",
  ...overrides,
});

const anomaly = (overrides: Partial<InventoryAnomaly>): InventoryAnomaly => ({
  id: "anomaly-1",
  materialId: "Paracetamol",
  inventoryKey: null,
  rule: "low_stock",
  severity: "high",
  description: "Low stock",
  detectedAt: "2026-04-04T00:00:00.000Z",
  acknowledged: false,
  ...overrides,
});

test("counts only active anomalies that match current inventory identity", () => {
  const inventory = [
    inventoryItem({
      id: "pharmacy-item",
      name: "Paracetamol",
      sourceId: "HIS-100",
      warehouse: "Kho Thuoc",
      inventoryKey: buildInventoryItemKey("HIS-100", "Kho Thuoc") || undefined,
    }),
    inventoryItem({
      id: "supply-item",
      name: "Gac y te",
      sku: "VT-001",
      sourceId: "misa_VT-001",
      warehouse: "Kho Vat Tu",
      inventoryKey: buildInventoryItemKey("misa_VT-001", "Kho Vat Tu") || undefined,
    }),
  ];

  const anomalies = [
    anomaly({
      id: "a-1",
      materialId: "Paracetamol",
      inventoryKey: buildInventoryItemKey("HIS-100", "Kho Thuoc"),
    }),
    anomaly({
      id: "a-2",
      materialId: "Gac y te",
      inventoryKey: buildInventoryItemKey("misa_VT-001", "Kho Vat Tu"),
    }),
    anomaly({
      id: "a-3",
      materialId: "Khong co trong ton hien tai",
      inventoryKey: buildInventoryItemKey("HIS-404", "Kho Thuoc"),
    }),
    anomaly({
      id: "a-4",
      materialId: "Paracetamol",
      inventoryKey: buildInventoryItemKey("HIS-100", "Kho Thuoc"),
      acknowledged: true,
    }),
  ];

  assert.equal(countActiveInventoryAnomalies(anomalies, inventory), 2);
});

test("deduplicates anomalies by id before counting", () => {
  const inventory = [
    inventoryItem({
      sourceId: "HIS-100",
      warehouse: "Kho Thuoc",
      inventoryKey: buildInventoryItemKey("HIS-100", "Kho Thuoc") || undefined,
    }),
  ];

  const duplicated = anomaly({
    id: "dup-1",
    inventoryKey: buildInventoryItemKey("HIS-100", "Kho Thuoc"),
  });

  assert.equal(
    countActiveInventoryAnomalies([duplicated, duplicated], inventory),
    1,
  );
});
