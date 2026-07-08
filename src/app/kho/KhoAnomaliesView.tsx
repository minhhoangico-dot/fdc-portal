/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { BarChart2, Clock, Package, ShieldAlert, TrendingDown } from "lucide-react";

import { EmptyState } from "@/ui/EmptyState";
import type { WarehouseKey } from "@/app/kho/khoTabs";
import type { AnomalyRule, AnomalySeverity, InventoryAnomaly } from "@/types/inventory";

/**
 * KhoAnomaliesView — re-skin of `PharmacyAnomalyCenter` / `PharmacyAnomalyPreview`
 * (`app/pharmacy/PharmacyAnomalySections.tsx`) and the inventory-page inline
 * anomaly cards (`app/inventory/page.tsx` "anomalies" tab) onto one grouped,
 * tokenized view (Phase 3 spec §5, "Bất thường" sub-tab).
 *
 * PRESENTATION ONLY. Consumes the ACTIVE frozen viewmodel's `anomalies` /
 * `acknowledgeAnomaly` (`usePharmacyInventory` / `useSupplyInventory`),
 * passed in by the caller (`KhoWorkspace`) via `vm` — same fields, same
 * shape, zero change to what is fetched or computed upstream. The grouping
 * by rule, the active/acknowledged split, and the acknowledged-collapsed
 * `<details>` are the identical presentation logic already in
 * `PharmacyAnomalyCenter` — reproduced verbatim, not re-derived.
 *
 * The severity → solid-fill color map is intentionally kept LOCAL (not routed
 * through `ui/StatusBadge`, which is tint-based) per the Phase 3 spec's
 * severity-badge note — semantics unchanged from the legacy solid badges.
 *
 * `warehouse` is accepted for API parity with the sibling Kho views
 * (`KhoOverviewView` / `KhoInventoryListView` / `KhoValuationView`, all
 * `{ vm, warehouse }`) and matches how `KhoWorkspace` calls this component —
 * it is not used for rendering: anomaly rules/severities are the same set
 * for both Thuốc and Vật tư (`fdc_analytics_anomalies`).
 */

const SEVERITY_LABELS: Record<AnomalySeverity, string> = {
  critical: "Nghiêm trọng",
  high: "Cao",
  medium: "Trung bình",
  low: "Thấp",
};

/** Severity → solid-fill badge classes. Kept local — semantics unchanged. */
const SEVERITY_FILL: Record<AnomalySeverity, string> = {
  critical: "bg-rose-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-amber-500 text-white",
  low: "bg-blue-500 text-white",
};

const RULE_LABELS: Record<AnomalyRule, string> = {
  low_stock: "Tồn kho thấp",
  near_expiry: "Sắp hết hạn",
  expired: "Đã hết hạn",
  zero_stock: "Hết hàng",
  stock_spike: "Biến động đột biến",
};

const RULE_ICONS: Record<AnomalyRule, ReactNode> = {
  low_stock: <TrendingDown className="w-4 h-4" />,
  near_expiry: <Clock className="w-4 h-4" />,
  expired: <ShieldAlert className="w-4 h-4" />,
  zero_stock: <Package className="w-4 h-4" />,
  stock_spike: <BarChart2 className="w-4 h-4" />,
};

function getSeverityLabel(severity: string): string {
  return SEVERITY_LABELS[severity as AnomalySeverity] ?? severity;
}

function getSeverityFill(severity: string): string {
  return SEVERITY_FILL[severity as AnomalySeverity] ?? "bg-ink-400 text-white";
}

function getRuleLabel(rule: string): string {
  return RULE_LABELS[rule as AnomalyRule] ?? rule;
}

function getRuleIcon(rule: string): ReactNode {
  return RULE_ICONS[rule as AnomalyRule] ?? <ShieldAlert className="w-4 h-4" />;
}

export interface KhoAnomaliesVm {
  anomalies: InventoryAnomaly[];
  acknowledgeAnomaly: (id: string) => void | Promise<void>;
}

export interface KhoAnomaliesViewProps {
  /** The single ACTIVE viewmodel (pharmacy or supply) — enabled-dual-hook §4. */
  vm: KhoAnomaliesVm;
  /** Accepted for call-site parity with the sibling Kho views; unused here. */
  warehouse?: WarehouseKey;
  className?: string;
}

export function KhoAnomaliesView({ vm, className = "" }: KhoAnomaliesViewProps) {
  const { anomalies, acknowledgeAnomaly } = vm;

  const activeAnomalies = anomalies.filter((anomaly) => !anomaly.acknowledged);
  const acknowledgedAnomalies = anomalies.filter((anomaly) => anomaly.acknowledged);

  if (activeAnomalies.length === 0) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Không có bất thường"
        description="Tất cả thuốc trong kho đang ở trạng thái bình thường."
        className={className}
      />
    );
  }

  const anomalyByRule = activeAnomalies.reduce<Record<string, InventoryAnomaly[]>>(
    (groups, anomaly) => {
      if (!groups[anomaly.rule]) {
        groups[anomaly.rule] = [];
      }

      groups[anomaly.rule].push(anomaly);
      return groups;
    },
    {},
  );

  return (
    <div className={`space-y-6 ${className}`.trim()}>
      {Object.entries(anomalyByRule).map(([rule, items]) => (
        <div key={rule} className="space-y-3">
          <h2 className="text-[15px] font-[600] text-ink-900 flex items-center gap-2">
            {getRuleIcon(rule)}
            {getRuleLabel(rule)}
            <span className="text-[13px] font-normal text-ink-400">({items.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((anomaly) => (
              <div
                key={anomaly.id}
                className="rounded-card bg-card p-4 border border-line shadow-card flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 shrink-0 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getSeverityFill(
                      anomaly.severity,
                    )}`}
                  >
                    {getSeverityLabel(anomaly.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-[600] text-ink-900 text-[13px] truncate">
                      {anomaly.materialId}
                    </h4>
                    <p className="text-[13px] text-ink-600 mt-1">{anomaly.description}</p>
                    <p className="text-[12px] text-ink-400 mt-2">
                      Phát hiện: {format(parseISO(anomaly.detectedAt), "HH:mm dd/MM/yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => acknowledgeAnomaly(anomaly.id)}
                    className="px-3 py-1.5 bg-paper hover:bg-line text-ink-600 text-[12px] font-medium rounded-field transition-colors"
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {acknowledgedAnomalies.length > 0 ? (
        <details className="mt-4">
          <summary className="text-[13px] text-ink-600 cursor-pointer hover:text-ink-900">
            Đã xác nhận ({acknowledgedAnomalies.length})
          </summary>
          <div className="mt-3 space-y-2">
            {acknowledgedAnomalies.slice(0, 10).map((anomaly) => (
              <div
                key={anomaly.id}
                className="flex items-center gap-3 p-3 rounded-field bg-paper text-[13px]"
              >
                <div className="w-2 h-2 rounded-full bg-line shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-ink-600">{anomaly.materialId}</span>
                  <span className="text-ink-400 ml-2">{anomaly.description}</span>
                </div>
                <span className="text-[12px] text-ink-400 shrink-0">
                  {format(parseISO(anomaly.detectedAt), "dd/MM")}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

export default KhoAnomaliesView;
