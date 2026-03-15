import { useState, useMemo, useEffect, useCallback } from "react";
import { parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";
import {
  InventoryItem,
  InventoryAnomaly,
  SnapshotHistory,
  ItemSnapshot,
  TopMaterial,
} from "@/types/inventory";

type InventoryModuleType = "pharmacy" | "inventory" | "all";

interface UseInventoryOptions {
  enabled?: boolean;
}

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

const compactSnapshotHistoryByWeek = (
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

const applySnapshotSourceFilter = (query: any, moduleType: InventoryModuleType) => {
  if (moduleType === "inventory") {
    return query.like("his_medicineid", "misa_%");
  }
  if (moduleType === "pharmacy") {
    return query
      .not("his_medicineid", "is", null)
      .not("his_medicineid", "like", "misa_%");
  }
  return query;
};

const matchesInventoryHistoryFilters = (
  item: InventoryItem,
  category: string,
  query: string,
): boolean => {
  const normalizedQuery = query.trim().toLowerCase();

  if (category !== "all" && item.category !== category) {
    return false;
  }

  if (
    normalizedQuery &&
    !item.name.toLowerCase().includes(normalizedQuery) &&
    !item.sku.toLowerCase().includes(normalizedQuery)
  ) {
    return false;
  }

  return true;
};

const EMPTY_FILTER_IDS: string[] = [];

export function useInventory(moduleType: InventoryModuleType = 'all', options: UseInventoryOptions = {}) {
  const enabled = options.enabled ?? true;
  const [activeTab, setActiveTab] = useState<"overview" | "list" | "anomalies">("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock" | "anomaly" | "near_expiry">("all");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [anomalies, setAnomalies] = useState<InventoryAnomaly[]>([]);
  const [rawSnapshotHistory, setRawSnapshotHistory] = useState<SnapshotHistory[]>([]);
  const [filteredSnapshotHistory, setFilteredSnapshotHistory] = useState<SnapshotHistory[]>([]);
  const [itemSnapshots, setItemSnapshots] = useState<ItemSnapshot[]>([]);
  const [isLoadingItemSnapshots, setIsLoadingItemSnapshots] = useState(false);
  const [isLoadingSnapshotHistory, setIsLoadingSnapshotHistory] = useState(false);
  const [isLoadingFilteredSnapshotHistory, setIsLoadingFilteredSnapshotHistory] = useState(false);

  type SortKey = "name" | "stock" | "value";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const inventoryHistoryTargetIds = useMemo(() => {
    if (moduleType !== "inventory") {
      return EMPTY_FILTER_IDS;
    }

    return inventory
      .filter((item) =>
        matchesInventoryHistoryFilters(item, filterCategory, searchQuery),
      )
      .map((item) => item.sku)
      .filter(Boolean);
  }, [inventory, moduleType, filterCategory, searchQuery]);

  // Fetch inventory, preferring today's snapshot but falling back to latest available date
  const fetchInventory = useCallback(async () => {
    if (!enabled) return;

    const todayDate = formatLocalDate(new Date());

    const loadForDate = async (snapshotDate: string) => {
      let allData: any[] = [];
      let from = 0;
      const PAGE_SIZE = 1000;
      let hasMore = true;

      while (hasMore) {
        const query = applySnapshotSourceFilter(
          supabase
          .from('fdc_inventory_snapshots')
          .select('*')
          .eq('snapshot_date', snapshotDate)
          .order('name')
          .range(from, from + PAGE_SIZE - 1),
          moduleType,
        );

        const { data, error } = await query;
        if (error) {
          console.error('[DEBUG] fetchInventory error:', error);
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

    // 1. Try today's snapshot
    let allData = await loadForDate(todayDate);

    // 2. If nothing for today, fall back to the latest date that actually has matching data
    if (allData.length === 0) {
      const fallbackQuery = applySnapshotSourceFilter(
        supabase
        .from('fdc_inventory_snapshots')
        .select('snapshot_date')
        .order('snapshot_date', { ascending: false }),
        moduleType,
      );

      const { data: latest, error: latestError } = await fallbackQuery.limit(1);

      if (latestError) {
        console.error('[DEBUG] fetchInventory latest snapshot_date error:', latestError);
      } else if (latest && latest.length > 0) {
        const latestDate = latest[0].snapshot_date as string;
        if (latestDate && latestDate !== todayDate) {
          allData = await loadForDate(latestDate);
        }
      }
    }

    if (allData.length > 0) {
      setInventory(allData.map((item: any) => ({
        id: item.id,
        name: item.name,
        sku: item.his_medicineid?.toString() || item.id,
        category: item.category || 'Khác',
        warehouse: item.warehouse || 'Kho Tổng',
        currentStock: item.current_stock || 0,
        unit: item.unit || 'Cái',
        status: item.status as any,
        batchNumber: item.batch_number,
        expiryDate: item.expiry_date,
        lastUpdated: item.snapshot_date || item.created_at,
        unitPrice: item.unit_price || 0,
        medicineCode: item.medicine_code
      })));
    } else {
      setInventory([]);
    }
  }, [enabled, moduleType]);

  // Fetch anomalies
  const fetchAnomalies = useCallback(async () => {
    if (!enabled) return;

    const { data } = await supabase
      .from('fdc_analytics_anomalies')
      .select('*')
      .order('detected_at', { ascending: false });
    if (data) {
      setAnomalies(data.map(item => ({
        id: item.id,
        materialId: item.material_name,
        rule: (item.rule_id as any) || 'low_stock',
        severity: (item.severity as any) || 'medium',
        description: item.description || '',
        detectedAt: item.detected_at,
        acknowledged: item.is_acknowledged || false
      })));
    }
  }, [enabled]);

  // Fetch 1-year daily history and compact to weekly points in the client.
  const fetchSnapshotHistory = useCallback(async () => {
    if (!enabled) return;

    setIsLoadingSnapshotHistory(true);
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const cutoffDate = formatLocalDate(oneYearAgo);

      const { data, error } = await supabase
        .from('fdc_inventory_daily_value')
        .select('snapshot_date, total_stock, total_value')
        .gte('snapshot_date', cutoffDate)
        .eq('module_type', moduleType === 'pharmacy' ? 'pharmacy' : 'inventory')
        .order('snapshot_date', { ascending: true });

      if (error) {
        console.error('[DEBUG] fetchSnapshotHistory error:', error);
      }

      if (data && data.length > 0) {
        const result = data.map((row: any) => ({
          date: row.snapshot_date,
          totalStock: Number(row.total_stock) || 0,
          totalValue: Number(row.total_value) || 0,
        }));
        setRawSnapshotHistory(result);
      } else {
        setRawSnapshotHistory([]);
      }
    } finally {
      setIsLoadingSnapshotHistory(false);
    }
  }, [enabled, moduleType]);

  const fetchFilteredSnapshotHistory = useCallback(async () => {
    if (!enabled) return;

    const hasFilters =
      moduleType === "inventory"
        ? filterCategory !== "all" || Boolean(searchQuery?.trim())
        : filterWarehouse !== "all" ||
          filterCategory !== "all" ||
          filterStatus !== "all" ||
          Boolean(searchQuery?.trim());

    if (!hasFilters) {
      setFilteredSnapshotHistory([]);
      return;
    }

    setIsLoadingFilteredSnapshotHistory(true);
    try {
      if (moduleType === "pharmacy") {
        const { data, error } = await supabase.rpc("get_pharmacy_inventory_history", {
          p_warehouse: filterWarehouse !== "all" ? filterWarehouse : null,
          p_category: filterCategory !== "all" ? filterCategory : null,
          p_search: searchQuery?.trim() ? searchQuery.trim() : null,
          p_status: filterStatus !== "all" ? filterStatus : null,
        });

        if (error) {
          console.error("[DEBUG] fetchFilteredSnapshotHistory error:", error);
          setFilteredSnapshotHistory([]);
          return;
        }

        const result = (data || []).map((row: any) => ({
          date: row.snapshot_date,
          totalStock: Number(row.total_stock) || 0,
          totalValue: Number(row.total_value) || 0,
        }));
        setFilteredSnapshotHistory(result);
      } else if (moduleType === "inventory") {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const cutoff = formatLocalDate(oneYearAgo);
        if (inventoryHistoryTargetIds.length === 0) {
          setFilteredSnapshotHistory([]);
          return;
        }

        const byDate = new Map<string, { totalStock: number; totalValue: number }>();
        const PAGE_SIZE = 1000;
        const ID_BATCH_SIZE = 100;

        for (let batchStart = 0; batchStart < inventoryHistoryTargetIds.length; batchStart += ID_BATCH_SIZE) {
          const idBatch = inventoryHistoryTargetIds.slice(batchStart, batchStart + ID_BATCH_SIZE);
          let from = 0;
          let hasMore = true;

          while (hasMore) {
            const { data, error } = await supabase
              .from("fdc_inventory_snapshots")
              .select("snapshot_date, current_stock, unit_price, his_medicineid")
              .gte("snapshot_date", cutoff)
              .in("his_medicineid", idBatch)
              .order("snapshot_date", { ascending: true })
              .order("his_medicineid", { ascending: true })
              .range(from, from + PAGE_SIZE - 1);

            if (error) {
              console.error(
                "[DEBUG] fetchFilteredSnapshotHistory inventory query error:",
                error,
              );
              setFilteredSnapshotHistory([]);
              return;
            }

            const batch = data || [];
            for (const row of batch) {
              const date = row.snapshot_date as string;
              const stock = Number(row.current_stock) || 0;
              const price = Number(row.unit_price) || 0;
              const current = byDate.get(date) ?? { totalStock: 0, totalValue: 0 };
              current.totalStock += stock;
              current.totalValue += stock * price;
              byDate.set(date, current);
            }

            from += PAGE_SIZE;
            hasMore = batch.length === PAGE_SIZE;
          }
        }

        const result = compactSnapshotHistoryByWeek(
          Array.from(byDate.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, total]) => ({
              date,
              totalStock: total.totalStock,
              totalValue: total.totalValue,
            })),
        );

        setFilteredSnapshotHistory(result);
      }
    } finally {
      setIsLoadingFilteredSnapshotHistory(false);
    }
  }, [enabled, inventoryHistoryTargetIds, moduleType, filterWarehouse, filterCategory, filterStatus, searchQuery]);

  // Fetch per-item snapshot history (when selecting an item)
  const fetchItemSnapshots = useCallback(async (itemName: string, warehouse: string) => {
    if (!enabled) return;

    setIsLoadingItemSnapshots(true);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = formatLocalDate(thirtyDaysAgo);

    const { data, error } = await applySnapshotSourceFilter(
      supabase
      .from('fdc_inventory_snapshots')
      .select('snapshot_date, current_stock')
      .eq('name', itemName)
      .eq('warehouse', warehouse)
      .gte('snapshot_date', cutoffDate)
      .order('snapshot_date', { ascending: true }),
      moduleType,
    );

    if (error) {
      console.error('[DEBUG] fetchItemSnapshots error:', error);
    }

    if (data) {
      setItemSnapshots(data.map(r => ({ date: r.snapshot_date, stock: r.current_stock || 0 })));
    } else {
      setItemSnapshots([]);
    }
    setIsLoadingItemSnapshots(false);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setInventory([]);
      setAnomalies([]);
      setRawSnapshotHistory([]);
      setFilteredSnapshotHistory([]);
      setItemSnapshots([]);
      setIsLoadingItemSnapshots(false);
      setIsLoadingSnapshotHistory(false);
      setIsLoadingFilteredSnapshotHistory(false);
      return;
    }

    fetchInventory();
    fetchAnomalies();
    fetchSnapshotHistory();
    fetchFilteredSnapshotHistory();

    let snapshotTimeout: NodeJS.Timeout | null = null;

    const channel = supabase.channel('public:fdc_inventory_redesign')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_inventory_snapshots' }, () => {
        fetchInventory();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_inventory_daily_value' }, () => {
        if (snapshotTimeout) clearTimeout(snapshotTimeout);
        snapshotTimeout = setTimeout(() => {
          fetchSnapshotHistory();
          fetchFilteredSnapshotHistory();
        }, 1000);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_analytics_anomalies' }, fetchAnomalies)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (snapshotTimeout) clearTimeout(snapshotTimeout);
    };
  }, [enabled, fetchInventory, fetchAnomalies, fetchSnapshotHistory, fetchFilteredSnapshotHistory]);

  const filteredAnomalies = useMemo(() => {
    return anomalies.filter(a => inventory.some(i => i.name === a.materialId));
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
          totalValue: inventory.reduce(
            (sum, item) =>
              sum + (Number(item.currentStock) || 0) * (Number(item.unitPrice) || 0),
            0,
          ),
        });
      }
    }

    return compactSnapshotHistoryByWeek(Array.from(mergedByDate.values()));
  }, [rawSnapshotHistory, inventory]);

  // When selectedItem changes, fetch its per-item snapshots
  useEffect(() => {
    if (!enabled) {
      setItemSnapshots([]);
      return;
    }

    if (selectedItem) {
      fetchItemSnapshots(selectedItem.name, selectedItem.warehouse);
    } else {
      setItemSnapshots([]);
    }
  }, [enabled, selectedItem, fetchItemSnapshots]);

  // Filtered inventory list
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (
        searchQuery &&
        !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.sku.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (filterWarehouse !== "all" && item.warehouse !== filterWarehouse) return false;
      if (filterCategory !== "all" && item.category !== filterCategory) return false;

      if (filterStatus !== "all") {
        if (filterStatus === "anomaly") {
          const hasAnomaly = filteredAnomalies.some(a => a.materialId === item.name && !a.acknowledged);
          if (!hasAnomaly) return false;
        } else if (filterStatus === "near_expiry") {
          if (!item.expiryDate) return false;
          const now = Date.now();
          const days = (new Date(item.expiryDate).getTime() - now) / (1000 * 3600 * 24);
          if (days < 0 || days > 90) return false;
        } else if (item.status !== filterStatus) {
          return false;
        }
      }
      return true;
    });
  }, [inventory, searchQuery, filterWarehouse, filterCategory, filterStatus, filteredAnomalies]);

  const sortedInventory = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const getValue = (i: InventoryItem) =>
      (Number(i.currentStock) || 0) * (Number(i.unitPrice) || 0);

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
            cmp = getValue(a.item) - getValue(b.item);
            break;
        }
        if (cmp === 0) return a.idx - b.idx;
        return cmp * dir;
      })
      .map((x) => x.item);
  }, [filteredInventory, sortKey, sortDir]);

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prevKey;
      }
      setSortDir(key === "name" ? "asc" : "desc");
      return key;
    });
  }, []);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(inventory.map(item => item.category))).sort();
  }, [inventory]);

  const uniqueWarehouses = useMemo(() => {
    return Array.from(new Set(inventory.map(item => item.warehouse))).sort();
  }, [inventory]);

  // Stats
  const totalItems = inventory.length;

  const activeAnomaliesCount = useMemo(() => {
    return filteredAnomalies.filter(a => !a.acknowledged).length;
  }, [filteredAnomalies]);

  const nearExpiryCount = useMemo(() => {
    const now = Date.now();
    return inventory.filter(item => {
      if (!item.expiryDate) return false;
      const days = (new Date(item.expiryDate).getTime() - now) / (1000 * 3600 * 24);
      return days >= 0 && days <= 90;
    }).length;
  }, [inventory]);

  const estimatedValue = useMemo(() => {
    return inventory.reduce((sum, item) => sum + item.currentStock * (item.unitPrice || 0), 0);
  }, [inventory]);

  const filteredValue = useMemo(() => {
    return sortedInventory.reduce((sum, item) => sum + item.currentStock * (item.unitPrice || 0), 0);
  }, [sortedInventory]);

  // Top 10 items by value (grouped by normalized name to avoid variants like hyphen/spacing)
  const topMaterials: TopMaterial[] = useMemo(() => {
    const byName = new Map<string, TopMaterial>();

    const normalizeName = (name: string) =>
      name
        .replace(/[-–]/g, " ") // treat hyphen like space
        .replace(/\s+/g, " ")  // collapse spaces
        .trim()
        .toLowerCase();

    inventory.forEach(item => {
      const key = normalizeName(item.name);
      const value = item.currentStock * (item.unitPrice || 0);
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
      .from('fdc_analytics_anomalies')
      .update({ is_acknowledged: true })
      .eq('id', id);

    if (!error) {
      setAnomalies((prev) =>
        prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
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
    stats: {
      totalItems,
      activeAnomaliesCount,
      nearExpiryCount,
      estimatedValue,
    },
  };
}
