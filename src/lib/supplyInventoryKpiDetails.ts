/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { format } from "date-fns";

import { anomalyMatchesInventoryItem } from "@/lib/inventory-identity";
import { buildSupplyChartData } from "@/lib/supplyChart";
import type {
  AnomalyRule,
  AnomalySeverity,
  InventoryAnomaly,
  InventoryItem,
  InventoryStatus,
  SupplyAccountFilter,
  SupplyDailyConsumptionRow,
  SupplyMonthlyStatRow,
  SupplyTimeRange,
} from "@/types/inventory";

type Cell = string | number | null | undefined;

export interface ChartDetailSummaryRow {
  label: string;
  value: string;
  tone?: "default" | "positive" | "warning" | "danger";
}

export interface SupplyInventoryKpiDetailPayload {
  title: string;
  dataSource: string;
  dataNote: string;
  summaryRows: ChartDetailSummaryRow[];
  columns: string[];
  rows: Cell[][];
}

export type SupplyInventoryKpiModalState =
  | {
      kind: "total-items";
      filters: {
        category: string;
        status: InventoryStatus | "all";
      };
    }
  | {
      kind: "alerts";
      filters: {
        severity: AnomalySeverity | "all";
        visibility: "active" | "all";
      };
    }
  | {
      kind: "inventory-value";
      filters: {
        warehouse: string;
        category: string;
      };
    }
  | {
      kind: "cost-per-visit";
      filters: {
        timeRange: SupplyTimeRange;
        accountFilter: SupplyAccountFilter;
      };
    };

interface BuildSupplyInventoryKpiDetailContext {
  inventory: InventoryItem[];
  anomalies: InventoryAnomaly[];
  monthlyData: SupplyMonthlyStatRow[];
  dailyData: SupplyDailyConsumptionRow[];
  now?: Date;
}

const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  in_stock: "Bình thường",
  low_stock: "Sắp hết",
  out_of_stock: "Hết hàng",
};

const ANOMALY_SEVERITY_LABELS: Record<AnomalySeverity, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  critical: "Nghiêm trọng",
};

const ANOMALY_RULE_LABELS: Record<AnomalyRule, string> = {
  low_stock: "Tồn kho thấp",
  near_expiry: "Sắp hết hạn",
  expired: "Hết hạn",
  zero_stock: "Hết hàng",
  stock_spike: "Biến động đột biến",
};

const ACCOUNT_LABELS: Record<SupplyAccountFilter, string> = {
  all: "Tất cả TK 152",
  "1521": "Nguyên vật liệu",
  "1522": "Vật tư y tế",
  "1523": "Văn phòng phẩm",
};

const SEVERITY_ORDER: Record<AnomalySeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const formatDateTime = (value: string) => {
  try {
    return format(new Date(value), "dd/MM/yyyy HH:mm");
  } catch {
    return value;
  }
};

const getInventoryValue = (item: InventoryItem) =>
  (Number(item.currentStock) || 0) * (Number(item.unitPrice) || 0);

const toneForSeverity = (severity: AnomalySeverity): ChartDetailSummaryRow["tone"] => {
  if (severity === "critical" || severity === "high") return "danger";
  if (severity === "medium") return "warning";
  return "default";
};

const buildGroupedSummaryRows = (
  entries: Array<[string, number]>,
  prefix: string,
  formatter: (value: number) => string,
  tone: ChartDetailSummaryRow["tone"] = "default",
): ChartDetailSummaryRow[] =>
  entries.map(([label, value]) => ({
    label: `${prefix} - ${label}`,
    value: formatter(value),
    tone,
  }));

export function getDefaultSupplyInventoryKpiModalState(
  kind: SupplyInventoryKpiModalState["kind"],
  defaults?: Partial<SupplyInventoryKpiModalState["filters"]>,
): SupplyInventoryKpiModalState {
  switch (kind) {
    case "total-items":
      return {
        kind,
        filters: {
          category: typeof defaults?.category === "string" ? defaults.category : "all",
          status:
            defaults?.status === "in_stock" ||
            defaults?.status === "low_stock" ||
            defaults?.status === "out_of_stock"
              ? defaults.status
              : "all",
        },
      };
    case "alerts":
      return {
        kind,
        filters: {
          severity:
            defaults?.severity === "low" ||
            defaults?.severity === "medium" ||
            defaults?.severity === "high" ||
            defaults?.severity === "critical"
              ? defaults.severity
              : "all",
          visibility: defaults?.visibility === "all" ? "all" : "active",
        },
      };
    case "inventory-value":
      return {
        kind,
        filters: {
          warehouse: typeof defaults?.warehouse === "string" ? defaults.warehouse : "all",
          category: typeof defaults?.category === "string" ? defaults.category : "all",
        },
      };
    case "cost-per-visit":
      return {
        kind,
        filters: {
          timeRange:
            defaults?.timeRange === "1M" ||
            defaults?.timeRange === "3M" ||
            defaults?.timeRange === "6M" ||
            defaults?.timeRange === "1Y"
              ? defaults.timeRange
              : "1Y",
          accountFilter:
            defaults?.accountFilter === "1521" ||
            defaults?.accountFilter === "1522" ||
            defaults?.accountFilter === "1523"
              ? defaults.accountFilter
              : "all",
        },
      };
  }
}

function buildTotalItemsDetail(
  state: Extract<SupplyInventoryKpiModalState, { kind: "total-items" }>,
  inventory: InventoryItem[],
): SupplyInventoryKpiDetailPayload {
  const filtered = inventory
    .filter((item) =>
      state.filters.category === "all" ? true : item.category === state.filters.category,
    )
    .filter((item) =>
      state.filters.status === "all" ? true : item.status === state.filters.status,
    )
    .sort((left, right) => left.name.localeCompare(right.name, "vi"));

  const summaryByCategory = new Map<string, { count: number; totalValue: number }>();
  filtered.forEach((item) => {
    const current = summaryByCategory.get(item.category) || { count: 0, totalValue: 0 };
    current.count += 1;
    current.totalValue += getInventoryValue(item);
    summaryByCategory.set(item.category, current);
  });

  return {
    title: "Tổng loại vật tư",
    dataSource: "MISA",
    dataNote:
      "Dữ liệu được lấy từ snapshot hiện tại của fdc_inventory_snapshots cho các row MISA.",
    summaryRows: Array.from(summaryByCategory.entries())
      .sort(
        (left, right) =>
          right[1].count - left[1].count || left[0].localeCompare(right[0], "vi"),
      )
      .map(([category, value]) => ({
        label: category,
        value: `${value.count} mã • ${formatCurrency(value.totalValue)}`,
      })),
    columns: ["Mã vật tư", "Tên vật tư", "Loại", "Kho", "Tồn kho", "Đơn vị", "Trạng thái"],
    rows: filtered.map((item) => [
      item.sku,
      item.name,
      item.category,
      item.warehouse,
      item.currentStock,
      item.unit,
      INVENTORY_STATUS_LABELS[item.status],
    ]),
  };
}

function buildAlertsDetail(
  state: Extract<SupplyInventoryKpiModalState, { kind: "alerts" }>,
  inventory: InventoryItem[],
  anomalies: InventoryAnomaly[],
): SupplyInventoryKpiDetailPayload {
  const matched = anomalies.filter((anomaly) =>
    inventory.some((item) => anomalyMatchesInventoryItem(anomaly, item)),
  );

  const filtered = matched
    .filter((anomaly) => (state.filters.visibility === "active" ? !anomaly.acknowledged : true))
    .filter((anomaly) =>
      state.filters.severity === "all" ? true : anomaly.severity === state.filters.severity,
    )
    .sort((left, right) => {
      const severityDiff = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];
      if (severityDiff !== 0) return severityDiff;
      return right.detectedAt.localeCompare(left.detectedAt);
    });

  const severityCounts = new Map<string, number>();
  const ruleCounts = new Map<string, number>();
  filtered.forEach((anomaly) => {
    severityCounts.set(anomaly.severity, (severityCounts.get(anomaly.severity) || 0) + 1);
    ruleCounts.set(anomaly.rule, (ruleCounts.get(anomaly.rule) || 0) + 1);
  });

  return {
    title: "Cảnh báo bất thường",
    dataSource: "MISA + Analytics",
    dataNote:
      "Anomaly được đọc từ fdc_analytics_anomalies và chỉ hiện các dòng đang match với snapshot MISA hiện tại trong fdc_inventory_snapshots.",
    summaryRows: [
      ...Array.from(severityCounts.entries())
        .sort(
          (left, right) =>
            right[1] - left[1] ||
            SEVERITY_ORDER[left[0] as AnomalySeverity] -
              SEVERITY_ORDER[right[0] as AnomalySeverity],
        )
        .map(([severity, count]) => ({
          label: `Severity - ${ANOMALY_SEVERITY_LABELS[severity as AnomalySeverity]}`,
          value: `${count} cảnh báo`,
          tone: toneForSeverity(severity as AnomalySeverity),
        })),
      ...buildGroupedSummaryRows(
        Array.from(ruleCounts.entries()).sort((left, right) => right[1] - left[1]),
        "Rule",
        (count) => `${count} cảnh báo`,
        "warning",
      ),
    ],
    columns: ["Vật tư", "Severity", "Rule", "Mô tả", "Phát hiện", "Trạng thái"],
    rows: filtered.map((anomaly) => [
      anomaly.materialId,
      ANOMALY_SEVERITY_LABELS[anomaly.severity],
      ANOMALY_RULE_LABELS[anomaly.rule],
      anomaly.description,
      formatDateTime(anomaly.detectedAt),
      anomaly.acknowledged ? "Đã xác nhận" : "Đang hoạt động",
    ]),
  };
}

function buildInventoryValueDetail(
  state: Extract<SupplyInventoryKpiModalState, { kind: "inventory-value" }>,
  inventory: InventoryItem[],
): SupplyInventoryKpiDetailPayload {
  const filtered = inventory
    .filter((item) =>
      state.filters.warehouse === "all" ? true : item.warehouse === state.filters.warehouse,
    )
    .filter((item) =>
      state.filters.category === "all" ? true : item.category === state.filters.category,
    )
    .sort((left, right) => getInventoryValue(right) - getInventoryValue(left));

  const valueByWarehouse = new Map<string, number>();
  const valueByCategory = new Map<string, number>();
  filtered.forEach((item) => {
    valueByWarehouse.set(
      item.warehouse,
      (valueByWarehouse.get(item.warehouse) || 0) + getInventoryValue(item),
    );
    valueByCategory.set(
      item.category,
      (valueByCategory.get(item.category) || 0) + getInventoryValue(item),
    );
  });

  return {
    title: "Giá trị tồn kho",
    dataSource: "MISA",
    dataNote:
      "Giá trị được tính trực tiếp từ snapshot MISA hiện tại trong fdc_inventory_snapshots: current_stock x unit_price.",
    summaryRows: [
      ...buildGroupedSummaryRows(
        Array.from(valueByWarehouse.entries()).sort((left, right) => right[1] - left[1]),
        "Kho",
        (value) => formatCurrency(value),
        "positive",
      ),
      ...buildGroupedSummaryRows(
        Array.from(valueByCategory.entries()).sort((left, right) => right[1] - left[1]),
        "Loại",
        (value) => formatCurrency(value),
      ),
    ],
    columns: ["Mã vật tư", "Tên vật tư", "Kho", "Loại", "Tồn kho", "Đơn giá", "Thành tiền"],
    rows: filtered.map((item) => [
      item.sku,
      item.name,
      item.warehouse,
      item.category,
      `${item.currentStock} ${item.unit}`,
      formatCurrency(Number(item.unitPrice) || 0),
      formatCurrency(getInventoryValue(item)),
    ]),
  };
}

function buildCostPerVisitDetail(
  state: Extract<SupplyInventoryKpiModalState, { kind: "cost-per-visit" }>,
  monthlyData: SupplyMonthlyStatRow[],
  dailyData: SupplyDailyConsumptionRow[],
  now?: Date,
): SupplyInventoryKpiDetailPayload {
  const chartData = buildSupplyChartData({
    dailyData,
    monthlyData,
    timeRange: state.filters.timeRange,
    accountFilter: state.filters.accountFilter,
    now,
  });

  const latestPoint = chartData[chartData.length - 1];
  const totalConsumption = chartData.reduce((sum, point) => sum + point.consumption, 0);
  const totalPatients = chartData.reduce((sum, point) => sum + point.patientVolume, 0);

  return {
    title: "Chi phí / lượt khám",
    dataSource: "MISA + HIS",
    dataNote:
      "Dữ liệu sử dụng fdc_supply_monthly_stats hoặc fdc_supply_consumption_daily và patient volume theo logic hiện tại của useSupplyChart.",
    summaryRows: [
      { label: "Kỳ gần nhất", value: latestPoint?.period || "-" },
      { label: "Tổng tiêu hao", value: formatCurrency(totalConsumption), tone: "positive" },
      { label: "Tổng lượt khám", value: totalPatients.toLocaleString("vi-VN") },
      {
        label: "Chi phí / lượt",
        value:
          latestPoint && latestPoint.consumptionPerVisit > 0
            ? formatCurrency(latestPoint.consumptionPerVisit)
            : "-",
      },
      { label: "Tài khoản", value: ACCOUNT_LABELS[state.filters.accountFilter] },
    ],
    columns: ["Kỳ", "Tiêu hao kỳ này", "Cùng kỳ năm trước", "Lượt khám", "Chi phí / lượt"],
    rows: chartData.map((point) => [
      point.period,
      formatCurrency(point.consumption),
      point.consumptionLY > 0 ? formatCurrency(point.consumptionLY) : "-",
      point.patientVolume.toLocaleString("vi-VN"),
      point.consumptionPerVisit > 0 ? formatCurrency(point.consumptionPerVisit) : "-",
    ]),
  };
}

export function buildSupplyInventoryKpiDetail(
  state: SupplyInventoryKpiModalState,
  context: BuildSupplyInventoryKpiDetailContext,
): SupplyInventoryKpiDetailPayload {
  switch (state.kind) {
    case "total-items":
      return buildTotalItemsDetail(state, context.inventory);
    case "alerts":
      return buildAlertsDetail(state, context.inventory, context.anomalies);
    case "inventory-value":
      return buildInventoryValueDetail(state, context.inventory);
    case "cost-per-visit":
      return buildCostPerVisitDetail(
        state,
        context.monthlyData,
        context.dailyData,
        context.now,
      );
  }
}
