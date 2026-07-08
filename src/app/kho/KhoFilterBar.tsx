/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Search } from "lucide-react";

import type { InventoryFilterStatus } from "@/types/inventory";

/**
 * KhoFilterBar — re-skin of `PharmacyFilters` (Thuốc) + the inventory-page
 * inline filter row (Vật tư) onto shared tokens (Phase 3 spec §5 mapping
 * row 2).
 *
 * Same fields the frozen viewmodels already expose
 * (`searchQuery`/`filterWarehouse`/`filterCategory`/`filterStatus` +
 * setters, `uniqueWarehouses`, `uniqueCategories`). The status-filter option
 * set differs by warehouse in the legacy sources (Thuốc adds "Sắp hết hạn" /
 * "Có bất thường", Vật tư does not) and the "category" label copy differs
 * ("Tất cả nhóm" vs "Tất cả loại") — both preserved verbatim per `warehouse`,
 * not normalized. Pure presentational: emits the raw values the viewmodel
 * setters already accept, no filtering happens here.
 */

export interface KhoFilterBarProps {
  warehouse: "thuoc" | "vat-tu";
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  filterWarehouse: string;
  onFilterWarehouseChange: (value: string) => void;
  filterCategory: string;
  onFilterCategoryChange: (value: string) => void;
  filterStatus: InventoryFilterStatus;
  onFilterStatusChange: (value: InventoryFilterStatus) => void;
  uniqueWarehouses: string[];
  uniqueCategories: string[];
}

const SELECT_CLASS =
  "rounded-field border border-line bg-card px-3 py-1.5 text-[13px] text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-600";

export function KhoFilterBar({
  warehouse,
  searchQuery,
  onSearchQueryChange,
  filterWarehouse,
  onFilterWarehouseChange,
  filterCategory,
  onFilterCategoryChange,
  filterStatus,
  onFilterStatusChange,
  uniqueWarehouses,
  uniqueCategories,
}: KhoFilterBarProps) {
  const isThuoc = warehouse === "thuoc";

  return (
    <div className="space-y-3 border-b border-line p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="text"
          placeholder={isThuoc ? "Tìm kiếm thuốc, mã thuốc..." : "Tìm kiếm vật tư..."}
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          className="w-full rounded-card border border-line bg-paper py-2.5 pl-10 pr-4 text-[14px] text-ink-900 transition-colors focus:border-brand-600 focus:bg-card focus:outline-none focus:ring-2 focus:ring-brand-600/20"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={filterWarehouse}
          onChange={(event) => onFilterWarehouseChange(event.target.value)}
          className={SELECT_CLASS}
        >
          <option value="all">Tất cả kho</option>
          {uniqueWarehouses.map((wh) => (
            <option key={wh} value={wh}>
              {wh}
            </option>
          ))}
        </select>

        <select
          value={filterCategory}
          onChange={(event) => onFilterCategoryChange(event.target.value)}
          className={SELECT_CLASS}
        >
          <option value="all">{isThuoc ? "Tất cả nhóm" : "Tất cả loại"}</option>
          {uniqueCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(event) => onFilterStatusChange(event.target.value as InventoryFilterStatus)}
          className={SELECT_CLASS}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="in_stock">Bình thường</option>
          <option value="low_stock">Sắp hết</option>
          {isThuoc ? <option value="near_expiry">Sắp hết hạn</option> : null}
          <option value="out_of_stock">Hết hàng</option>
          {isThuoc ? <option value="anomaly">Có bất thường</option> : null}
        </select>
      </div>
    </div>
  );
}

export default KhoFilterBar;
