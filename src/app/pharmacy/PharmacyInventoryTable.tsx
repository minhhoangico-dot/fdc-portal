/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from "react";
import { format } from "date-fns";
import { ArrowUpDown } from "lucide-react";

import type {
  InventoryItem,
  InventorySortDir,
  InventorySortKey,
} from "@/types/inventory";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

export interface PharmacyInventoryTableProps {
  items: InventoryItem[];
  sortKey: InventorySortKey;
  sortDir: InventorySortDir;
  onToggleSort: (key: InventorySortKey) => void;
  onSelectItem: (item: InventoryItem) => void;
  renderStatusBadge: (item: InventoryItem) => ReactNode;
}

export function PharmacyInventoryTable({
  items,
  sortKey,
  sortDir,
  onToggleSort,
  onSelectItem,
  renderStatusBadge,
}: PharmacyInventoryTableProps) {
  const renderSortButton = (
    key: InventorySortKey,
    label: string,
    title: string,
  ) => (
    <button
      type="button"
      onClick={() => onToggleSort(key)}
      className="inline-flex items-center gap-1 hover:text-gray-700"
      title={title}
    >
      {label}
      <ArrowUpDown
        className={`w-3.5 h-3.5 ${
          sortKey === key ? "text-indigo-600" : "text-gray-400"
        }`}
      />
      {sortKey === key && (
        <span className="sr-only">
          {sortDir === "asc" ? "tăng dần" : "giảm dần"}
        </span>
      )}
    </button>
  );

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Mã thuốc
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              {renderSortButton("name", "Tên thuốc", "Sắp xếp theo tên thuốc")}
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
              Kho
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
              ĐVT
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
              Lô SX
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
              HSD
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
              Trạng thái
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
              {renderSortButton("stock", "Tồn kho", "Sắp xếp theo tồn kho")}
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right hidden sm:table-cell">
              Đơn giá
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right hidden sm:table-cell">
              {renderSortButton("value", "Giá trị", "Sắp xếp theo thành tiền")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
            >
              <td className="px-4 py-3">
                <div className="text-sm text-gray-600">{item.sku}</div>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {item.name}
                </div>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <span className="text-sm text-gray-600">{item.warehouse}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="text-xs text-gray-500">{item.unit}</div>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                <div className="text-sm text-gray-700">{item.batchNumber || "-"}</div>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                <div className="text-sm text-gray-700">
                  {item.expiryDate ? format(new Date(item.expiryDate), "dd/MM/yyyy") : "-"}
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                {renderStatusBadge(item)}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="font-medium text-gray-900">{item.currentStock}</div>
              </td>
              <td className="px-4 py-3 text-right hidden sm:table-cell">
                <span className="text-sm text-gray-600">
                  {formatCurrency(item.unitPrice || 0)}
                </span>
              </td>
              <td className="px-4 py-3 text-right hidden sm:table-cell">
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(item.currentStock * (item.unitPrice || 0))}
                </span>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                Không tìm thấy thuốc nào phù hợp.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
