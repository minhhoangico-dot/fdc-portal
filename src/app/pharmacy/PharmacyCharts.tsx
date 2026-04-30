/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SnapshotHistory, TopMaterial } from "@/types/inventory";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

const formatCompact = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tá»·`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toString();
};

export interface PharmacyChartsProps {
  snapshotHistory: SnapshotHistory[];
  topMaterials: TopMaterial[];
}

export function PharmacyCharts({ snapshotHistory, topMaterials }: PharmacyChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4">
          Biáº¿n Ä‘á»™ng giÃ¡ trá»‹ tá»“n kho (1 nÄƒm)
        </h3>
        <div className="h-72">
          {snapshotHistory.length > 0 ? (
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
                  dy={10}
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
                  labelFormatter={(value) => {
                    try {
                      return format(parseISO(value as string), "dd/MM/yyyy");
                    } catch {
                      return value as string;
                    }
                  }}
                  formatter={(value: number) => [formatCurrency(value), "GiÃ¡ trá»‹ tá»“n"]}
                />
                <Area
                  type="monotone"
                  dataKey="totalValue"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#colorValue)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              ChÆ°a cÃ³ dá»¯ liá»‡u trong 1 nÄƒm gáº§n nháº¥t. Há»‡ thá»‘ng sáº½ báº¯t Ä‘áº§u thu tháº­p sau 1-2 ngÃ y.
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4">
          Top 10 thuá»‘c giÃ¡ trá»‹ tá»“n cao nháº¥t
        </h3>
        <div className="h-72">
          {topMaterials.length > 0 ? (
            <ResponsiveContainer width="100%" height={288}>
              <BarChart
                data={topMaterials}
                layout="vertical"
                margin={{ top: 5, right: 5, left: 10, bottom: 0 }}
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
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#374151" }}
                  width={120}
                />
                <Tooltip
                  cursor={{ fill: "#f3f4f6" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number) => [formatCurrency(value), "GiÃ¡ trá»‹"]}
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
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              KhÃ´ng cÃ³ dá»¯ liá»‡u.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export interface PharmacyListValueChartProps {
  data: SnapshotHistory[];
  hasFilters: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
}

export function PharmacyListValueChart({
  data,
  hasFilters,
  isLoading,
  isRefreshing,
}: PharmacyListValueChartProps) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-gray-400">
          Biáº¿n Ä‘á»™ng giÃ¡ trá»‹ tá»“n kho ({hasFilters ? "theo bá»™ lá»c" : "1 nÄƒm â€” toÃ n kho"})
        </p>
        {isRefreshing ? (
          <span className="text-[11px] font-medium text-gray-400">Äang cáº­p nháº­t...</span>
        ) : null}
      </div>
      <div className="h-32">
        {isLoading ? (
          <div className="w-full h-full rounded-lg bg-gray-50 animate-pulse" />
        ) : data.length > 1 ? (
          <ResponsiveContainer width="100%" height={128}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValueList" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  try {
                    return format(parseISO(value), hasFilters ? "dd/MM" : "MM/yy");
                  } catch {
                    return value;
                  }
                }}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickFormatter={formatCompact}
                domain={["dataMin * 0.95", "dataMax * 1.05"]}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  fontSize: 12,
                }}
                labelFormatter={(value) => {
                  try {
                    return format(parseISO(value as string), "dd/MM/yyyy");
                  } catch {
                    return value as string;
                  }
                }}
                formatter={(value: number) => [formatCurrency(value), "GiÃ¡ trá»‹ tá»“n"]}
              />
              <Area
                type="monotone"
                dataKey="totalValue"
                stroke="#6366f1"
                strokeWidth={1.5}
                fill="url(#colorValueList)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
            ChÆ°a cÃ³ dá»¯ liá»‡u lá»‹ch sá»­.
          </div>
        )}
      </div>
    </div>
  );
}
