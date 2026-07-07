/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Activity, DollarSign, Package } from "lucide-react";

import { InventoryAlertsPanel } from "@/app/inventory/overview/InventoryAlertsPanel";

const COPY = {
  totalItems: "\u0054\u1ed5\u006e\u0067\u0020\u006c\u006f\u1ea1\u0069\u0020\u0076\u1ead\u0074\u0020\u0074\u01b0",
  inventoryValue: "\u0047\u0069\u00e1\u0020\u0074\u0072\u1ecb\u0020\u0074\u1ed3\u006e\u0020\u006b\u0068\u006f",
  costPerVisit: "\u0043\u0068\u0069\u0020\u0070\u0068\u00ed\u0020\u002f\u0020\u006c\u01b0\u1ee3\u0074\u0020\u006b\u0068\u00e1\u006d",
} as const;

export type InventoryKpiKind =
  | "total-items"
  | "alerts"
  | "inventory-value"
  | "cost-per-visit";

const formatCompact = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toString();
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

export interface InventoryKpiGridProps {
  stats: { totalItems: number; activeAnomaliesCount: number; estimatedValue: number };
  avgPerVisit: number;
  onOpenKpiDetail: (kind: InventoryKpiKind) => void;
}

export function InventoryKpiGrid({
  stats,
  avgPerVisit,
  onOpenKpiDetail,
}: InventoryKpiGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <button
        type="button"
        onClick={() => onOpenKpiDetail("total-items")}
        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-left transition-colors hover:border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-600">
            <Package className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-500">{COPY.totalItems}</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
      </button>

      <InventoryAlertsPanel
        count={stats.activeAnomaliesCount}
        onOpen={() => onOpenKpiDetail("alerts")}
      />

      <button
        type="button"
        onClick={() => onOpenKpiDetail("inventory-value")}
        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-left transition-colors hover:border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-500">{COPY.inventoryValue}</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {formatCompact(stats.estimatedValue)}
        </p>
      </button>

      <button
        type="button"
        onClick={() => onOpenKpiDetail("cost-per-visit")}
        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-left transition-colors hover:border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-600">
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-500">{COPY.costPerVisit}</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {avgPerVisit > 0 ? formatCurrency(avgPerVisit) : "-"}
        </p>
      </button>
    </div>
  );
}
