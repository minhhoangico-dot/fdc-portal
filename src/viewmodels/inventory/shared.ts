/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseISO } from "date-fns";

import type {
  InventoryAnomaly,
  InventoryItem,
  SnapshotHistory,
} from "@/types/inventory";

export interface UseInventoryOptions {
  enabled?: boolean;
}

export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getOneYearCutoffDate = (): string => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return formatLocalDate(oneYearAgo);
};

const getWeekBucketKey = (dateString: string): string => {
  const parsed = parseISO(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }

  const localDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const daysSinceMonday = (localDate.getDay() + 6) % 7;
  localDate.setDate(localDate.getDate() - daysSinceMonday);
  return formatLocalDate(localDate);
};

export const compactSnapshotHistoryByWeek = (
  history: SnapshotHistory[],
): SnapshotHistory[] => {
  const latestPointByWeek = new Map<string, SnapshotHistory>();

  for (const point of [...history].sort((a, b) => a.date.localeCompare(b.date))) {
    latestPointByWeek.set(getWeekBucketKey(point.date), point);
  }

  return Array.from(latestPointByWeek.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
};

export const getInventorySearchTerms = (
  item: Pick<InventoryItem, "name" | "sku" | "sourceId" | "medicineCode">,
): string[] => {
  return [item.name, item.sku, item.sourceId, item.medicineCode]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.toLowerCase());
};

export const matchesInventorySearchQuery = (
  item: Pick<InventoryItem, "name" | "sku" | "sourceId" | "medicineCode">,
  query: string,
): boolean => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return getInventorySearchTerms(item).some((value) =>
    value.includes(normalizedQuery),
  );
};

export const matchesInventoryHistoryFilters = (
  item: InventoryItem,
  category: string,
  query: string,
): boolean => {
  if (category !== "all" && item.category !== category) {
    return false;
  }

  return matchesInventorySearchQuery(item, query);
};

export const mapInventoryAnomaly = (item: any): InventoryAnomaly => ({
  id: item.id,
  materialId: item.material_name,
  inventoryKey: item.inventory_item_key || null,
  rule: (item.rule_id as InventoryAnomaly["rule"]) || "low_stock",
  severity: (item.severity as InventoryAnomaly["severity"]) || "medium",
  description: item.description || "",
  detectedAt: item.detected_at,
  acknowledged: item.is_acknowledged || false,
});

export const hasNearExpiry = (
  item: Pick<InventoryItem, "expiryDate">,
  maxDays = 90,
): boolean => {
  if (!item.expiryDate) {
    return false;
  }

  const now = Date.now();
  const days = (new Date(item.expiryDate).getTime() - now) / (1000 * 3600 * 24);
  return days >= 0 && days <= maxDays;
};

export const getInventoryValue = (
  item: Pick<InventoryItem, "currentStock" | "unitPrice">,
): number => (Number(item.currentStock) || 0) * (Number(item.unitPrice) || 0);
