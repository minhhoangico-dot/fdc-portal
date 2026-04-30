/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertTriangle, Clock, DollarSign, Package } from "lucide-react";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

export interface PharmacyKpiGridProps {
  stats: {
    totalItems: number;
    activeAnomaliesCount: number;
    nearExpiryCount: number;
    estimatedValue: number;
  };
  onShowAllItems: () => void;
  onShowAnomalies: () => void;
  onShowNearExpiry: () => void;
  onShowValuation: () => void;
}

export function PharmacyKpiGrid({
  stats,
  onShowAllItems,
  onShowAnomalies,
  onShowNearExpiry,
  onShowValuation,
}: PharmacyKpiGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <button
        type="button"
        onClick={onShowAllItems}
        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-indigo-200 transition-colors text-left"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Package className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-500">Tá»•ng mÃ£ thuá»‘c</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
      </button>

      <button
        type="button"
        onClick={onShowAnomalies}
        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-rose-200 transition-colors text-left"
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              stats.activeAnomaliesCount > 0
                ? "bg-rose-50 text-rose-600"
                : "bg-emerald-50 text-emerald-600"
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-500">Báº¥t thÆ°á»ng</span>
        </div>
        <p
          className={`text-2xl font-bold ${
            stats.activeAnomaliesCount > 0 ? "text-rose-600" : "text-emerald-600"
          }`}
        >
          {stats.activeAnomaliesCount}
        </p>
      </button>

      <button
        type="button"
        onClick={onShowNearExpiry}
        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-amber-200 transition-colors text-left"
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              stats.nearExpiryCount > 0
                ? "bg-amber-50 text-amber-600"
                : "bg-emerald-50 text-emerald-600"
            }`}
          >
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-500">Sáº¯p háº¿t háº¡n</span>
        </div>
        <p
          className={`text-2xl font-bold ${
            stats.nearExpiryCount > 0 ? "text-amber-600" : "text-emerald-600"
          }`}
        >
          {stats.nearExpiryCount}
        </p>
      </button>

      <button
        type="button"
        onClick={onShowValuation}
        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors text-left"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-500">GiÃ¡ trá»‹ tá»“n kho</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {formatCurrency(stats.estimatedValue)}
        </p>
      </button>
    </div>
  );
}
