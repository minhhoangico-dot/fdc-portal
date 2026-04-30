/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

import {
  buildSupplyInventoryKpiDetail,
  getDefaultSupplyInventoryKpiModalState,
  type SupplyInventoryKpiModalState,
} from "@/lib/supplyInventoryKpiDetails";
import type {
  InventoryAnomaly,
  InventoryItem,
  SnapshotHistory,
  SupplyAccountFilter,
  SupplyTimeRange,
  TopMaterial,
} from "@/types/inventory";
import { useSupplyChart } from "@/viewmodels/useSupplyChart";

import ChartDetailModal from "./ChartDetailModal";
import { InventoryCharts } from "./overview/InventoryCharts";
import {
  InventoryKpiGrid,
  type InventoryKpiKind,
} from "./overview/InventoryKpiGrid";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const ACCOUNT_LABELS: Record<SupplyAccountFilter, string> = {
  all: "\u0054\u1ea5\u0074\u0020\u0063\u1ea3\u0020\u0054\u004b\u0020\u0031\u0035\u0032",
  "1521": "\u004e\u0067\u0075\u0079\u00ea\u006e\u0020\u0076\u1ead\u0074\u0020\u006c\u0069\u1ec7\u0075",
  "1522": "\u0056\u1ead\u0074\u0020\u0074\u01b0\u0020\u0079\u0020\u0074\u1ebf",
  "1523": "\u0056\u0103\u006e\u0020\u0070\u0068\u00f2\u006e\u0067\u0020\u0070\u0068\u1ea9\u006d",
};

const COPY = {
  allCategories: "\u0054\u1ea5\u0074\u0020\u0063\u1ea3\u0020\u006c\u006f\u1ea1\u0069",
  allStatuses: "\u0054\u1ea5\u0074\u0020\u0063\u1ea3\u0020\u0074\u0072\u1ea1\u006e\u0067\u0020\u0074\u0068\u00e1\u0069",
  inStock: "\u0042\u00ec\u006e\u0068\u0020\u0074\u0068\u01b0\u1edd\u006e\u0067",
  lowStock: "\u0053\u1eaf\u0070\u0020\u0068\u1ebf\u0074",
  outOfStock: "\u0048\u1ebf\u0074\u0020\u0068\u00e0\u006e\u0067",
  allSeverity: "\u0054\u1ea5\u0074\u0020\u0063\u1ea3\u0020\u006d\u1ee9\u0063\u0020\u0111\u1ed9",
  critical: "\u004e\u0067\u0068\u0069\u00ea\u006d\u0020\u0074\u0072\u1ecd\u006e\u0067",
  high: "\u0043\u0061\u006f",
  medium: "\u0054\u0072\u0075\u006e\u0067\u0020\u0062\u00ec\u006e\u0068",
  low: "\u0054\u0068\u1ea5\u0070",
  activeOnly:
    "\u0043\u0068\u1ec9\u0020\u0111\u0061\u006e\u0067\u0020\u0068\u006f\u1ea1\u0074\u0020\u0111\u1ed9\u006e\u0067",
  all: "\u0054\u1ea5\u0074\u0020\u0063\u1ea3",
  allWarehouses: "\u0054\u1ea5\u0074\u0020\u0063\u1ea3\u0020\u006b\u0068\u006f",
} as const;

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
  columns: string[];
  rows: (string | number | null | undefined)[][];
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
  const [kpiModalState, setKpiModalState] =
    React.useState<SupplyInventoryKpiModalState | null>(null);

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
      ? ((latestPoint.consumption - latestPoint.consumptionLY) /
          latestPoint.consumptionLY) *
        100
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
    (kind: InventoryKpiKind) => {
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
            <option value="all">{COPY.allCategories}</option>
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
            <option value="all">{COPY.allStatuses}</option>
            <option value="in_stock">{COPY.inStock}</option>
            <option value="low_stock">{COPY.lowStock}</option>
            <option value="out_of_stock">{COPY.outOfStock}</option>
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
            <option value="all">{COPY.allSeverity}</option>
            <option value="critical">{COPY.critical}</option>
            <option value="high">{COPY.high}</option>
            <option value="medium">{COPY.medium}</option>
            <option value="low">{COPY.low}</option>
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
            <option value="active">{COPY.activeOnly}</option>
            <option value="all">{COPY.all}</option>
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
            <option value="all">{COPY.allWarehouses}</option>
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
            <option value="all">{COPY.allCategories}</option>
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

  const openConsumptionDetail = React.useCallback(() => {
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
    });
  }, [chartData, openChartDetail]);

  const openCostPerVisitDetail = React.useCallback(() => {
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
    });
  }, [chartData, openChartDetail]);

  const openInventoryTrendDetail = React.useCallback(() => {
    openChartDetail({
      title: "Gia tri ton kho (1 nam)",
      dataSource: STATIC_DETAIL_SOURCE.inventoryTrend,
      columns: ["Ngay", "Tong ton kho", "Gia tri"],
      rows: snapshotHistory.map((row) => [
        row.date,
        (Number(row.totalStock) || 0).toLocaleString("vi-VN"),
        formatCurrency(Number(row.totalValue) || 0),
      ]),
    });
  }, [openChartDetail, snapshotHistory]);

  const openTopMaterialsDetail = React.useCallback(() => {
    openChartDetail({
      title: "Top 10 gia tri ton kho",
      dataSource: STATIC_DETAIL_SOURCE.inventoryValueTop,
      columns: ["Ten vat tu", "Kho", "So luong", "Don vi", "Gia tri"],
      rows: topMaterials.map((material) => [
        material.name,
        material.warehouse || "-",
        (Number(material.stock) || 0).toLocaleString("vi-VN"),
        material.unit || "-",
        formatCurrency(Number(material.value) || 0),
      ]),
    });
  }, [openChartDetail, topMaterials]);

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

      <InventoryKpiGrid
        stats={stats}
        avgPerVisit={avgPerVisit}
        onOpenKpiDetail={openKpiDetail}
      />

      <InventoryCharts
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        accountFilter={accountFilter}
        onAccountFilterChange={setAccountFilter}
        chartData={chartData}
        isLoadingSupplyChart={isLoadingSupplyChart}
        rangeLabels={RANGE_LABELS}
        snapshotHistory={snapshotHistory}
        isRefreshingSnapshotHistory={isRefreshingSnapshotHistory}
        isInitialSnapshotHistoryLoad={isInitialSnapshotHistoryLoad}
        topMaterials={topMaterials}
        yoyChange={yoyChange}
        onOpenConsumptionDetail={openConsumptionDetail}
        onOpenCostPerVisitDetail={openCostPerVisitDetail}
        onOpenInventoryTrendDetail={openInventoryTrendDetail}
        onOpenTopMaterialsDetail={openTopMaterialsDetail}
      />
    </div>
  );
}
