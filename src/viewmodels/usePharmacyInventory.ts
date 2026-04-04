/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { anomalyMatchesInventoryItem, mapInventorySnapshotToItem } from "@/lib/inventory-identity";
import { supabase } from "@/lib/supabase";
import type {
  InventoryAnomaly,
  InventoryFilterStatus,
  InventoryItem,
  InventorySortDir,
  InventorySortKey,
  ItemSnapshot,
  SnapshotHistory,
  TopMaterial,
} from "@/types/inventory";
import {
  compactSnapshotHistoryByWeek,
  formatLocalDate,
  getInventoryValue,
  getOneYearCutoffDate,
  hasNearExpiry,
  mapInventoryAnomaly,
  matchesInventorySearchQuery,
  UseInventoryOptions,
} from "@/viewmodels/inventory/shared";

const PAGE_SIZE = 1000;

export function usePharmacyInventory(options: UseInventoryOptions = {}) {
  const enabled = options.enabled ?? true;
  const [activeTab, setActiveTab] = useState<"overview" | "list" | "anomalies">("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<InventoryFilterStatus>("all");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [anomalies, setAnomalies] = useState<InventoryAnomaly[]>([]);
  const [rawSnapshotHistory, setRawSnapshotHistory] = useState<SnapshotHistory[]>([]);
  const [filteredSnapshotHistory, setFilteredSnapshotHistory] = useState<SnapshotHistory[]>([]);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [itemSnapshots, setItemSnapshots] = useState<ItemSnapshot[]>([]);
  const [isLoadingItemSnapshots, setIsLoadingItemSnapshots] = useState(false);
  const [isLoadingSnapshotHistory, setIsLoadingSnapshotHistory] = useState(false);
  const [isLoadingFilteredSnapshotHistory, setIsLoadingFilteredSnapshotHistory] = useState(false);
  const hasLoadedSnapshotHistory = useRef(false);
  const hasLoadedFilteredSnapshotHistory = useRef(false);

  const [sortKey, setSortKey] = useState<InventorySortKey>("value");
  const [sortDir, setSortDir] = useState<InventorySortDir>("desc");

  const fetchInventory = useCallback(async () => {
    if (!enabled) return;

    setError(null);
    const todayDate = formatLocalDate(new Date());

    const loadForDate = async (snapshotDate: string) => {
      let allData: any[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("fdc_inventory_snapshots")
          .select("*")
          .eq("snapshot_date", snapshotDate)
          .not("his_medicineid", "is", null)
          .not("his_medicineid", "like", "misa_%")
          .order("name")
          .range(from, from + PAGE_SIZE - 1);

        if (error) {
          console.error("[usePharmacyInventory] fetchInventory error:", error);
          setError("Không thể tải dữ liệu tồn kho");
          hasMore = false;
          continue;
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += PAGE_SIZE;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      return allData;
    };

    let allData = await loadForDate(todayDate);

    if (allData.length === 0) {
      const { data: latest, error: latestError } = await supabase
        .from("fdc_inventory_snapshots")
        .select("snapshot_date")
        .not("his_medicineid", "is", null)
        .not("his_medicineid", "like", "misa_%")
        .order("snapshot_date", { ascending: false })
        .limit(1);

      if (latestError) {
        console.error("[usePharmacyInventory] latest snapshot error:", latestError);
        setError("Không thể tải dữ liệu tồn kho");
      } else if (latest && latest.length > 0) {
        const latestDate = latest[0].snapshot_date as string;
        if (latestDate && latestDate !== todayDate) {
          allData = await loadForDate(latestDate);
        }
      }
    }

    if (allData.length > 0) {
      setInventory(allData.map((item: any) => mapInventorySnapshotToItem(item)));

      const { data: syncLog } = await supabase
        .from("fdc_sync_logs")
        .select("completed_at")
        .eq("sync_type", "syncInventory")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setLastSyncDate(syncLog?.completed_at ?? allData[0]?.snapshot_date ?? null);
    } else {
      setInventory([]);
      setLastSyncDate(null);
    }
  }, [enabled]);

  const fetchAnomalies = useCallback(async () => {
    if (!enabled) return;

    setError(null);
    const { data, error } = await supabase
      .from("fdc_analytics_anomalies")
      .select("*")
      .order("detected_at", { ascending: false });

    if (error) {
      console.error("[usePharmacyInventory] fetchAnomalies error:", error);
      setError("Không thể tải cảnh báo bất thường");
      return;
    }

    setAnomalies((data || []).map(mapInventoryAnomaly));
  }, [enabled]);

  const fetchSnapshotHistory = useCallback(async () => {
    if (!enabled) return;

    setError(null);
    if (!hasLoadedSnapshotHistory.current) {
      setIsLoadingSnapshotHistory(true);
    }

    try {
      const cutoffDate = getOneYearCutoffDate();
      const { data, error } = await supabase
        .from("fdc_inventory_daily_value")
        .select("snapshot_date, total_stock, total_value")
        .gte("snapshot_date", cutoffDate)
        .eq("module_type", "pharmacy")
        .order("snapshot_date", { ascending: true });

      if (error) {
        console.error("[usePharmacyInventory] fetchSnapshotHistory error:", error);
        setError("Không thể tải lịch sử tồn kho");
      }

      if (data && data.length > 0) {
        setRawSnapshotHistory(
          data.map((row: any) => ({
            date: row.snapshot_date,
            totalStock: Number(row.total_stock) || 0,
            totalValue: Number(row.total_value) || 0,
          })),
        );
      } else {
        setRawSnapshotHistory([]);
      }

      hasLoadedSnapshotHistory.current = true;
    } finally {
      setIsLoadingSnapshotHistory(false);
    }
  }, [enabled]);

  const fetchFilteredSnapshotHistory = useCallback(async () => {
    if (!enabled) return;

    setError(null);
    const hasFilters =
      filterWarehouse !== "all" ||
      filterCategory !== "all" ||
      filterStatus !== "all" ||
      Boolean(searchQuery.trim());

    if (!hasFilters) {
      setFilteredSnapshotHistory([]);
      hasLoadedFilteredSnapshotHistory.current = false;
      return;
    }

    if (!hasLoadedFilteredSnapshotHistory.current) {
      setIsLoadingFilteredSnapshotHistory(true);
    }

    try {
      const { data, error } = await supabase.rpc("get_pharmacy_inventory_history", {
        p_warehouse: filterWarehouse !== "all" ? filterWarehouse : null,
        p_category: filterCategory !== "all" ? filterCategory : null,
        p_search: searchQuery.trim() ? searchQuery.trim() : null,
        p_status: filterStatus !== "all" ? filterStatus : null,
      });

      if (error) {
        console.error("[usePharmacyInventory] fetchFilteredSnapshotHistory error:", error);
        setError("Không thể tải lịch sử tồn kho");
        setFilteredSnapshotHistory([]);
        return;
      }

      setFilteredSnapshotHistory(
        (data || []).map((row: any) => ({
          date: row.snapshot_date,
          totalStock: Number(row.total_stock) || 0,
          totalValue: Number(row.total_value) || 0,
        })),
      );
      hasLoadedFilteredSnapshotHistory.current = true;
    } finally {
      setIsLoadingFilteredSnapshotHistory(false);
    }
  }, [enabled, filterWarehouse, filterCategory, filterStatus, searchQuery]);

  const fetchItemSnapshots = useCallback(
    async (item: InventoryItem) => {
      if (!enabled) return;

      setIsLoadingItemSnapshots(true);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffDate = formatLocalDate(thirtyDaysAgo);

      let query = supabase
        .from("fdc_inventory_snapshots")
        .select("snapshot_date, current_stock")
        .eq("warehouse", item.warehouse)
        .gte("snapshot_date", cutoffDate)
        .not("his_medicineid", "is", null)
        .not("his_medicineid", "like", "misa_%")
        .order("snapshot_date", { ascending: true });

      query = item.sourceId
        ? query.eq("his_medicineid", item.sourceId)
        : query.eq("name", item.name);

      const { data, error } = await query;

      if (error) {
        console.error("[usePharmacyInventory] fetchItemSnapshots error:", error);
      }

      if (data) {
        setItemSnapshots(
          data.map((row) => ({
            date: row.snapshot_date,
            stock: row.current_stock || 0,
          })),
        );
      } else {
        setItemSnapshots([]);
      }

      setIsLoadingItemSnapshots(false);
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) {
      setInventory([]);
      setAnomalies([]);
      setRawSnapshotHistory([]);
      setFilteredSnapshotHistory([]);
      setItemSnapshots([]);
      setError(null);
      setIsLoadingItemSnapshots(false);
      setIsLoadingSnapshotHistory(false);
      setIsLoadingFilteredSnapshotHistory(false);
      hasLoadedSnapshotHistory.current = false;
      hasLoadedFilteredSnapshotHistory.current = false;
      return;
    }

    fetchInventory();
    fetchAnomalies();
    fetchSnapshotHistory();
    fetchFilteredSnapshotHistory();

    let snapshotTimeout: NodeJS.Timeout | null = null;

    const channel = supabase
      .channel("public:fdc_pharmacy_inventory")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fdc_inventory_snapshots" },
        fetchInventory,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fdc_inventory_daily_value" },
        () => {
          if (snapshotTimeout) clearTimeout(snapshotTimeout);
          snapshotTimeout = setTimeout(() => {
            fetchSnapshotHistory();
            fetchFilteredSnapshotHistory();
          }, 1000);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fdc_analytics_anomalies" },
        fetchAnomalies,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (snapshotTimeout) clearTimeout(snapshotTimeout);
    };
  }, [enabled, fetchInventory, fetchAnomalies, fetchSnapshotHistory, fetchFilteredSnapshotHistory]);

  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((anomaly) =>
      inventory.some((item) => anomalyMatchesInventoryItem(anomaly, item)),
    );
  }, [anomalies, inventory]);

  const snapshotHistory = useMemo(() => {
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
          totalStock: inventory.reduce(
            (sum, item) => sum + (Number(item.currentStock) || 0),
            0,
          ),
          totalValue: inventory.reduce((sum, item) => sum + getInventoryValue(item), 0),
        });
      }
    }

    return compactSnapshotHistoryByWeek(Array.from(mergedByDate.values()));
  }, [rawSnapshotHistory, inventory]);

  useEffect(() => {
    if (!enabled) {
      setItemSnapshots([]);
      return;
    }

    if (selectedItem) {
      fetchItemSnapshots(selectedItem);
    } else {
      setItemSnapshots([]);
    }
  }, [enabled, selectedItem, fetchItemSnapshots]);

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (!matchesInventorySearchQuery(item, searchQuery)) {
        return false;
      }

      if (filterWarehouse !== "all" && item.warehouse !== filterWarehouse) return false;
      if (filterCategory !== "all" && item.category !== filterCategory) return false;

      if (filterStatus !== "all") {
        if (filterStatus === "anomaly") {
          const hasAnomaly = filteredAnomalies.some(
            (anomaly) =>
              !anomaly.acknowledged &&
              anomalyMatchesInventoryItem(anomaly, item),
          );
          if (!hasAnomaly) return false;
        } else if (filterStatus === "near_expiry") {
          if (!hasNearExpiry(item)) return false;
        } else if (item.status !== filterStatus) {
          return false;
        }
      }

      return true;
    });
  }, [inventory, searchQuery, filterWarehouse, filterCategory, filterStatus, filteredAnomalies]);

  const sortedInventory = useMemo(() => {
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
  }, [filteredInventory, sortKey, sortDir]);

  const toggleSort = useCallback((key: InventorySortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((direction) => (direction === "asc" ? "desc" : "asc"));
        return prevKey;
      }

      setSortDir(key === "name" ? "asc" : "desc");
      return key;
    });
  }, []);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(inventory.map((item) => item.category))).sort();
  }, [inventory]);

  const uniqueWarehouses = useMemo(() => {
    return Array.from(new Set(inventory.map((item) => item.warehouse))).sort();
  }, [inventory]);

  const totalItems = inventory.length;

  const activeAnomaliesCount = useMemo(() => {
    return filteredAnomalies.filter((item) => !item.acknowledged).length;
  }, [filteredAnomalies]);

  const nearExpiryCount = useMemo(() => {
    return inventory.filter((item) => hasNearExpiry(item)).length;
  }, [inventory]);

  const estimatedValue = useMemo(() => {
    return inventory.reduce((sum, item) => sum + getInventoryValue(item), 0);
  }, [inventory]);

  const filteredValue = useMemo(() => {
    return sortedInventory.reduce((sum, item) => sum + getInventoryValue(item), 0);
  }, [sortedInventory]);

  const topMaterials: TopMaterial[] = useMemo(() => {
    const byName = new Map<string, TopMaterial>();

    const normalizeName = (name: string) =>
      name
        .replace(/[-–]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    inventory.forEach((item) => {
      const key = normalizeName(item.name);
      const value = getInventoryValue(item);
      const existing = byName.get(key);

      if (existing) {
        existing.value += value;
        existing.stock += item.currentStock;
      } else {
        byName.set(key, {
          materialId: item.sku,
          name: item.name,
          value,
          unit: item.unit,
          stock: item.currentStock,
        });
      }
    });

    return Array.from(byName.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [inventory]);

  const acknowledgeAnomaly = async (id: string) => {
    const { error } = await supabase
      .from("fdc_analytics_anomalies")
      .update({ is_acknowledged: true })
      .eq("id", id);

    if (!error) {
      setAnomalies((prev) =>
        prev.map((item) => (item.id === id ? { ...item, acknowledged: true } : item)),
      );
    }
  };

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    filterWarehouse,
    setFilterWarehouse,
    filterCategory,
    setFilterCategory,
    filterStatus,
    setFilterStatus,
    filteredInventory: sortedInventory,
    uniqueCategories,
    uniqueWarehouses,
    sortKey,
    sortDir,
    toggleSort,
    selectedItem,
    setSelectedItem,
    anomalies: filteredAnomalies,
    acknowledgeAnomaly,
    snapshotHistory,
    filteredSnapshotHistory,
    itemSnapshots,
    isLoadingItemSnapshots,
    isLoadingSnapshotHistory,
    isLoadingFilteredSnapshotHistory,
    topMaterials,
    filteredValue,
    lastSyncDate,
    error,
    stats: {
      totalItems,
      activeAnomaliesCount,
      nearExpiryCount,
      estimatedValue,
    },
  };
}
