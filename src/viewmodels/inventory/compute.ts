/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pure, wall-clock-independent compute shared by `usePharmacyInventory` and
 * `useSupplyInventory`. Every function here was extracted verbatim from
 * behaviour that was byte-identical in both hooks; the hooks now delegate to
 * these so the KTT's inventory numbers are computed in exactly one place.
 *
 * NOTE: filtering/status semantics that DIFFER between the two warehouses
 * (pharmacy uses `matchesPharmacyInventoryFilterStatus`, supply uses inline
 * status logic) are intentionally NOT here — only genuinely-duplicated,
 * byte-identical logic lives in this module.
 */

import { anomalyMatchesInventoryItem } from "@/lib/inventory-identity";
import type {
  InventoryAnomaly,
  InventoryItem,
  InventorySortDir,
  InventorySortKey,
  SnapshotHistory,
} from "@/types/inventory";
import {
  compactSnapshotHistoryByWeek,
  getInventoryValue,
} from "@/viewmodels/inventory/shared";

/**
 * Sum of `stock * unitPrice` across items. Drives `estimatedValue` (all items)
 * and `filteredValue` (visible rows) in both hooks — the KTT's headline
 * inventory-value figure.
 */
export const sumInventoryValue = (
  items: ReadonlyArray<Pick<InventoryItem, "currentStock" | "unitPrice">>,
): number => items.reduce((sum, item) => sum + getInventoryValue(item), 0);

/**
 * Keep only anomalies that resolve to a currently-loaded inventory item.
 */
export const filterAnomaliesToInventory = (
  anomalies: InventoryAnomaly[],
  inventory: InventoryItem[],
): InventoryAnomaly[] =>
  anomalies.filter((anomaly) =>
    inventory.some((item) => anomalyMatchesInventoryItem(anomaly, item)),
  );

/**
 * Stable sort of already-filtered inventory rows by the active sort key/dir.
 * The `idx` tiebreaker preserves input order for equal keys (stable), matching
 * the previous in-hook `useMemo` behaviour exactly.
 */
export const sortInventoryItems = (
  items: InventoryItem[],
  sortKey: InventorySortKey,
  sortDir: InventorySortDir,
): InventoryItem[] => {
  const dir = sortDir === "asc" ? 1 : -1;

  return items
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

/**
 * Merge the persisted daily-value history with a synthesized "today" point
 * derived from the freshest loaded snapshot, then week-compact the series.
 */
export const buildSnapshotHistory = (
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
