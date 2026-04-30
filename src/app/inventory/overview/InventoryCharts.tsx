/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  SnapshotHistory,
  SupplyAccountFilter,
  SupplyChartPoint,
  SupplyTimeRange,
  TopMaterial,
} from "@/types/inventory";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const formatCompact = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tá»·`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toString();
};

const ACCOUNT_LABELS: Record<SupplyAccountFilter, string> = {
  all: "Táº¥t cáº£ TK 152",
  "1521": "NguyÃªn váº­t liá»‡u",
  "1522": "Váº­t tÆ° y táº¿",
  "1523": "VÄƒn phÃ²ng pháº©m",
};

const openWithKeyboard =
  (open: () => void) => (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  };

export interface InventoryChartsProps {
  timeRange: SupplyTimeRange;
  onTimeRangeChange: (range: SupplyTimeRange) => void;
  accountFilter: SupplyAccountFilter;
  onAccountFilterChange: (filter: SupplyAccountFilter) => void;
  chartData: SupplyChartPoint[];
  isLoadingSupplyChart: boolean;
  rangeLabels: Record<SupplyTimeRange, string>;
  snapshotHistory: SnapshotHistory[];
  isRefreshingSnapshotHistory: boolean;
  isInitialSnapshotHistoryLoad: boolean;
  topMaterials: TopMaterial[];
  yoyChange: number;
  onOpenConsumptionDetail: () => void;
  onOpenCostPerVisitDetail: () => void;
  onOpenInventoryTrendDetail: () => void;
  onOpenTopMaterialsDetail: () => void;
}

export function InventoryCharts({
  timeRange,
  onTimeRangeChange,
  accountFilter,
  onAccountFilterChange,
  chartData,
  isLoadingSupplyChart,
  rangeLabels,
  snapshotHistory,
  isRefreshingSnapshotHistory,
  isInitialSnapshotHistoryLoad,
  topMaterials,
  yoyChange,
  onOpenConsumptionDetail,
  onOpenCostPerVisitDetail,
  onOpenInventoryTrendDetail,
  onOpenTopMaterialsDetail,
}: InventoryChartsProps) {
  return (
    <>
      <div
        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-gray-200"
        onClick={onOpenConsumptionDetail}
        role="button"
        tabIndex={0}
        onKeyDown={openWithKeyboard(onOpenConsumptionDetail)}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-base font-bold text-gray-900">Tieu hao vat tu & Luot kham benh</h3>
          <div className="flex gap-1.5 flex-wrap">
            {(["1Y"] as SupplyTimeRange[]).map((range) => (
              <button
                key={range}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onTimeRangeChange(range);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  timeRange === range
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {rangeLabels[range]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap mb-4">
          {(["all", "1521", "1522", "1523"] as const).map((account) => (
            <button
              key={account}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onAccountFilterChange(account);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                accountFilter === account
                  ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {ACCOUNT_LABELS[account]}
            </button>
          ))}
        </div>
        <div className="h-80">
          {isLoadingSupplyChart ? (
            <div className="w-full h-full rounded-xl bg-gray-50 animate-pulse" />
          ) : chartData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
              Chua co du lieu tieu hao cho khoang thoi gian nay.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="period"
                  tickFormatter={(value) => {
                    if (!value) return value;
                    const parts = String(value).split("-");
                    if (parts.length >= 3) return `${parts[2]}/${parts[1]}`;
                    return parts.length >= 2 ? `${parts[1]}/${parts[0].slice(2)}` : value;
                  }}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                />
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={formatCompact}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={(value) => value.toLocaleString("vi-VN")}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "Luot kham") return [value.toLocaleString("vi-VN"), name];
                    return [formatCurrency(value), name];
                  }}
                  labelFormatter={(value) => {
                    if (!value) return value;
                    const parts = String(value).split("-");
                    if (parts.length >= 3) return format(parseISO(String(value)), "dd/MM/yyyy");
                    return parts.length >= 2 ? `Thang ${parts[1]}/${parts[0]}` : value;
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="right"
                  dataKey="patientVolume"
                  name="Luot kham"
                  fill="#10b981"
                  opacity={0.35}
                  radius={[4, 4, 0, 0]}
                  barSize={28}
                  isAnimationActive={false}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="consumption"
                  name="Tieu hao ky nay"
                  stroke="#6366f1"
                  fill="url(#colorConsumption)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="consumptionLY"
                  name="Cung ky nam truoc"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div
        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-gray-200"
        onClick={onOpenCostPerVisitDetail}
        role="button"
        tabIndex={0}
        onKeyDown={openWithKeyboard(onOpenCostPerVisitDetail)}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900">Chi phi tieu hao / luot kham</h3>
          <span
            className={`text-xs font-medium ${
              yoyChange >= 0 ? "text-rose-500" : "text-emerald-600"
            }`}
          >
            {Number.isFinite(yoyChange)
              ? `${yoyChange >= 0 ? "+" : ""}${yoyChange.toFixed(1)}% vs cung ky`
              : "-"}
          </span>
        </div>
        <div className="h-56">
          {isLoadingSupplyChart ? (
            <div className="w-full h-full rounded-xl bg-gray-50 animate-pulse" />
          ) : chartData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
              Chua co du lieu tieu hao cho khoang thoi gian nay.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPerVisit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="period"
                  tickFormatter={(value) => {
                    if (!value) return value;
                    const parts = String(value).split("-");
                    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
                    return parts.length >= 2 ? `${parts[1]}/${parts[0].slice(2)}` : value;
                  }}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={(value) => formatCompact(value as number)}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number) => [formatCurrency(value), "Chi phi / luot"]}
                  labelFormatter={(value) => String(value)}
                />
                <Area
                  type="monotone"
                  dataKey="consumptionPerVisit"
                  name="Chi phi / luot"
                  stroke="#22c55e"
                  fill="url(#colorPerVisit)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-gray-200"
          onClick={onOpenInventoryTrendDetail}
          role="button"
          tabIndex={0}
          onKeyDown={openWithKeyboard(onOpenInventoryTrendDetail)}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-gray-900">Gia tri ton kho (1 nam)</h3>
            {isRefreshingSnapshotHistory ? (
              <span className="text-[11px] font-medium text-gray-400">Dang cap nhat...</span>
            ) : null}
          </div>
          <div className="h-72">
            {isInitialSnapshotHistoryLoad ? (
              <div className="w-full h-full rounded-xl bg-gray-50 animate-pulse" />
            ) : snapshotHistory.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                Chua co du lieu trong 1 nam gan nhat.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={288}>
                <AreaChart
                  data={snapshotHistory}
                  margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      try {
                        return format(parseISO(value), "dd/MM");
                      } catch {
                        return value;
                      }
                    }}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickFormatter={formatCompact}
                    domain={["dataMin * 0.95", "dataMax * 1.05"]}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Gia tri"]}
                    labelFormatter={(value) => format(parseISO(value as string), "dd/MM/yyyy")}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalValue"
                    stroke="#6366f1"
                    fill="url(#colorValue)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-gray-200"
          onClick={onOpenTopMaterialsDetail}
          role="button"
          tabIndex={0}
          onKeyDown={openWithKeyboard(onOpenTopMaterialsDetail)}
        >
          <h3 className="text-base font-bold text-gray-900 mb-4">Top 10 gia tri ton kho</h3>
          <div className="h-72">
            {topMaterials.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                Chua co du lieu vat tu gia tri cao.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={288}>
                <BarChart
                  data={topMaterials}
                  layout="vertical"
                  margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickFormatter={formatCompact}
                  />
                  <YAxis
                    type="category"
                    dataKey="chartLabel"
                    width={180}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#374151" }}
                  />
                  <Tooltip
                    cursor={{ fill: "#f3f4f6" }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Gia tri"]}
                  />
                  <Bar
                    dataKey="value"
                    fill="#6366f1"
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
