/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Characterization test for the pure compute extracted out of
 * `usePharmacyInventory` + `useSupplyInventory` into
 * `src/viewmodels/inventory/compute.ts`.
 *
 * Strategy: the `legacy*` helpers below are VERBATIM copies of the inline
 * `useMemo` bodies as they existed in both hooks before extraction. For both
 * the Thuốc (pharmacy / HIS `his_medicineid`) and Vật-tư (supply / `misa_*`)
 * data shapes we assert the extracted `compute.ts` function returns output that
 * is byte-identical (JSON.stringify) to the frozen legacy oracle, plus explicit
 * golden values so the assertions are not tautological. If anyone later edits
 * the shared function, the frozen oracle diverges and this test fails.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { anomalyMatchesInventoryItem, buildInventoryItemKey } from "../../src/lib/inventory-identity";
import {
  compactSnapshotHistoryByWeek,
  getInventoryValue,
} from "../../src/viewmodels/inventory/shared";
import {
  buildSnapshotHistory,
  filterAnomaliesToInventory,
  sortInventoryItems,
  sumInventoryValue,
} from "../../src/viewmodels/inventory/compute";
import type {
  InventoryAnomaly,
  InventoryItem,
  InventorySortDir,
  InventorySortKey,
  SnapshotHistory,
} from "../../src/types/inventory";

// ---------------------------------------------------------------------------
// Frozen legacy oracles — verbatim copies of the pre-extraction useMemo bodies.
// ---------------------------------------------------------------------------

const legacySortInventory = (
  filteredInventory: InventoryItem[],
  sortKey: InventorySortKey,
  sortDir: InventorySortDir,
): InventoryItem[] => {
  const dir = sortDir === "asc" ? 1 : -1;

  return filteredInventory
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.item.name.localeCompare(b.item.name, "vi");
          break;
        case "stock":
          cmp = (Number(a.item.currentStock) || 0) - (Number(b.item.currentStock) || 0);
          break;
        case "value":
          cmp = getInventoryValue(a.item) - getInventoryValue(b.item);
          break;
      }

      if (cmp === 0) return a.idx - b.idx;
      return cmp * dir;
    })
    .map((entry) => entry.item);
};

const legacyBuildSnapshotHistory = (
  rawSnapshotHistory: SnapshotHistory[],
  inventory: InventoryItem[],
): SnapshotHistory[] => {
  const mergedByDate = new Map<string, SnapshotHistory>();

  rawSnapshotHistory.forEach((point) => {
    mergedByDate.set(point.date, point);
  });

  if (inventory.length > 0) {
    const latestSnapshotDate = inventory.reduce((latest, item) => {
      return item.lastUpdated > latest ? item.lastUpdated : latest;
    }, "");

    if (latestSnapshotDate) {
      mergedByDate.set(latestSnapshotDate, {
        date: latestSnapshotDate,
        totalStock: inventory.reduce((sum, item) => sum + (Number(item.currentStock) || 0), 0),
        totalValue: inventory.reduce((sum, item) => sum + getInventoryValue(item), 0),
      });
    }
  }

  return compactSnapshotHistoryByWeek(Array.from(mergedByDate.values()));
};

const legacyFilterAnomalies = (
  anomalies: InventoryAnomaly[],
  inventory: InventoryItem[],
): InventoryAnomaly[] =>
  anomalies.filter((anomaly) =>
    inventory.some((item) => anomalyMatchesInventoryItem(anomaly, item)),
  );

const legacySumValue = (items: InventoryItem[]): number =>
  items.reduce((sum, item) => sum + getInventoryValue(item), 0);

// ---------------------------------------------------------------------------
// Fixtures — representative of both warehouse data shapes.
// ---------------------------------------------------------------------------

const pharmacyItem = (overrides: Partial<InventoryItem>): InventoryItem => {
  const sourceId = overrides.sourceId ?? "S00000";
  const warehouse = overrides.warehouse ?? "Khám Bệnh";
  return {
    id: "p-row",
    name: "Thuốc",
    sku: sourceId,
    sourceId,
    inventoryKey: buildInventoryItemKey(sourceId, warehouse) || undefined,
    category: "Thuoc",
    warehouse,
    currentStock: 0,
    unit: "Viên",
    status: "in_stock",
    lastUpdated: "2026-04-10",
    unitPrice: 0,
    ...overrides,
  };
};

const supplyItem = (overrides: Partial<InventoryItem>): InventoryItem => {
  const sourceId = overrides.sourceId ?? "misa_0000";
  const warehouse = overrides.warehouse ?? "Kho Vật Tư";
  return {
    id: "s-row",
    name: "Vật tư",
    sku: sourceId,
    sourceId,
    inventoryKey: buildInventoryItemKey(sourceId, warehouse) || undefined,
    category: "Vật tư tiêu hao",
    warehouse,
    currentStock: 0,
    unit: "Cái",
    status: "in_stock",
    lastUpdated: "2026-04-10",
    unitPrice: 0,
    ...overrides,
  };
};

// Thuốc shape: HIS source ids, values chosen for easy golden math; P2/P4 tie at
// 400_000 to exercise the stable idx tiebreaker; P3 is zero-stock.
const pharmacyItems: InventoryItem[] = [
  pharmacyItem({ id: "p1", name: "Amoxicillin", sourceId: "S101", currentStock: 3, unitPrice: 100_000 }),
  pharmacyItem({ id: "p2", name: "Zinc", sourceId: "S102", currentStock: 4, unitPrice: 100_000 }),
  pharmacyItem({ id: "p3", name: "Ức chế bơm", sourceId: "S103", currentStock: 0, unitPrice: 50_000 }),
  pharmacyItem({ id: "p4", name: "Aspirin", sourceId: "S104", currentStock: 10, unitPrice: 40_000 }),
  pharmacyItem({
    id: "p5",
    name: "Đông dược",
    sourceId: "S105",
    warehouse: "Khoa Dược",
    currentStock: 2,
    unitPrice: 250_000,
    lastUpdated: "2026-04-15",
  }),
];

// Vật-tư shape: misa_* source ids; S2/S4 tie at 120_000; S3 zero-stock.
const supplyItems: InventoryItem[] = [
  supplyItem({ id: "s1", name: "Găng tay", sourceId: "misa_1521_1", currentStock: 5, unitPrice: 20_000 }),
  supplyItem({ id: "s2", name: "Bơm tiêm", sourceId: "misa_1521_2", currentStock: 8, unitPrice: 15_000 }),
  supplyItem({ id: "s3", name: "Ống nghe", sourceId: "misa_1522_1", currentStock: 0, unitPrice: 30_000 }),
  supplyItem({ id: "s4", name: "Bông y tế", sourceId: "misa_1522_2", currentStock: 6, unitPrice: 20_000 }),
  supplyItem({
    id: "s5",
    name: "Ầu nối",
    sourceId: "misa_1523_1",
    warehouse: "Kho Lẻ",
    currentStock: 1,
    unitPrice: 300_000,
    lastUpdated: "2026-04-15",
  }),
];

const pharmacyAnomalies: InventoryAnomaly[] = [
  {
    id: "pa-match",
    materialId: "Amoxicillin",
    inventoryKey: buildInventoryItemKey("S101", "Khám Bệnh"),
    moduleType: "pharmacy",
    rule: "low_stock",
    severity: "high",
    description: "match",
    detectedAt: "2026-04-11T00:00:00.000Z",
    acknowledged: false,
  },
  {
    id: "pa-miss",
    materialId: "Ghost drug",
    inventoryKey: "s999::nowhere",
    moduleType: "pharmacy",
    rule: "low_stock",
    severity: "low",
    description: "no match",
    detectedAt: "2026-04-11T00:00:00.000Z",
    acknowledged: false,
  },
];

const supplyAnomalies: InventoryAnomaly[] = [
  {
    id: "sa-match",
    materialId: "Găng tay",
    inventoryKey: buildInventoryItemKey("misa_1521_1", "Kho Vật Tư"),
    moduleType: "supply",
    rule: "zero_stock",
    severity: "critical",
    description: "match",
    detectedAt: "2026-04-11T00:00:00.000Z",
    acknowledged: false,
  },
  {
    id: "sa-miss",
    materialId: "Ghost supply",
    inventoryKey: "misa_x::khong",
    moduleType: "supply",
    rule: "low_stock",
    severity: "low",
    description: "no match",
    detectedAt: "2026-04-11T00:00:00.000Z",
    acknowledged: false,
  },
];

// Raw daily-value points; dates deliberately in different ISO weeks from the
// latest inventory snapshot date (2026-04-15) so the synthesized latest point
// survives week compaction as its own bucket.
const rawHistory: SnapshotHistory[] = [
  { date: "2026-01-06", totalStock: 100, totalValue: 1_000_000 },
  { date: "2026-02-03", totalStock: 120, totalValue: 1_200_000 },
  { date: "2026-03-03", totalStock: 140, totalValue: 1_400_000 },
];

const bytes = (value: unknown): string => JSON.stringify(value);

// ---------------------------------------------------------------------------
// sumInventoryValue
// ---------------------------------------------------------------------------

test("sumInventoryValue matches legacy oracle + golden for both shapes", () => {
  // Golden: 300k + 400k + 0 + 400k + 500k = 1_600_000
  assert.equal(sumInventoryValue(pharmacyItems), 1_600_000);
  // Golden: 100k + 120k + 0 + 120k + 300k = 640_000
  assert.equal(sumInventoryValue(supplyItems), 640_000);

  assert.equal(sumInventoryValue(pharmacyItems), legacySumValue(pharmacyItems));
  assert.equal(sumInventoryValue(supplyItems), legacySumValue(supplyItems));
  assert.equal(sumInventoryValue([]), legacySumValue([]));
});

// ---------------------------------------------------------------------------
// sortInventoryItems (name / stock / value × asc / desc)
// ---------------------------------------------------------------------------

test("sortInventoryItems is byte-identical to legacy for every key/dir on both shapes", () => {
  const keys: InventorySortKey[] = ["name", "stock", "value"];
  const dirs: InventorySortDir[] = ["asc", "desc"];

  for (const [label, items] of [
    ["pharmacy", pharmacyItems],
    ["supply", supplyItems],
  ] as const) {
    for (const key of keys) {
      for (const dir of dirs) {
        assert.equal(
          bytes(sortInventoryItems(items, key, dir)),
          bytes(legacySortInventory(items, key, dir)),
          `${label} sort ${key}/${dir} diverged from legacy`,
        );
      }
    }
  }
});

test("sortInventoryItems value-desc golden order preserves stable tie order", () => {
  // p2 (400k, idx1) must precede p4 (400k, idx3): stable tiebreak on input order.
  assert.deepEqual(
    sortInventoryItems(pharmacyItems, "value", "desc").map((item) => item.id),
    ["p5", "p2", "p4", "p1", "p3"],
  );
  // s2 (120k, idx1) precedes s4 (120k, idx3).
  assert.deepEqual(
    sortInventoryItems(supplyItems, "value", "desc").map((item) => item.id),
    ["s5", "s2", "s4", "s1", "s3"],
  );
});

// ---------------------------------------------------------------------------
// filterAnomaliesToInventory
// ---------------------------------------------------------------------------

test("filterAnomaliesToInventory matches legacy + golden for both shapes", () => {
  assert.equal(
    bytes(filterAnomaliesToInventory(pharmacyAnomalies, pharmacyItems)),
    bytes(legacyFilterAnomalies(pharmacyAnomalies, pharmacyItems)),
  );
  assert.equal(
    bytes(filterAnomaliesToInventory(supplyAnomalies, supplyItems)),
    bytes(legacyFilterAnomalies(supplyAnomalies, supplyItems)),
  );

  assert.deepEqual(
    filterAnomaliesToInventory(pharmacyAnomalies, pharmacyItems).map((a) => a.id),
    ["pa-match"],
  );
  assert.deepEqual(
    filterAnomaliesToInventory(supplyAnomalies, supplyItems).map((a) => a.id),
    ["sa-match"],
  );
});

// ---------------------------------------------------------------------------
// buildSnapshotHistory
// ---------------------------------------------------------------------------

test("buildSnapshotHistory is byte-identical to legacy for both shapes", () => {
  assert.equal(
    bytes(buildSnapshotHistory(rawHistory, pharmacyItems)),
    bytes(legacyBuildSnapshotHistory(rawHistory, pharmacyItems)),
  );
  assert.equal(
    bytes(buildSnapshotHistory(rawHistory, supplyItems)),
    bytes(legacyBuildSnapshotHistory(rawHistory, supplyItems)),
  );
  // Empty inventory: returns week-compacted raw history unchanged in value.
  assert.equal(
    bytes(buildSnapshotHistory(rawHistory, [])),
    bytes(legacyBuildSnapshotHistory(rawHistory, [])),
  );
});

test("buildSnapshotHistory golden: synthesized latest point carries current totals", () => {
  const pharmacyHistory = buildSnapshotHistory(rawHistory, pharmacyItems);
  const latest = pharmacyHistory[pharmacyHistory.length - 1];
  // Stocks: 3+4+0+10+2 = 19; value = 1_600_000; date = max lastUpdated.
  assert.deepEqual(latest, {
    date: "2026-04-15",
    totalStock: 19,
    totalValue: 1_600_000,
  });

  const supplyHistory = buildSnapshotHistory(rawHistory, supplyItems);
  const supplyLatest = supplyHistory[supplyHistory.length - 1];
  // Stocks: 5+8+0+6+1 = 20; value = 640_000.
  assert.deepEqual(supplyLatest, {
    date: "2026-04-15",
    totalStock: 20,
    totalValue: 640_000,
  });
});
