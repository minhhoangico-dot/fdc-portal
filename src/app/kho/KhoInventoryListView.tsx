/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import { DollarSign, Package } from "lucide-react";

import { formatCompact, formatVND } from "@/lib/utils";
import { ChartFrame, ValueTrendChart } from "@/ui/ChartFrame";
import { DataTable } from "@/ui/DataTable";
import type {
  InventoryAnomaly,
  InventoryFilterStatus,
  InventoryItem,
  InventorySortDir,
  InventorySortKey,
  SnapshotHistory,
} from "@/types/inventory";

import { KhoFilterBar } from "./KhoFilterBar";
import { buildThuocInventoryColumns, buildVatTuInventoryColumns } from "./khoInventoryColumns";

/**
 * KhoInventoryListView — re-skin of `PharmacyInventoryTable` +
 * `PharmacyFilters` + `PharmacyListValueChart` (Thuốc) and the inventory-page
 * inline list `<table>` + filters + list value chart (Vật tư) onto
 * `ui/DataTable` + `ui/ChartFrame`'s `ValueTrendChart` preset (Phase 3 spec
 * §5 mapping row 2).
 *
 * PRESENTATION ONLY. Consumes the ACTIVE frozen viewmodel
 * (`usePharmacyInventory` / `useSupplyInventory`) via `vm`, passed in by the
 * caller (`KhoWorkspace`) — same fields, same shape, zero re-sort / re-filter
 * / re-derive of `filteredInventory`. `hasFilters` and the chart
 * loading/refreshing booleans below are the identical pure presentation
 * compute copied from the legacy pages (`app/pharmacy/page.tsx:115-126` for
 * Thuốc, `app/inventory/page.tsx:134-141` for Vật tư) — not viewmodel logic —
 * kept branched per warehouse because the two legacy pages compute them
 * slightly differently (Thuốc's `hasFilters` also checks `filterStatus`).
 * `anomalies` is consumed in addition to the brief's field list because
 * `khoInventoryColumns`'s Thuốc status badge needs it to reproduce
 * `getDerivedPharmacyInventoryStatus`/`hasPharmacyExceptionalAnomaly`
 * verbatim (both take a per-item anomaly list as an argument).
 */

export interface KhoInventoryListVm {
  filteredInventory: InventoryItem[];
  sortKey: InventorySortKey;
  sortDir: InventorySortDir;
  toggleSort: (key: InventorySortKey) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filterWarehouse: string;
  setFilterWarehouse: (value: string) => void;
  filterCategory: string;
  setFilterCategory: (value: string) => void;
  filterStatus: InventoryFilterStatus;
  setFilterStatus: (value: InventoryFilterStatus) => void;
  uniqueCategories: string[];
  uniqueWarehouses: string[];
  filteredValue: number;
  snapshotHistory: SnapshotHistory[];
  filteredSnapshotHistory: SnapshotHistory[];
  isLoadingSnapshotHistory: boolean;
  isLoadingFilteredSnapshotHistory: boolean;
  anomalies: InventoryAnomaly[];
  setSelectedItem: (item: InventoryItem | null) => void;
}

export interface KhoInventoryListViewProps {
  /** The single ACTIVE viewmodel (pharmacy or supply) — enabled-dual-hook §4. */
  vm: KhoInventoryListVm;
  warehouse: "thuoc" | "vat-tu";
}

export function KhoInventoryListView({ vm, warehouse }: KhoInventoryListViewProps) {
  const {
    filteredInventory,
    sortKey,
    sortDir,
    toggleSort,
    searchQuery,
    setSearchQuery,
    filterWarehouse,
    setFilterWarehouse,
    filterCategory,
    setFilterCategory,
    filterStatus,
    setFilterStatus,
    uniqueCategories,
    uniqueWarehouses,
    filteredValue,
    snapshotHistory,
    filteredSnapshotHistory,
    isLoadingSnapshotHistory,
    isLoadingFilteredSnapshotHistory,
    anomalies,
    setSelectedItem,
  } = vm;

  const isThuoc = warehouse === "thuoc";

  const columns = useMemo(
    () => (isThuoc ? buildThuocInventoryColumns(anomalies) : buildVatTuInventoryColumns()),
    [isThuoc, anomalies],
  );

  // Verbatim per-warehouse compute of which snapshot series + loading state
  // drives the list value-trend chart — see file header for the legacy
  // source lines this mirrors.
  const hasFilters = isThuoc
    ? filterWarehouse !== "all" ||
      filterCategory !== "all" ||
      filterStatus !== "all" ||
      Boolean(searchQuery.trim())
    : filterWarehouse !== "all" || filterCategory !== "all" || searchQuery.trim() !== "";

  const chartData = hasFilters ? filteredSnapshotHistory : snapshotHistory;

  const isChartLoading = isThuoc
    ? hasFilters
      ? isLoadingFilteredSnapshotHistory && filteredSnapshotHistory.length === 0
      : isLoadingSnapshotHistory && snapshotHistory.length === 0
    : (hasFilters ? isLoadingFilteredSnapshotHistory : isLoadingSnapshotHistory) &&
      chartData.length === 0;

  const isChartRefreshing = isThuoc
    ? hasFilters
      ? isLoadingFilteredSnapshotHistory && filteredSnapshotHistory.length > 0
      : isLoadingSnapshotHistory && snapshotHistory.length > 0
    : hasFilters
      ? isLoadingFilteredSnapshotHistory
      : isLoadingSnapshotHistory;

  const isChartEmpty = isThuoc ? chartData.length <= 1 : chartData.length === 0;

  return (
    <div className="space-y-4">
      <ChartFrame
        title="Biến động giá trị tồn kho"
        subtitle={hasFilters ? "Theo bộ lọc" : "1 năm — toàn kho"}
        actions={
          isChartRefreshing ? (
            <span className="text-[11px] font-medium text-ink-400">
              {isThuoc ? "Đang cập nhật..." : "Đang tải..."}
            </span>
          ) : undefined
        }
        height={160}
        isLoading={isChartLoading}
        isEmpty={isChartEmpty}
        emptyLabel="Chưa có dữ liệu lịch sử."
      >
        {ValueTrendChart({
          data: chartData,
          valueFormatter: formatVND,
          compactFormatter: formatCompact,
          gradientId: "khoInventoryListValueTrend",
        })}
      </ChartFrame>

      <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
        <KhoFilterBar
          warehouse={warehouse}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          filterWarehouse={filterWarehouse}
          onFilterWarehouseChange={setFilterWarehouse}
          filterCategory={filterCategory}
          onFilterCategoryChange={setFilterCategory}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          uniqueWarehouses={uniqueWarehouses}
          uniqueCategories={uniqueCategories}
        />

        <div className="flex flex-wrap items-center gap-6 border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-brand-600" />
            <span className="text-[13px] text-ink-600">Tổng giá trị (theo bộ lọc)</span>
            <span className="text-[15px] font-bold text-ink-900">{formatVND(filteredValue)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-brand-600" />
            <span className="text-[13px] text-ink-600">Số lượng mã hàng</span>
            <span className="text-[15px] font-bold text-ink-900">
              {filteredInventory.length.toLocaleString("vi-VN")} mã
            </span>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={filteredInventory}
          rowKey={(item) => item.id}
          sortKey={sortKey}
          sortDir={sortDir}
          onToggleSort={(key) => toggleSort(key as InventorySortKey)}
          onRowClick={(item) => setSelectedItem(item)}
          emptyLabel={
            isThuoc ? "Không tìm thấy thuốc nào phù hợp." : "Không tìm thấy vật tư nào."
          }
          density="compact"
        />
      </div>
    </div>
  );
}

export default KhoInventoryListView;
