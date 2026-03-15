import React from "react";
import { useImportExport } from "@/viewmodels/useImportExport";
import { format, parseISO } from "date-fns";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Info } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const formatCompact = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toString();
};

export default function ImportExportTab() {
  const {
    isLoading,
    hasInwardData,
    accountFilter,
    setAccountFilter,
    timeRange,
    setTimeRange,
    summary,
    dailyTrend,
    topItems,
    ACCOUNT_LABELS,
    TIME_RANGE_LABELS,
  } = useImportExport();

  const accounts: Array<"all" | "1521" | "1522" | "1523"> = ["all", "1521", "1522", "1523"];
  const timeRanges: Array<"30" | "90" | "365"> = ["30", "90", "365"];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {accounts.map((acct) => (
            <button
              key={acct}
              onClick={() => setAccountFilter(acct)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                accountFilter === acct
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"
              }`}
            >
              {acct === "all" ? "Tất cả" : ACCOUNT_LABELS[acct]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                timeRange === range
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {TIME_RANGE_LABELS[range]}
            </button>
          ))}
        </div>
      </div>

      {/* Info banner when inward data missing */}
      {!hasInwardData && !isLoading && (
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl text-sm">
          <Info className="w-4 h-4 flex-shrink-0" />
          Dữ liệu nhập kho chưa được đồng bộ. Chỉ hiển thị dữ liệu xuất kho.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <p className="text-sm text-gray-500">Tổng nhập</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCompact(summary.totalInwardAmt)}</p>
          <p className="text-xs text-gray-400 mt-1">{summary.totalInwardQty.toLocaleString("vi-VN")} đơn vị</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <p className="text-sm text-gray-500">Tổng xuất</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCompact(summary.totalOutwardAmt)}</p>
          <p className="text-xs text-gray-400 mt-1">{summary.totalOutwardQty.toLocaleString("vi-VN")} đơn vị</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${summary.netValue >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
            <p className="text-sm text-gray-500">Chênh lệch</p>
          </div>
          <p className={`text-xl font-bold ${summary.netValue >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {summary.netValue >= 0 ? "+" : ""}{formatCompact(summary.netValue)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Nhập − Xuất</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <p className="text-sm text-gray-500">Tỷ lệ xuất/nhập</p>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {summary.ratio > 0 ? `${summary.ratio.toFixed(0)}%` : "—"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {summary.ratio > 100 ? "Xuất nhiều hơn nhập" : summary.ratio > 0 ? "Nhập nhiều hơn xuất" : ""}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Trend chart */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-4">Xu hướng nhập xuất</h3>
          <div className="h-72">
            {isLoading ? (
              <div className="w-full h-full rounded-xl bg-gray-50 animate-pulse" />
            ) : dailyTrend.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                Chưa có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={288}>
                <AreaChart data={dailyTrend} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInward" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOutward" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => {
                      try { return format(parseISO(v), "dd/MM"); }
                      catch { return v; }
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
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    labelFormatter={(v) => {
                      try { return format(parseISO(v as string), "dd/MM/yyyy"); }
                      catch { return v as string; }
                    }}
                    formatter={(value: number, name: string) => [formatCurrency(Number(value || 0)), name]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="inwardAmt"
                    name="Nhập kho"
                    stroke="#10b981"
                    fill="url(#colorInward)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="outwardAmt"
                    name="Xuất kho"
                    stroke="#f59e0b"
                    fill="url(#colorOutward)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Top items bar chart */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-4">Top 10 vật tư biến động</h3>
          <div className="h-72">
            {isLoading ? (
              <div className="w-full h-full rounded-xl bg-gray-50 animate-pulse" />
            ) : topItems.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                Chưa có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={288}>
                <BarChart
                  data={topItems.slice(0, 10)}
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
                    dataKey="itemName"
                    width={140}
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
                    formatter={(value: number, name: string) => [formatCurrency(Number(value || 0)), name]}
                  />
                  <Legend />
                  <Bar
                    dataKey="inwardAmt"
                    name="Nhập"
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                    barSize={10}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="outwardAmt"
                    name="Xuất"
                    fill="#f59e0b"
                    radius={[0, 4, 4, 0]}
                    barSize={10}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Chi tiết nhập xuất theo vật tư</h3>
        </div>
        <div className="overflow-auto max-h-96">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Vật tư</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Nhập SL</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Nhập GT</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Xuất SL</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Xuất GT</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Chênh lệch</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Tỷ lệ X/N</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topItems.map((item) => {
                const net = item.inwardAmt - item.outwardAmt;
                const ratio = item.inwardAmt > 0 ? (item.outwardAmt / item.inwardAmt) * 100 : null;

                return (
                  <tr key={item.itemCode} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{item.itemName}</td>
                    <td className="px-4 py-2 text-sm text-right font-medium text-emerald-600">
                      {item.inwardQty > 0 ? item.inwardQty.toLocaleString("vi-VN") : "—"}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-emerald-600">
                      {item.inwardAmt > 0 ? formatCompact(item.inwardAmt) : "—"}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-medium text-amber-600">
                      {item.outwardQty > 0 ? item.outwardQty.toLocaleString("vi-VN") : "—"}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-amber-600">
                      {item.outwardAmt > 0 ? formatCompact(item.outwardAmt) : "—"}
                    </td>
                    <td className={`px-4 py-2 text-sm text-right font-medium ${net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {item.inwardAmt > 0 || item.outwardAmt > 0
                        ? `${net >= 0 ? "+" : ""}${formatCompact(net)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-sm text-right">
                      {ratio !== null ? (
                        <span className={ratio > 100 ? "text-rose-600 font-bold" : "text-gray-700"}>
                          {ratio.toFixed(0)}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
              {topItems.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Chưa có dữ liệu nhập xuất
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
