/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { X } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { InventoryAnomaly, InventoryItem, ItemSnapshot } from "@/types/inventory";

const COPY = {
  divider: "\u2022",
  stock: "\u0054\u1ed3\u006e\u0020\u006b\u0068\u006f",
  value: "\u0047\u0069\u00e1\u0020\u0074\u0072\u1ecb",
  unitPrice: "\u0110\u01a1\u006e\u0020\u0067\u0069\u00e1",
  status: "\u0054\u0072\u1ea1\u006e\u0067\u0020\u0074\u0068\u00e1\u0069",
  stockTrend: "\u0042\u0069\u1ebf\u006e\u0020\u0111\u1ed9\u006e\u0067\u0020\u0074\u1ed3\u006e\u0020\u006b\u0068\u006f\u0020\u0028\u0033\u0030\u0020\u006e\u0067\u00e0\u0079\u0029",
  loading: "\u0110\u0061\u006e\u0067\u0020\u0074\u1ea3\u0069\u002e\u002e\u002e",
  stockTooltip: "\u0054\u1ed3\u006e\u0020\u006b\u0068\u006f",
  insufficientHistory:
    "\u0043\u0068\u01b0\u0061\u0020\u0063\u00f3\u0020\u0111\u1ee7\u0020\u0064\u1eef\u0020\u006c\u0069\u1ec7\u0075\u0020\u006c\u1ecb\u0063\u0068\u0020\u0073\u1eed\u0020\u0111\u1ec3\u0020\u0068\u0069\u1ec3\u006e\u0020\u0074\u0068\u1ecb\u0020\u0062\u0069\u1ec3\u0075\u0020\u0111\u1ed3\u002e",
  batchInfo: "\u0054\u0068\u00f4\u006e\u0067\u0020\u0074\u0069\u006e\u0020\u006c\u00f4",
  batch: "\u004c\u00f4\u0020\u0053\u0058\u003a",
  expiry: "\u0048\u0053\u0044\u003a",
  alerts: "\u0043\u1ea3\u006e\u0068\u0020\u0062\u00e1\u006f",
  acknowledgedSuffix: "\u0020\u2022\u0020\u0110\u00e3\u0020\u0078\u00e1\u0063\u0020\u006e\u0068\u1ead\u006e",
  importHistory: "\u004c\u1ecb\u0063\u0068\u0020\u0073\u1eed\u0020\u006e\u0068\u1ead\u0070\u0020\u006b\u0068\u006f",
  loadingHistory: "\u0110\u0061\u006e\u0067\u0020\u0074\u1ea3\u0069\u0020\u006c\u1ecb\u0063\u0068\u0020\u0073\u1eed\u002e\u002e\u002e",
  quantity: "\u0053\u004c\u0020\u006e\u0068\u1ead\u0070",
  batchShort: "\u004c\u00f4",
  noHistory: "\u004b\u0068\u00f4\u006e\u0067\u0020\u0063\u00f3\u0020\u0064\u1eef\u0020\u006c\u0069\u1ec7\u0075\u0020\u006c\u1ecb\u0063\u0068\u0020\u0073\u1eed\u0020\u006e\u0068\u1ead\u0070\u002e",
} as const;

export interface PharmacyImportHistoryEntry {
  id: string;
  import_date?: string | null;
  unit_price?: number | null;
  quantity?: number | null;
  batch_number?: string | null;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

export interface PharmacyDetailDrawerProps {
  item: InventoryItem;
  itemSnapshots: ItemSnapshot[];
  isLoadingItemSnapshots: boolean;
  anomalies: InventoryAnomaly[];
  importHistory: PharmacyImportHistoryEntry[];
  isFetchingHistory: boolean;
  onClose: () => void;
  renderStatusBadge: (item: InventoryItem) => ReactNode;
}

export function PharmacyDetailDrawer({
  item,
  itemSnapshots,
  isLoadingItemSnapshots,
  anomalies,
  importHistory,
  isFetchingHistory,
  onClose,
  renderStatusBadge,
}: PharmacyDetailDrawerProps) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{item.name}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
              <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-medium text-xs">
                {item.sku}
              </span>
              <span>{COPY.divider}</span>
              <span>{item.warehouse}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">{COPY.stock}</p>
              <p className="text-2xl font-bold text-gray-900">
                {item.currentStock}{" "}
                <span className="text-sm font-normal text-gray-500">{item.unit}</span>
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">{COPY.value}</p>
              <p className="text-lg font-bold text-emerald-600">
                {formatCurrency(item.currentStock * (item.unitPrice || 0))}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">{COPY.unitPrice}</p>
              <p className="text-lg font-semibold text-gray-700">
                {formatCurrency(item.unitPrice || 0)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">{COPY.status}</p>
              <div className="mt-1">{renderStatusBadge(item)}</div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">{COPY.stockTrend}</h3>
            <div className="h-44 bg-gray-50 rounded-xl p-3 border border-gray-100">
              {isLoadingItemSnapshots ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  {COPY.loading}
                </div>
              ) : itemSnapshots.length > 1 ? (
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={itemSnapshots}>
                    <defs>
                      <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      labelFormatter={(value) => {
                        try {
                          return format(parseISO(value as string), "dd/MM/yyyy");
                        } catch {
                          return value as string;
                        }
                      }}
                      formatter={(value: number) => [value, COPY.stockTooltip]}
                    />
                    <Area
                      type="monotone"
                      dataKey="stock"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#colorStock)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  {COPY.insufficientHistory}
                </div>
              )}
            </div>
          </div>

          {item.batchNumber || item.expiryDate ? (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-900">{COPY.batchInfo}</h3>
              <div className="grid grid-cols-2 gap-3">
                {item.batchNumber ? (
                  <div className="text-sm">
                    <span className="text-gray-500">{COPY.batch}</span>
                    <span className="ml-2 font-medium text-gray-900">{item.batchNumber}</span>
                  </div>
                ) : null}
                {item.expiryDate ? (
                  <div className="text-sm">
                    <span className="text-gray-500">{COPY.expiry}</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {format(new Date(item.expiryDate), "dd/MM/yyyy")}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {anomalies.length > 0 ? (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">{COPY.alerts}</h3>
              <div className="space-y-2">
                {anomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className="flex gap-3 p-3 rounded-xl border border-gray-100 bg-white"
                  >
                    <div
                      className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                        anomaly.acknowledged ? "bg-gray-300" : "bg-orange-500"
                      }`}
                    />
                    <div className="flex-1">
                      <p
                        className={`text-sm ${
                          anomaly.acknowledged ? "text-gray-600" : "text-gray-900 font-medium"
                        }`}
                      >
                        {anomaly.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(parseISO(anomaly.detectedAt), "HH:mm dd/MM/yyyy")}
                        {anomaly.acknowledged ? COPY.acknowledgedSuffix : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {item.medicineCode ? (
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h3 className="font-semibold text-gray-900">{COPY.importHistory}</h3>
              {isFetchingHistory ? (
                <div className="text-sm text-gray-500 text-center py-4">{COPY.loadingHistory}</div>
              ) : importHistory.length > 0 ? (
                <div className="space-y-2">
                  {importHistory.map((historyEntry) => (
                    <div
                      key={historyEntry.id}
                      className="bg-white border text-sm border-gray-100 rounded-xl p-3 shadow-sm relative overflow-hidden group"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-gray-900">
                          {historyEntry.import_date
                            ? format(new Date(historyEntry.import_date), "dd/MM/yyyy")
                            : "N/A"}
                        </div>
                        <div className="font-semibold text-emerald-600">
                          {formatCurrency(historyEntry.unit_price || 0)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div>
                          <span className="text-gray-400">{COPY.quantity}</span>
                          <span className="ml-1 font-medium text-gray-700">
                            {historyEntry.quantity || 0} {item.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">{COPY.batchShort}</span>
                          <span className="ml-1 font-medium text-gray-700">
                            {historyEntry.batch_number || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  {COPY.noHistory}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
