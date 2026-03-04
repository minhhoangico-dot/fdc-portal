import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const mockUsageTrend = Array.from({ length: 30 }).map((_, i) => ({
  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
  usage: Math.floor(Math.random() * 50) + 10,
  patientCount: Math.floor(Math.random() * 200) + 50
}));

const mockTopMaterials = [
  { materialId: '1', name: 'Găng tay y tế', consumption: 1500, unit: 'Hộp' },
  { materialId: '2', name: 'Bơm kim tiêm 5ml', consumption: 1200, unit: 'Cái' },
  { materialId: '3', name: 'Bông y tế', consumption: 800, unit: 'Cuộn' },
  { materialId: '4', name: 'Nước muối sinh lý', consumption: 600, unit: 'Chai' },
  { materialId: '5', name: 'Cồn 70 độ', consumption: 400, unit: 'Chai' },
];
import {
  InventoryItem,
  InventoryAnomaly,
  InventoryCategory,
  Warehouse,
} from "@/types/inventory";

export function useInventory() {
  const [activeTab, setActiveTab] = useState<"list" | "analytics">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState<Warehouse | "all">("all");
  const [filterCategory, setFilterCategory] = useState<InventoryCategory | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock" | "anomaly">("all");

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [anomalies, setAnomalies] = useState<InventoryAnomaly[]>([]);

  const fetchInventory = useCallback(async () => {
    const { data } = await supabase.from('fdc_inventory_snapshots').select('*').order('name');
    if (data) {
      setInventory(data.map(item => ({
        id: item.id,
        name: item.name,
        sku: item.his_medicineid?.toString() || item.id,
        category: (item.category as InventoryCategory) || 'van_phong',
        warehouse: (item.warehouse as Warehouse) || 'kho_chinh',
        currentStock: item.current_stock || 0,
        approvedExport: item.approved_export || 0,
        unit: item.unit || 'Cái',
        status: (item.status as any) || 'in_stock',
        minQuantity: 10,
        lastUpdated: item.snapshot_date || item.created_at
      })));
    }
  }, []);

  const fetchAnomalies = useCallback(async () => {
    const { data } = await supabase.from('fdc_analytics_anomalies').select('*').order('detected_at', { ascending: false });
    if (data) {
      setAnomalies(data.map(item => ({
        id: item.id,
        materialId: item.material_name,
        rule: (item.rule_id as any) || 'spike',
        severity: (item.severity as any) || 'medium',
        description: item.description || '',
        detectedAt: item.detected_at,
        acknowledged: item.is_acknowledged || false
      })));
    }
  }, []);

  useEffect(() => {
    fetchInventory();
    fetchAnomalies();

    const channel = supabase.channel('public:fdc_inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_inventory_snapshots' }, fetchInventory)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_analytics_anomalies' }, fetchAnomalies)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInventory, fetchAnomalies]);

  // Filtered inventory list
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      // Search
      if (
        searchQuery &&
        !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.sku.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Warehouse
      if (filterWarehouse !== "all" && item.warehouse !== filterWarehouse) {
        return false;
      }

      // Category
      if (filterCategory !== "all" && item.category !== filterCategory) {
        return false;
      }

      // Status
      if (filterStatus !== "all") {
        if (filterStatus === "anomaly") {
          // Check by name since materialId currently mapped to map_name
          const hasAnomaly = anomalies.some(
            (a) => a.materialId === item.name && !a.acknowledged,
          );
          if (!hasAnomaly) return false;
        } else if (item.status !== filterStatus) {
          return false;
        }
      }

      return true;
    });
  }, [inventory, searchQuery, filterWarehouse, filterCategory, filterStatus, anomalies]);

  // Top cards data
  const totalItems = inventory.length;
  const activeAnomaliesCount = anomalies.filter((a) => !a.acknowledged).length;
  const todayReleases = inventory.reduce((sum, item) => sum + item.approvedExport, 0);

  const estimatedValue = useMemo(() => {
    return inventory.reduce((sum, item) => {
      // Estimated price mock since DB doesn't have it
      const price = Math.floor(Math.random() * 490000) + 10000;
      return sum + item.currentStock * price;
    }, 0);
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
    filteredInventory,
    selectedItem,
    setSelectedItem,
    anomalies,
    acknowledgeAnomaly,
    usageTrend: mockUsageTrend,
    topMaterials: mockTopMaterials,
    stats: {
      totalItems,
      activeAnomaliesCount,
      todayReleases,
      estimatedValue,
    },
  };
}
