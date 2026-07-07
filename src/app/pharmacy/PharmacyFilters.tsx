/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Search } from "lucide-react";

import type { InventoryFilterStatus } from "@/types/inventory";

export interface PharmacyFiltersProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  warehouseFilter: string;
  onWarehouseFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  statusFilter: InventoryFilterStatus;
  onStatusFilterChange: (value: InventoryFilterStatus) => void;
  warehouses: string[];
  categories: string[];
}

export function PharmacyFilters({
  searchTerm,
  onSearchTermChange,
  warehouseFilter,
  onWarehouseFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  statusFilter,
  onStatusFilterChange,
  warehouses,
  categories,
}: PharmacyFiltersProps) {
  return (
    <div className="p-4 border-b border-gray-100 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm kiếm thuốc, mã thuốc..."
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          value={warehouseFilter}
          onChange={(event) => onWarehouseFilterChange(event.target.value)}
          className="text-sm rounded-lg border-gray-200 py-1.5 pl-3 pr-8 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">Tất cả kho</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse} value={warehouse}>
              {warehouse}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(event) => onCategoryFilterChange(event.target.value)}
          className="text-sm rounded-lg border-gray-200 py-1.5 pl-3 pr-8 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">Tất cả nhóm</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) =>
            onStatusFilterChange(event.target.value as InventoryFilterStatus)
          }
          className="text-sm rounded-lg border-gray-200 py-1.5 pl-3 pr-8 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="in_stock">Bình thường</option>
          <option value="low_stock">Sắp hết</option>
          <option value="near_expiry">Sắp hết hạn</option>
          <option value="out_of_stock">Hết hàng</option>
          <option value="anomaly">Có bất thường</option>
        </select>
      </div>
    </div>
  );
}
