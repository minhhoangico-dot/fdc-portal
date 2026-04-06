/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { format, parseISO } from "date-fns";
import {
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
  ComposedChart,
  Line,
} from "recharts";
import { Package, AlertTriangle, DollarSign, Activity } from "lucide-react";

import {
  buildSupplyInventoryKpiDetail,
  getDefaultSupplyInventoryKpiModalState,
  type SupplyInventoryKpiModalState,
} from "@/lib/supplyInventoryKpiDetails";
import { useSupplyChart } from "@/viewmodels/useSupplyChart";
import type {
  InventoryAnomaly,
  InventoryItem,
  SnapshotHistory,
  SupplyAccountFilter,
  SupplyTimeRange,
  TopMaterial,
} from "@/types/inventory";

import ChartDetailModal from "./ChartDetailModal";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const formatCompact = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toString();
};

const ACCOUNT_LABELS: Record<SupplyAccountFilter, string> = {
  all: "Tất cả TK 152",
  "1521": "Nguyên vật liệu",
  "1522": "Vật tư y tế",
  "1523": "Văn phòng phẩm",
};

interface OverviewTabProps {
  stats: { totalItems: number; activeAnomaliesCount: number; estimatedValue: number };
  inventory: InventoryItem[];
  anomalies: InventoryAnomaly[];
  snapshotHistory: SnapshotHistory[];
  isLoadingSnapshotHistory: boolean;
  topMaterials: TopMaterial[];
}

type DetailModalState = {
  title: string;
  dataSource: string;
  dataNote?: string;
  summaryRows?: Array<{
    label: string;
    value: string;
    tone?: "default" | "positive" | "warning" | "danger";
  }>;
  columns: (string)[];
  rows: (string | number | null | undefined)[][];
};

type KpiCardTone = "indigo" | "rose" | "emerald";

const KPI_COLOR_CLASSES: Record<KpiCardTone, string> = {
  indigo: "bg-indigo-50 text-indigo-600",
  rose: "bg-rose-50 text-rose-600",
  emerald: "bg-emerald-50 text-emerald-600",
};

const STATIC_DETAIL_SOURCE = {
  inventoryTrend: "MISA",
  inventoryValueTop: "MISA",
  consumption: "MISA + HIS",
  costPerVisit: "MISA + HIS",
} as const;

export default function OverviewTab({
  stats,
  inventory,
  anomalies,
  snapshotHistory,
  isLoadingSnapshotHistory,
  topMaterials,
}: OverviewTabProps) {
  const {
    timeRange,
    setTimeRange,
    accountFilter,
    setAccountFilter,
    chartData,
    monthlyData,
    dailyData,
    isLoading: isLoadingSupplyChart,
    RANGE_LABELS,
  } = useSupplyChart();

  const [detailModal, setDetailModal] = React.useState<DetailModalState | null>(null);
  const [kpiModalState, setKpiModalState] = React.useState<SupplyInventoryKpiModalState | null>(null);

  const inventoryCategories = React.useMemo(() => {
    return Array.from(new Set(inventory.map((item) => item.category))).sort((left, right) =>
      left.localeCompare(right, "vi"),
    );
  }, [inventory]);

  const inventoryWarehouses = React.useMemo(() => {
    return Array.from(new Set(inventory.map((item) => item.warehouse))).sort((left, right) =>
      left.localeCompare(right, "vi"),
    );
  }, [inventory]);

  const latestPoint = chartData[chartData.length - 1];
  const totalConsumption = chartData.reduce((sum, point) => sum + point.consumption, 0);
  const totalPatients = chartData.reduce((sum, point) => sum + (point.patientVolume || 0), 0);
  const avgPerVisit = totalPatients > 0 ? totalConsumption / totalPatients : 0;
  const firstPoint = chartData[0];
  const yoyChange =
    latestPoint && firstPoint && latestPoint.consumptionLY > 0
      ? ((latestPoint.consumption - latestPoint.consumptionLY) / latestPoint.consumptionLY) * 100
      : 0;
  const isInitialSnapshotHistoryLoad =
    isLoadingSnapshotHistory && snapshotHistory.length === 0;
  const isRefreshingSnapshotHistory =
    isLoadingSnapshotHistory && snapshotHistory.length > 0;

  const activeKpiModal = React.useMemo(() => {
    if (!kpiModalState) return null;

    return buildSupplyInventoryKpiDetail(kpiModalState, {
      inventory,
      anomalies,
      monthlyData,
      dailyData,
    });
  }, [anomalies, dailyData, inventory, kpiModalState, monthlyData]);

  const activeModal = activeKpiModal ?? detailModal;

  const closeModal = React.useCallback(() => {
    setDetailModal(null);
    setKpiModalState(null);
  }, []);

  const openChartDetail = React.useCallback((modal: DetailModalState) => {
    setKpiModalState(null);
    setDetailModal(modal);
  }, []);

  const openKpiDetail = React.useCallback(
    (kind: SupplyInventoryKpiModalState["kind"]) => {
      setDetailModal(null);

      if (kind === "cost-per-visit") {
        setKpiModalState(
          getDefaultSupplyInventoryKpiModalState(kind, {
            timeRange,
            accountFilter,
          }),
        );
        return;
      }

      setKpiModalState(getDefaultSupplyInventoryKpiModalState(kind));
    },
    [accountFilter, timeRange],
  );

  const modalFilters = React.useMemo(() => {
    if (!kpiModalState) return null;

    if (kpiModalState.kind === "total-items") {
      return (
        <div className="flex flex-wrap gap-2">
          <select
            value={kpiModalState.filters.category}
            onChange={(event) =>
              setKpiModalState((previous) =>
                previous?.kind === "total-items"
                  ? {
                      ...previous,
                      filters: { ...previous.filters, category: event.target.value },
                    }
                  : previous,
              )
            }
            className="text-sm rounded-lg border-gray-200 py-2 pl-3 pr-8 focus:ring-indigo-500"
          >
            <option value="all">Tất cả loại</option>
            {inventoryCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            value={kpiModalState.filters.status}
            onChange={(event) =>
              setKpiModalState((previous) =>
                previous?.kind === "total-items"
                  ? {
                      ...previous,
                      filters: {
                        ...previous.filters,
                        status: event.target.value as typeof previous.filters.status,
                      },
                    }
                  : previous,
              )
            }
            className="text-sm rounded-lg border-gray-200 py-2 pl-3 pr-8 focus:ring-indigo-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="in_stock">Bình thường</option>
            <option value="low_stock">Sắp hết</option>
            <option value="out_of_stock">Hết hàng</option>
          </select>
        </div>
      );
    }

    if (kpiModalState.kind === "alerts") {
      return (
        <div className="flex flex-wrap gap-2">
          <select
            value={kpiModalState.filters.severity}
            onChange={(event) =>
              setKpiModalState((previous) =>
                previous?.kind === "alerts"
                  ? {
                      ...previous,
                      filters: {
                        ...previous.filters,
                        severity: event.target.value as typeof previous.filters.severity,
                      },
                    }
                  : previous,
              )
            }
            className="text-sm rounded-lg border-gray-200 py-2 pl-3 pr-8 focus:ring-indigo-500"
          >
            <option value="all">Tất cả mức độ</option>
            <option value="critical">Nghiêm trọng</option>
            <option value="high">Cao</option>
            <option value="medium">Trung bình</option>
            <option value="low">Thấp</option>
          </select>
          <select
            value={kpiModalState.filters.visibility}
            onChange={(event) =>
              setKpiModalState((previous) =>
                previous?.kind === "alerts"
                  ? {
                      ...previous,
                      filters: {
                        ...previous.filters,
                        visibility: event.target.value as typeof previous.filters.visibility,
                      },
                    }
                  : previous,
              )
            }
            className="text-sm rounded-lg border-gray-200 py-2 pl-3 pr-8 focus:ring-indigo-500"
          >
            <option value="active">Chỉ đang hoạt động</option>
            <option value="all">Tất cả</option>
          </select>
        </div>
      );
    }

    if (kpiModalState.kind === "inventory-value") {
      return (
        <div className="flex flex-wrap gap-2">
          <select
            value={kpiModalState.filters.warehouse}
            onChange={(event) =>
              setKpiModalState((previous) =>
                previous?.kind === "inventory-value"
                  ? {
                      ...previous,
                      filters: { ...previous.filters, warehouse: event.target.value },
                    }
                  : previous,
              )
            }
            className="text-sm rounded-lg border-gray-200 py-2 pl-3 pr-8 focus:ring-indigo-500"
          >
            <option value="all">Tất cả kho</option>
            {inventoryWarehouses.map((warehouse) => (
              <option key={warehouse} value={warehouse}>
                {warehouse}
              </option>
            ))}
          </select>
          <select
            value={kpiModalState.filters.category}
            onChange={(event) =>
              setKpiModalState((previous) =>
                previous?.kind === "inventory-value"
                  ? {
                      ...previous,
                      filters: { ...previous.filters, category: event.target.value },
                    }
                  : previous,
              )
            }
            className="text-sm rounded-lg border-gray-200 py-2 pl-3 pr-8 focus:ring-indigo-500"
          >
            <option value="all">Tất cả loại</option>
            {inventoryCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        <select
          value={kpiModalState.filters.timeRange}
          onChange={(event) =>
            setKpiModalState((previous) =>
              previous?.kind === "cost-per-visit"
                ? {
                    ...previous,
                    filters: {
                      ...previous.filters,
                      timeRange: event.target.value as SupplyTimeRange,
                    },
                  }
                : previous,
            )
          }
          className="text-sm rounded-lg border-gray-200 py-2 pl-3 pr-8 focus:ring-indigo-500"
        >
          {(["1M", "3M", "6M", "1Y"] as SupplyTimeRange[]).map((range) => (
            <option key={range} value={range}>
              {RANGE_LABELS[range]}
            </option>
          ))}
        </select>
        <select
          value={kpiModalState.filters.accountFilter}
          onChange={(event) =>
            setKpiModalState((previous) =>
              previous?.kind === "cost-per-visit"
                ? {
                    ...previous,
                    filters: {
                      ...previous.filters,
                      accountFilter: event.target.value as SupplyAccountFilter,
                    },
                  }
                : previous,
            )
          }
          className="text-sm rounded-lg border-gray-200 py-2 pl-3 pr-8 focus:ring-indigo-500"
        >
          {(["all", "1521", "1522", "1523"] as SupplyAccountFilter[]).map((account) => (
            <option key={account} value={account}>
              {ACCOUNT_LABELS[account]}
            </option>
          ))}
        </select>
      </div>
    );
  }, [RANGE_LABELS, inventoryCategories, inventoryWarehouses, kpiModalState]);

  const openWithKeyboard =
    (open: () => void) => (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    };

  return (
    <div className="space-y-6">
      {activeModal ? (
        <ChartDetailModal
          title={activeModal.title}
          dataSource={activeModal.dataSource}
          dataNote={activeModal.dataNote}
          summaryRows={activeModal.summaryRows}
          filters={modalFilters}
          columns={activeModal.columns}
          rows={activeModal.rows}
          onClose={closeModal}
        />
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            kind: "total-items" as const,
            label: "Tổng loại vật tư",
            value: stats.totalItems,
            icon: <Package className="w-5 h-5" />,
            color: "indigo" as const,
          },
          {
            kind: "alerts" as const,
            label: "Cảnh báo",
            value: stats.activeAnomaliesCount,
            icon: <AlertTriangle className="w-5 h-5" />,
            color: stats.activeAnomaliesCount > 0 ? ("rose" as const) : ("emerald" as const),
          },
          {
            kind: "inventory-value" as const,
            label: "Giá trị tồn kho",
            value: formatCompact(stats.estimatedValue),
            icon: <DollarSign className="w-5 h-5" />,
            color: "emerald" as const,
          },
          {
            kind: "cost-per-visit" as const,
            label: "Chi phí / lượt khám",
            value: avgPerVisit > 0 ? formatCurrency(avgPerVisit) : "-",
            icon: <Activity className="w-5 h-5" />,
            color: "indigo" as const,
          },
        ].map((kpi) => (
          <button
            key={kpi.kind}
            type="button"
            onClick={() => openKpiDetail(kpi.kind)}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-left transition-colors hover:border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${KPI_COLOR_CLASSES[kpi.color as KpiCardTone]}`}
              >
                {kpi.icon}
              </div>
              <span className="text-sm font-medium text-gray-500">{kpi.label}</span>
            </div>
            <p
              className={`text-2xl font-bold ${
                kpi.color === "rose" && stats.activeAnomaliesCount > 0
                  ? "text-rose-600"
                  : "text-gray-900"
              }`}
            >
              {kpi.value}
            </p>
          </button>
        ))}
      </div>

      <div
        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-gray-200"
        onClick={() =>
          openChartDetail({
            title: "Tieu hao vat tu & Luot kham benh",
            dataSource: STATIC_DETAIL_SOURCE.consumption,
            columns: ["Ky", "Tieu hao ky nay", "Cung ky nam truoc", "Luot kham", "Chi phi/luot"],
            rows: chartData.map((point) => {
              const perVisit =
                point.patientVolume && point.patientVolume > 0
                  ? point.consumption / point.patientVolume
                  : 0;

              return [
                point.period,
                formatCurrency(point.consumption || 0),
                formatCurrency(point.consumptionLY || 0),
                (point.patientVolume || 0).toLocaleString("vi-VN"),
                perVisit > 0 ? formatCurrency(perVisit) : "-",
              ];
            }),
          })
        }
        role="button"
        tabIndex={0}
        onKeyDown={openWithKeyboard(() =>
          openChartDetail({
            title: "Tieu hao vat tu & Luot kham benh",
            dataSource: STATIC_DETAIL_SOURCE.consumption,
            columns: ["Ky", "Tieu hao ky nay", "Cung ky nam truoc", "Luot kham", "Chi phi/luot"],
            rows: chartData.map((point) => {
              const perVisit =
                point.patientVolume && point.patientVolume > 0
                  ? point.consumption / point.patientVolume
                  : 0;

              return [
                point.period,
                formatCurrency(point.consumption || 0),
                formatCurrency(point.consumptionLY || 0),
                (point.patientVolume || 0).toLocaleString("vi-VN"),
                perVisit > 0 ? formatCurrency(perVisit) : "-",
              ];
            }),
          }),
        )}
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
                  setTimeRange(range);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  timeRange === range
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {RANGE_LABELS[range]}
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
                setAccountFilter(account);
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
        onClick={() =>
          openChartDetail({
            title: "Chi phi tieu hao / luot kham",
            dataSource: STATIC_DETAIL_SOURCE.costPerVisit,
            columns: ["Ky", "Chi phi/luot"],
            rows: chartData.map((point) => [
              point.period,
              point.consumptionPerVisit && point.consumptionPerVisit > 0
                ? formatCurrency(point.consumptionPerVisit)
                : "-",
            ]),
          })
        }
        role="button"
        tabIndex={0}
        onKeyDown={openWithKeyboard(() =>
          openChartDetail({
            title: "Chi phi tieu hao / luot kham",
            dataSource: STATIC_DETAIL_SOURCE.costPerVisit,
            columns: ["Ky", "Chi phi/luot"],
            rows: chartData.map((point) => [
              point.period,
              point.consumptionPerVisit && point.consumptionPerVisit > 0
                ? formatCurrency(point.consumptionPerVisit)
                : "-",
            ]),
          }),
        )}
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
          onClick={() =>
            openChartDetail({
              title: "Gia tri ton kho (1 nam)",
              dataSource: STATIC_DETAIL_SOURCE.inventoryTrend,
              columns: ["Ngay", "Tong ton kho", "Gia tri"],
              rows: snapshotHistory.map((row) => [
                row.date,
                (Number(row.totalStock) || 0).toLocaleString("vi-VN"),
                formatCurrency(Number(row.totalValue) || 0),
              ]),
            })
          }
          role="button"
          tabIndex={0}
          onKeyDown={openWithKeyboard(() =>
            openChartDetail({
              title: "Gia tri ton kho (1 nam)",
              dataSource: STATIC_DETAIL_SOURCE.inventoryTrend,
              columns: ["Ngay", "Tong ton kho", "Gia tri"],
              rows: snapshotHistory.map((row) => [
                row.date,
                (Number(row.totalStock) || 0).toLocaleString("vi-VN"),
                formatCurrency(Number(row.totalValue) || 0),
              ]),
            }),
          )}
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
          onClick={() =>
            openChartDetail({
              title: "Top 10 gia tri ton kho",
              dataSource: STATIC_DETAIL_SOURCE.inventoryValueTop,
              columns: ["Ten vat tu", "So luong", "Don vi", "Gia tri"],
              rows: topMaterials.map((material) => [
                material.name,
                (Number(material.stock) || 0).toLocaleString("vi-VN"),
                material.unit || "-",
                formatCurrency(Number(material.value) || 0),
              ]),
            })
          }
          role="button"
          tabIndex={0}
          onKeyDown={openWithKeyboard(() =>
            openChartDetail({
              title: "Top 10 gia tri ton kho",
              dataSource: STATIC_DETAIL_SOURCE.inventoryValueTop,
              columns: ["Ten vat tu", "So luong", "Don vi", "Gia tri"],
              rows: topMaterials.map((material) => [
                material.name,
                (Number(material.stock) || 0).toLocaleString("vi-VN"),
                material.unit || "-",
                formatCurrency(Number(material.value) || 0),
              ]),
            }),
          )}
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
                    dataKey="name"
                    width={120}
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
    </div>
  );
}
