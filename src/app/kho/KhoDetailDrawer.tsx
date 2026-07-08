/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { format, parseISO } from "date-fns";
import { X } from "lucide-react";
import { Area, AreaChart, Tooltip, XAxis, YAxis } from "recharts";

import { anomalyMatchesInventoryItem } from "@/lib/inventory-identity";
import {
  getDerivedPharmacyInventoryStatus,
  hasPharmacyExceptionalAnomaly,
} from "@/lib/pharmacyInventoryPresentation";
import { formatVND } from "@/lib/utils";
import { CHART_BRAND, CHART_TOOLTIP_STYLE, ChartFrame } from "@/ui/ChartFrame";
import { StatusBadge, type StatusKind } from "@/ui/StatusBadge";
import type { WarehouseKey } from "@/app/kho/khoTabs";
import type { InventoryAnomaly, InventoryItem, ItemSnapshot } from "@/types/inventory";

/**
 * KhoDetailDrawer — ONE shared drawer replacing `PharmacyDetailDrawer`
 * (`app/pharmacy/PharmacyDetailDrawer.tsx`) and the inventory-page inline
 * detail drawer (`app/inventory/page.tsx` "selectedItem" block) — Phase 3
 * spec §5. Item KPIs + `itemSnapshots` sparkline (via `ui/ChartFrame`) +
 * matching anomalies list.
 *
 * PRESENTATION ONLY. Consumes the ACTIVE frozen viewmodel's `selectedItem` /
 * `setSelectedItem` / `itemSnapshots` / `isLoadingItemSnapshots` /
 * `anomalies` (`usePharmacyInventory` / `useSupplyInventory`), passed in by
 * the caller (`KhoWorkspace`) via `vm` — same fields, same shape, zero
 * change to what is fetched or computed upstream. Import-history is NOT
 * shown here (that stays with `KhoValuationView`'s own drawer, per the
 * Phase 3 mapping table); this drawer covers only what the legacy list/
 * anomalies drawers showed.
 *
 * Status derivation: Thuốc reuses `getDerivedPharmacyInventoryStatus` +
 * `hasPharmacyExceptionalAnomaly` (`lib/pharmacyInventoryPresentation`,
 * verbatim) against the item's ACTIVE anomalies — identical to
 * `app/pharmacy/page.tsx`'s `getStatusBadge`. Vật tư has no such derivation
 * upstream, so it falls straight to the raw `item.status` map — identical to
 * `app/inventory/page.tsx`'s `getStatusBadge`. The derived label now renders
 * through `ui/StatusBadge` (tokenized); the 4-way legacy palette
 * (rose/amber/orange/emerald) collapses onto `ui/StatusBadge`'s 5 semantic
 * kinds (danger/warn/warn/ok) — text labels stay distinct so "Sắp hết" and
 * "Bất thường" remain distinguishable even though both render as `warn`.
 */

const STATUS_LABELS = {
  outOfStock: "Hết hàng",
  lowStock: "Sắp hết",
  anomaly: "Bất thường",
  normal: "Bình thường",
} as const;

function renderStatusBadge(
  item: InventoryItem,
  warehouse: WarehouseKey,
  itemAnomalies: InventoryAnomaly[],
) {
  if (warehouse === "thuoc") {
    const activeItemAnomalies = itemAnomalies.filter((anomaly) => !anomaly.acknowledged);
    const derivedStatus = getDerivedPharmacyInventoryStatus(item, activeItemAnomalies);

    if (derivedStatus === "out_of_stock") {
      return <StatusBadge status="danger" label={STATUS_LABELS.outOfStock} />;
    }

    if (derivedStatus === "low_stock") {
      return <StatusBadge status="warn" label={STATUS_LABELS.lowStock} />;
    }

    if (hasPharmacyExceptionalAnomaly(activeItemAnomalies)) {
      return <StatusBadge status="warn" label={STATUS_LABELS.anomaly} />;
    }
  }

  const rawStatusKind: Record<InventoryItem["status"], StatusKind> = {
    in_stock: "ok",
    low_stock: "warn",
    out_of_stock: "danger",
  };
  const rawStatusLabel: Record<InventoryItem["status"], string> = {
    in_stock: STATUS_LABELS.normal,
    low_stock: STATUS_LABELS.lowStock,
    out_of_stock: STATUS_LABELS.outOfStock,
  };

  const kind = rawStatusKind[item.status];
  if (!kind) {
    return null;
  }

  return <StatusBadge status={kind} label={rawStatusLabel[item.status]} />;
}

function formatSnapshotDate(value: unknown): string {
  try {
    return format(parseISO(String(value)), "dd/MM/yyyy");
  } catch {
    return String(value);
  }
}

export interface KhoDetailDrawerVm {
  selectedItem: InventoryItem | null;
  setSelectedItem: (item: InventoryItem | null) => void;
  itemSnapshots: ItemSnapshot[];
  isLoadingItemSnapshots: boolean;
  anomalies: InventoryAnomaly[];
}

export interface KhoDetailDrawerProps {
  /** The single ACTIVE viewmodel (pharmacy or supply) — enabled-dual-hook §4. */
  vm: KhoDetailDrawerVm;
  /** Selects the status-derivation branch (Thuốc vs Vật tư — see file header). */
  warehouse: WarehouseKey;
}

export function KhoDetailDrawer({ vm, warehouse }: KhoDetailDrawerProps) {
  const { selectedItem, setSelectedItem, itemSnapshots, isLoadingItemSnapshots, anomalies } = vm;

  if (!selectedItem) {
    return null;
  }

  const item = selectedItem;
  const onClose = () => setSelectedItem(null);
  const itemAnomalies = anomalies.filter((anomaly) => anomalyMatchesInventoryItem(anomaly, item));

  return (
    <>
      <div
        className="fixed inset-0 bg-ink-900/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-line shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-4 border-b border-line flex items-center justify-between bg-paper/50">
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-[600] text-ink-900 truncate">{item.name}</h2>
            <div className="flex items-center gap-2 text-[13px] text-ink-600 mt-0.5">
              <span className="bg-paper px-2 py-0.5 rounded text-ink-900 font-medium text-[12px]">
                {item.sku}
              </span>
              <span>•</span>
              <span>{item.warehouse}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-ink-400 hover:text-ink-900 hover:bg-paper rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-paper rounded-card p-4">
              <p className="text-[13px] text-ink-600 mb-1">Tồn kho</p>
              <p className="text-2xl font-bold text-ink-900">
                {item.currentStock}{" "}
                <span className="text-[13px] font-normal text-ink-600">{item.unit}</span>
              </p>
            </div>
            <div className="bg-paper rounded-card p-4">
              <p className="text-[13px] text-ink-600 mb-1">Giá trị</p>
              <p className="text-lg font-bold text-brand-600">
                {formatVND(item.currentStock * (item.unitPrice || 0))}
              </p>
            </div>
            <div className="bg-paper rounded-card p-4">
              <p className="text-[13px] text-ink-600 mb-1">Đơn giá</p>
              <p className="text-lg font-semibold text-ink-900">
                {formatVND(item.unitPrice || 0)}
              </p>
            </div>
            <div className="bg-paper rounded-card p-4">
              <p className="text-[13px] text-ink-600 mb-1">Trạng thái</p>
              <div className="mt-1">{renderStatusBadge(item, warehouse, itemAnomalies)}</div>
            </div>
          </div>

          <ChartFrame
            title="Biến động tồn kho (30 ngày)"
            height={160}
            isLoading={isLoadingItemSnapshots}
            isEmpty={!isLoadingItemSnapshots && itemSnapshots.length <= 1}
            emptyLabel="Chưa có đủ dữ liệu lịch sử để hiển thị biểu đồ."
          >
            <AreaChart data={itemSnapshots} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="khoItemStockGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_BRAND} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_BRAND} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelFormatter={formatSnapshotDate}
                formatter={(value: number) => [value, "Tồn kho"]}
              />
              <Area
                type="monotone"
                dataKey="stock"
                stroke={CHART_BRAND}
                strokeWidth={2}
                fill="url(#khoItemStockGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartFrame>

          {item.batchNumber || item.expiryDate ? (
            <div className="space-y-2">
              <h3 className="text-[13px] font-[600] text-ink-900">Thông tin lô</h3>
              <div className="grid grid-cols-2 gap-3">
                {item.batchNumber ? (
                  <div className="text-[13px]">
                    <span className="text-ink-600">Lô SX:</span>
                    <span className="ml-2 font-medium text-ink-900">{item.batchNumber}</span>
                  </div>
                ) : null}
                {item.expiryDate ? (
                  <div className="text-[13px]">
                    <span className="text-ink-600">HSD:</span>
                    <span className="ml-2 font-medium text-ink-900">
                      {format(new Date(item.expiryDate), "dd/MM/yyyy")}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {itemAnomalies.length > 0 ? (
            <div>
              <h3 className="text-[13px] font-[600] text-ink-900 mb-3">Cảnh báo</h3>
              <div className="space-y-2">
                {itemAnomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className="flex gap-3 p-3 rounded-card border border-line bg-card"
                  >
                    <div
                      className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                        anomaly.acknowledged ? "bg-line" : "bg-orange-500"
                      }`}
                    />
                    <div className="flex-1">
                      <p
                        className={`text-[13px] ${
                          anomaly.acknowledged ? "text-ink-600" : "text-ink-900 font-medium"
                        }`}
                      >
                        {anomaly.description}
                      </p>
                      <p className="text-[12px] text-ink-400 mt-1">
                        {format(parseISO(anomaly.detectedAt), "HH:mm dd/MM/yyyy")}
                        {anomaly.acknowledged ? " • Đã xác nhận" : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default KhoDetailDrawer;
