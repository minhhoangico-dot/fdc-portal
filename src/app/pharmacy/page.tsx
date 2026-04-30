import React from "react";
import { format, parseISO } from "date-fns";
import {
  BarChart2,
  Clock,
  DollarSign,
  List,
  Package,
  Pill,
  ShieldAlert,
  TrendingDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  PharmacyAnomalyCenter,
  PharmacyAnomalyPreview,
} from "@/app/pharmacy/PharmacyAnomalySections";
import {
  PharmacyCharts,
  PharmacyListValueChart,
} from "@/app/pharmacy/PharmacyCharts";
import {
  PharmacyDetailDrawer,
  type PharmacyImportHistoryEntry,
} from "@/app/pharmacy/PharmacyDetailDrawer";
import { PharmacyFilters } from "@/app/pharmacy/PharmacyFilters";
import { PharmacyInventoryTable } from "@/app/pharmacy/PharmacyInventoryTable";
import { PharmacyKpiGrid } from "@/app/pharmacy/PharmacyKpiGrid";
import { anomalyMatchesInventoryItem } from "@/lib/inventory-identity";
import {
  getDerivedPharmacyInventoryStatus,
  hasPharmacyExceptionalAnomaly,
} from "@/lib/pharmacyInventoryPresentation";
import { supabase } from "@/lib/supabase";
import type { InventoryAnomaly, InventoryItem } from "@/types/inventory";
import { usePharmacyInventory } from "@/viewmodels/usePharmacyInventory";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

const UI_COPY = {
  title: "\u0051\u0075\u1ea3\u006e\u0020\u006c\u00fd\u0020\u004b\u0068\u006f\u0020\u0054\u0068\u0075\u1ed1\u0063",
  updatedAt: "\u0043\u1ead\u0070\u0020\u006e\u0068\u1ead\u0074",
  overviewTab: "\u0054\u1ed5\u006e\u0067\u0020\u0071\u0075\u0061\u006e",
  listTab: "\u0044\u0061\u006e\u0068\u0020\u0073\u00e1\u0063\u0068",
  anomaliesTab: "\u0042\u1ea5\u0074\u0020\u0074\u0068\u01b0\u1edd\u006e\u0067",
  currentValue: "\u0054\u1ed5\u006e\u0067\u0020\u0067\u0069\u00e1\u0020\u0074\u0072\u1ecb\u0020\u0028\u0068\u0069\u1ec7\u006e\u0020\u0074\u1ea1\u0069\u0029",
  itemCount: "\u0053\u1ed1\u0020\u006c\u01b0\u1ee3\u006e\u0067\u0020\u006d\u00e3\u0020\u0068\u00e0\u006e\u0067",
  itemUnit: "\u006d\u00e3",
} as const;

const SEVERITY_LABELS: Record<string, string> = {
  critical: "\u004e\u0067\u0068\u0069\u00ea\u006d\u0020\u0074\u0072\u1ecd\u006e\u0067",
  high: "\u0043\u0061\u006f",
  medium: "\u0054\u0072\u0075\u006e\u0067\u0020\u0062\u00ec\u006e\u0068",
  low: "\u0054\u0068\u1ea5\u0070",
};

const RULE_LABELS: Record<string, string> = {
  low_stock: "\u0054\u1ed3\u006e\u0020\u006b\u0068\u006f\u0020\u0074\u0068\u1ea5\u0070",
  near_expiry: "\u0053\u1eaf\u0070\u0020\u0068\u1ebf\u0074\u0020\u0068\u1ea1\u006e",
  expired: "\u0110\u00e3\u0020\u0068\u1ebf\u0074\u0020\u0068\u1ea1\u006e",
  zero_stock: "\u0048\u1ebf\u0074\u0020\u0068\u00e0\u006e\u0067",
  stock_spike: "\u0042\u0069\u1ebf\u006e\u0020\u0111\u1ed9\u006e\u0067\u0020\u0111\u1ed9\u0074\u0020\u0062\u0069\u1ebf\u006e",
};

const STATUS_LABELS = {
  outOfStock: "\u0048\u1ebf\u0074\u0020\u0068\u00e0\u006e\u0067",
  lowStock: "\u0053\u1eaf\u0070\u0020\u0068\u1ebf\u0074",
  anomaly: "\u0042\u1ea5\u0074\u0020\u0074\u0068\u01b0\u1edd\u006e\u0067",
  normal: "\u0042\u00ec\u006e\u0068\u0020\u0074\u0068\u01b0\u1edd\u006e\u0067",
} as const;

export default function PharmacyPage() {
  const navigate = useNavigate();
  const {
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
    sortKey,
    sortDir,
    toggleSort,
    uniqueCategories,
    uniqueWarehouses,
    selectedItem,
    setSelectedItem,
    anomalies,
    acknowledgeAnomaly,
    snapshotHistory,
    isLoadingSnapshotHistory,
    filteredSnapshotHistory,
    isLoadingFilteredSnapshotHistory,
    itemSnapshots,
    isLoadingItemSnapshots,
    filteredValue,
    topMaterials,
    lastSyncDate,
    error,
    stats,
  } = usePharmacyInventory();

  const hasListChartFilters =
    filterWarehouse !== "all" ||
    filterCategory !== "all" ||
    filterStatus !== "all" ||
    Boolean(searchQuery.trim());
  const listChartData = hasListChartFilters ? filteredSnapshotHistory : snapshotHistory;
  const isLoadingListChart = hasListChartFilters
    ? isLoadingFilteredSnapshotHistory && filteredSnapshotHistory.length === 0
    : isLoadingSnapshotHistory && snapshotHistory.length === 0;
  const isRefreshingListChart = hasListChartFilters
    ? isLoadingFilteredSnapshotHistory && filteredSnapshotHistory.length > 0
    : isLoadingSnapshotHistory && snapshotHistory.length > 0;

  const [importHistory, setImportHistory] = React.useState<PharmacyImportHistoryEntry[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = React.useState(false);

  React.useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedItem?.medicineCode) {
        setImportHistory([]);
        return;
      }

      setIsFetchingHistory(true);
      const { data } = await supabase
        .from("fdc_medicine_imports")
        .select("id, import_date, unit_price, quantity, batch_number")
        .eq("medicine_code", selectedItem.medicineCode)
        .order("import_date", { ascending: false })
        .limit(10);

      setImportHistory((data as PharmacyImportHistoryEntry[] | null) || []);
      setIsFetchingHistory(false);
    };

    fetchHistory();
  }, [selectedItem]);

  const activeAnomalies = anomalies.filter((anomaly) => !anomaly.acknowledged);
  const selectedItemAnomalies = React.useMemo(() => {
    if (!selectedItem) {
      return [];
    }

    return anomalies.filter((anomaly) =>
      anomalyMatchesInventoryItem(anomaly, selectedItem),
    );
  }, [anomalies, selectedItem]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-rose-500 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-amber-500 text-white";
      case "low":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getSeverityLabel = (severity: string) => {
    return SEVERITY_LABELS[severity] ?? severity;
  };

  const getRuleLabel = (rule: string) => {
    return RULE_LABELS[rule] ?? rule;
  };

  const getRuleIcon = (rule: string) => {
    switch (rule) {
      case "low_stock":
        return <TrendingDown className="w-4 h-4" />;
      case "near_expiry":
        return <Clock className="w-4 h-4" />;
      case "expired":
        return <ShieldAlert className="w-4 h-4" />;
      case "zero_stock":
        return <Package className="w-4 h-4" />;
      case "stock_spike":
        return <BarChart2 className="w-4 h-4" />;
      default:
        return <ShieldAlert className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (item: InventoryItem) => {
    const itemAnomalies = activeAnomalies.filter((anomaly) =>
      anomalyMatchesInventoryItem(anomaly, item),
    );
    const derivedStatus = getDerivedPharmacyInventoryStatus(item, itemAnomalies);

    if (derivedStatus === "out_of_stock") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200">
          {STATUS_LABELS.outOfStock}
        </span>
      );
    }

    if (derivedStatus === "low_stock") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
          {STATUS_LABELS.lowStock}
        </span>
      );
    }

    if (hasPharmacyExceptionalAnomaly(itemAnomalies)) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
          {STATUS_LABELS.anomaly}
        </span>
      );
    }

    switch (item.status) {
      case "in_stock":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
            {STATUS_LABELS.normal}
          </span>
        );
      case "low_stock":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
            {STATUS_LABELS.lowStock}
          </span>
        );
      case "out_of_stock":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200">
            {STATUS_LABELS.outOfStock}
          </span>
        );
      default:
        return null;
    }
  };

  const inspectAnomaly = (anomaly: InventoryAnomaly) => {
    const found = filteredInventory.find((item) =>
      anomalyMatchesInventoryItem(anomaly, item),
    );

    if (!found) {
      return;
    }

    setSelectedItem(found);
    setActiveTab("list");
  };

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Pill className="w-6 h-6 text-indigo-600" />
            {UI_COPY.title}
          </h1>
          {lastSyncDate ? (
            <p className="text-xs text-gray-400 mt-1">
              {UI_COPY.updatedAt}: {format(parseISO(lastSyncDate), "dd/MM/yyyy HH:mm")}
            </p>
          ) : null}
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === "overview"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            {UI_COPY.overviewTab}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === "list"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <List className="w-4 h-4" />
            {UI_COPY.listTab}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("anomalies")}
            className={`relative flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === "anomalies"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            {UI_COPY.anomaliesTab}
            {stats.activeAnomaliesCount > 0 ? (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {stats.activeAnomaliesCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {activeTab === "overview" ? (
        <div className="space-y-6">
          <PharmacyKpiGrid
            stats={stats}
            onShowAllItems={() => {
              setFilterStatus("all");
              setActiveTab("list");
            }}
            onShowAnomalies={() => setActiveTab("anomalies")}
            onShowNearExpiry={() => {
              setFilterStatus("near_expiry");
              setActiveTab("list");
            }}
            onShowValuation={() => navigate("/valuation?module=pharmacy")}
          />

          <PharmacyCharts snapshotHistory={snapshotHistory} topMaterials={topMaterials} />

          <PharmacyAnomalyPreview
            anomalies={activeAnomalies}
            getSeverityColor={getSeverityColor}
            getSeverityLabel={getSeverityLabel}
            onShowAll={() => setActiveTab("anomalies")}
          />
        </div>
      ) : null}

      {activeTab === "list" ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-160px)] min-h-[600px]">
          <PharmacyFilters
            searchTerm={searchQuery}
            onSearchTermChange={setSearchQuery}
            warehouseFilter={filterWarehouse}
            onWarehouseFilterChange={setFilterWarehouse}
            categoryFilter={filterCategory}
            onCategoryFilterChange={setFilterCategory}
            statusFilter={filterStatus}
            onStatusFilterChange={setFilterStatus}
            warehouses={uniqueWarehouses}
            categories={uniqueCategories}
          />

          <div className="px-4 py-3 border-b border-gray-100 space-y-3">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-gray-500">{UI_COPY.currentValue}</span>
                <span className="text-base font-bold text-gray-900">
                  {formatCurrency(filteredValue)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-500" />
                <span className="text-sm text-gray-500">{UI_COPY.itemCount}</span>
                <span className="text-base font-bold text-gray-900">
                  {filteredInventory.length.toLocaleString("vi-VN")} {UI_COPY.itemUnit}
                </span>
              </div>
            </div>

            <PharmacyListValueChart
              data={listChartData}
              hasFilters={hasListChartFilters}
              isLoading={isLoadingListChart}
              isRefreshing={isRefreshingListChart}
            />
          </div>

          <PharmacyInventoryTable
            items={filteredInventory}
            sortKey={sortKey}
            sortDir={sortDir}
            onToggleSort={toggleSort}
            onSelectItem={setSelectedItem}
            renderStatusBadge={getStatusBadge}
          />
        </div>
      ) : null}

      {activeTab === "anomalies" ? (
        <div className="space-y-6">
          <PharmacyAnomalyCenter
            anomalies={anomalies}
            getSeverityColor={getSeverityColor}
            getSeverityLabel={getSeverityLabel}
            getRuleLabel={getRuleLabel}
            getRuleIcon={getRuleIcon}
            onInspectAnomaly={inspectAnomaly}
            onAcknowledgeAnomaly={acknowledgeAnomaly}
          />
        </div>
      ) : null}

      {selectedItem ? (
        <PharmacyDetailDrawer
          item={selectedItem}
          itemSnapshots={itemSnapshots}
          isLoadingItemSnapshots={isLoadingItemSnapshots}
          anomalies={selectedItemAnomalies}
          importHistory={importHistory}
          isFetchingHistory={isFetchingHistory}
          onClose={() => setSelectedItem(null)}
          renderStatusBadge={getStatusBadge}
        />
      ) : null}
    </div>
  );
}
