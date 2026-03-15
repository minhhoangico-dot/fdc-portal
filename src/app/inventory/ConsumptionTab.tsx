import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { SupplyConsumption } from "@/types/inventory";
import { format, parseISO } from "date-fns";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";

const CONSUMPTION_LOOKBACK_DAYS = 365;
const PAGE_SIZE = 1000;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const formatCompact = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toString();
};

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const ACCOUNT_LABELS: Record<string, string> = {
  "1521": "Nguyên vật liệu",
  "1522": "Vật tư y tế",
  "1523": "Văn phòng phẩm",
};

export default function ConsumptionTab() {
  const [consumptionData, setConsumptionData] = useState<SupplyConsumption[]>([]);
  const [consumptionLoading, setConsumptionLoading] = useState(false);
  const hasLoadedConsumption = useRef(false);
  const [accountFilter, setAccountFilter] = useState("all");

  const fetchConsumption = useCallback(async () => {
    if (!hasLoadedConsumption.current) setConsumptionLoading(true);

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CONSUMPTION_LOOKBACK_DAYS);
      const cutoff = formatLocalDate(cutoffDate);

      let allRows: SupplyConsumption[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("fdc_supply_consumption_daily")
          .select("*")
          .gte("report_date", cutoff)
          .order("report_date", { ascending: false })
          .order("account", { ascending: true })
          .order("item_code", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (error) {
          console.error("[ConsumptionTab] fetchConsumption error:", error);
          setConsumptionData([]);
          return;
        }

        const batch = (data || []) as SupplyConsumption[];
        allRows = [...allRows, ...batch];
        from += PAGE_SIZE;
        hasMore = batch.length === PAGE_SIZE;
      }

      setConsumptionData(allRows);
      hasLoadedConsumption.current = true;
    } finally {
      setConsumptionLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConsumption();
  }, [fetchConsumption]);

  const consumptionByDate = useMemo(() => {
    const filtered =
      accountFilter === "all"
        ? consumptionData
        : consumptionData.filter((item) => item.account === accountFilter);
    const byDate: Record<
      string,
      { date: string; totalQty: number; totalAmt: number; visits: number }
    > = {};

    filtered.forEach((item) => {
      if (!byDate[item.report_date]) {
        byDate[item.report_date] = {
          date: item.report_date,
          totalQty: 0,
          totalAmt: 0,
          visits: item.patient_visits || 0,
        };
      }

      byDate[item.report_date].totalQty += Number(item.outward_qty) || 0;
      byDate[item.report_date].totalAmt += Number(item.outward_amount) || 0;

      if (!byDate[item.report_date].visits && item.patient_visits) {
        byDate[item.report_date].visits = item.patient_visits;
      }
    });

    return Object.values(byDate).sort((left, right) => left.date.localeCompare(right.date));
  }, [consumptionData, accountFilter]);

  const topConsumers = useMemo(() => {
    const filtered =
      accountFilter === "all"
        ? consumptionData
        : consumptionData.filter((item) => item.account === accountFilter);
    const byItem: Record<string, { name: string; totalQty: number; totalAmt: number }> = {};

    filtered.forEach((item) => {
      if (!byItem[item.item_code]) {
        byItem[item.item_code] = {
          name: item.item_name,
          totalQty: 0,
          totalAmt: 0,
        };
      }

      byItem[item.item_code].totalQty += Number(item.outward_qty) || 0;
      byItem[item.item_code].totalAmt += Number(item.outward_amount) || 0;
    });

    return Object.values(byItem)
      .sort((left, right) => right.totalQty - left.totalQty)
      .slice(0, 10);
  }, [consumptionData, accountFilter]);

  const filteredRows = useMemo(() => {
    return accountFilter === "all"
      ? consumptionData
      : consumptionData.filter((item) => item.account === accountFilter);
  }, [consumptionData, accountFilter]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {["all", "1521", "1522", "1523"].map((account) => (
          <button
            key={account}
            onClick={() => setAccountFilter(account)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              accountFilter === account
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"
            }`}
          >
            {account === "all" ? "Tất cả" : ACCOUNT_LABELS[account]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-4">
            Xu hướng tiêu thụ vs Lượt khám
          </h3>
          <div className="h-72">
            {consumptionLoading ? (
              <div className="w-full h-full rounded-xl bg-gray-50 animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={288}>
                <AreaChart
                  data={consumptionByDate}
                  margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    labelFormatter={(value) => format(parseISO(value as string), "dd/MM/yyyy")}
                    formatter={(value: number, name: string) => {
                      if (name === "Lượt khám") {
                        return [Number(value || 0).toLocaleString("vi-VN"), name];
                      }

                      return [formatCurrency(Number(value || 0)), name];
                    }}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="totalAmt"
                    name="Giá trị xuất kho"
                    stroke="#f59e0b"
                    fill="url(#colorQty)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="visits"
                    name="Lượt khám"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-4">Top 10 vật tư tiêu thụ</h3>
          <div className="h-72">
            {consumptionLoading ? (
              <div className="w-full h-full rounded-xl bg-gray-50 animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={288}>
                <BarChart
                  data={topConsumers}
                  layout="vertical"
                  margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
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
                  />
                  <Bar
                    dataKey="totalQty"
                    name="Số lượng"
                    fill="#f59e0b"
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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Chi tiết tiêu thụ theo ngày</h3>
        </div>
        <div className="overflow-auto max-h-96">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ngày</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Vật tư</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nhóm TK</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                  SL xuất
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                  Giá trị
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                  Lượt khám
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                  SL/lượt
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.slice(0, 50).map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-700">{item.report_date}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.item_name}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {ACCOUNT_LABELS[item.account] || item.account}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                    {item.outward_qty}
                  </td>
                  <td className="px-4 py-2 text-sm text-right text-gray-600">
                    {formatCompact(item.outward_amount)}
                  </td>
                  <td className="px-4 py-2 text-sm text-right text-gray-600">
                    {item.patient_visits || "-"}
                  </td>
                  <td className="px-4 py-2 text-sm text-right">
                    {item.qty_per_visit != null ? (
                      <span
                        className={item.qty_per_visit > 2 ? "text-rose-600 font-bold" : "text-gray-700"}
                      >
                        {item.qty_per_visit.toFixed(2)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
