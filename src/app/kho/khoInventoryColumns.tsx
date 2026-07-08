/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { format } from "date-fns";

import { anomalyMatchesInventoryItem } from "@/lib/inventory-identity";
import {
  getDerivedPharmacyInventoryStatus,
  hasPharmacyExceptionalAnomaly,
} from "@/lib/pharmacyInventoryPresentation";
import { formatCompact, formatVND } from "@/lib/utils";
import type { DataTableColumn } from "@/ui/DataTable";
import { StatusBadge, type StatusKind } from "@/ui/StatusBadge";
import type { InventoryAnomaly, InventoryItem } from "@/types/inventory";

/**
 * khoInventoryColumns — warehouse-specific `ui/DataTable` column configs for
 * `KhoInventoryListView` (Phase 3 spec §5 mapping row 2).
 *
 * A byte-for-byte re-skin of the column set + cell formatting from
 * `PharmacyInventoryTable` (Thuốc) and the inventory-page inline `<table>`
 * (Vật tư). Same fields, same formatters (`formatVND` / `formatCompact` from
 * `@/lib/utils`), same derived-status logic — the Thuốc status badge reuses
 * `getDerivedPharmacyInventoryStatus` + `hasPharmacyExceptionalAnomaly` from
 * `lib/pharmacyInventoryPresentation` VERBATIM (mirrors
 * `app/pharmacy/page.tsx`'s `getStatusBadge` exactly; only the color tinting
 * moves onto `ui/StatusBadge`'s 5-value `StatusKind`, which is presentation
 * only). No sort/filter/value computation lives here — `cell` renderers only
 * format fields already present on the frozen `InventoryItem`.
 */

const THUOC_STATUS_LABELS = {
  outOfStock: "Hết hàng",
  lowStock: "Sắp hết",
  anomaly: "Bất thường",
  normal: "Bình thường",
} as const;

const VAT_TU_STATUS_LABELS: Record<string, string> = {
  in_stock: "Bình thường",
  low_stock: "Sắp hết",
  out_of_stock: "Hết hàng",
};

const VAT_TU_STATUS_KIND: Record<string, StatusKind> = {
  in_stock: "ok",
  low_stock: "warn",
  out_of_stock: "danger",
};

/**
 * Thuốc status badge — verbatim derivation logic from
 * `app/pharmacy/page.tsx`'s `getStatusBadge` (only unacknowledged anomalies
 * count, out_of_stock/low_stock/exceptional-anomaly/raw-status precedence
 * preserved exactly).
 */
function renderThuocStatusBadge(item: InventoryItem, anomalies: InventoryAnomaly[]) {
  const activeAnomalies = anomalies.filter((anomaly) => !anomaly.acknowledged);
  const itemAnomalies = activeAnomalies.filter((anomaly) =>
    anomalyMatchesInventoryItem(anomaly, item),
  );
  const derivedStatus = getDerivedPharmacyInventoryStatus(item, itemAnomalies);

  if (derivedStatus === "out_of_stock") {
    return <StatusBadge status="danger" label={THUOC_STATUS_LABELS.outOfStock} />;
  }

  if (derivedStatus === "low_stock") {
    return <StatusBadge status="warn" label={THUOC_STATUS_LABELS.lowStock} />;
  }

  if (hasPharmacyExceptionalAnomaly(itemAnomalies)) {
    return <StatusBadge status="info" label={THUOC_STATUS_LABELS.anomaly} />;
  }

  switch (item.status) {
    case "in_stock":
      return <StatusBadge status="ok" label={THUOC_STATUS_LABELS.normal} />;
    case "low_stock":
      return <StatusBadge status="warn" label={THUOC_STATUS_LABELS.lowStock} />;
    case "out_of_stock":
      return <StatusBadge status="danger" label={THUOC_STATUS_LABELS.outOfStock} />;
    default:
      return null;
  }
}

/** Vật tư status badge — raw `item.status`, matching the inventory-page inline map. */
function renderVatTuStatusBadge(item: InventoryItem) {
  const kind = VAT_TU_STATUS_KIND[item.status];
  const label = VAT_TU_STATUS_LABELS[item.status];
  if (!kind || !label) {
    return null;
  }
  return <StatusBadge status={kind} label={label} />;
}

/** Thuốc list columns: Mã / Tên / Kho / ĐVT / Lô SX / HSD / Trạng thái / Tồn / Đơn giá / Giá trị. */
export function buildThuocInventoryColumns(
  anomalies: InventoryAnomaly[],
): DataTableColumn<InventoryItem>[] {
  return [
    {
      key: "sku",
      header: "Mã thuốc",
      cell: (item) => <span className="text-ink-600">{item.sku}</span>,
    },
    {
      key: "name",
      header: "Tên thuốc",
      sortKey: "name",
      cell: (item) => <span className="font-medium text-ink-900">{item.name}</span>,
    },
    {
      key: "warehouse",
      header: "Kho",
      cellClassName: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
      cell: (item) => <span className="text-ink-600">{item.warehouse}</span>,
    },
    {
      key: "unit",
      header: "ĐVT",
      align: "right",
      cell: (item) => <span className="text-ink-600">{item.unit}</span>,
    },
    {
      key: "batchNumber",
      header: "Lô SX",
      cellClassName: "hidden lg:table-cell",
      headerClassName: "hidden lg:table-cell",
      cell: (item) => <span>{item.batchNumber || "-"}</span>,
    },
    {
      key: "expiryDate",
      header: "HSD",
      cellClassName: "hidden lg:table-cell",
      headerClassName: "hidden lg:table-cell",
      cell: (item) => (
        <span>{item.expiryDate ? format(new Date(item.expiryDate), "dd/MM/yyyy") : "-"}</span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      align: "center",
      cell: (item) => renderThuocStatusBadge(item, anomalies),
    },
    {
      key: "stock",
      header: "Tồn kho",
      align: "right",
      sortKey: "stock",
      cell: (item) => <span className="font-medium text-ink-900">{item.currentStock}</span>,
    },
    {
      key: "unitPrice",
      header: "Đơn giá",
      align: "right",
      cellClassName: "hidden sm:table-cell",
      headerClassName: "hidden sm:table-cell",
      cell: (item) => <span className="text-ink-600">{formatVND(item.unitPrice || 0)}</span>,
    },
    {
      key: "value",
      header: "Giá trị",
      align: "right",
      sortKey: "value",
      cellClassName: "hidden sm:table-cell",
      headerClassName: "hidden sm:table-cell",
      cell: (item) => (
        <span className="font-semibold text-brand-600">
          {formatVND(item.currentStock * (item.unitPrice || 0))}
        </span>
      ),
    },
  ];
}

/** Vật tư list columns: Tên / Loại / Tồn / Đơn giá / Giá trị / Kho / TT (raw status). */
export function buildVatTuInventoryColumns(): DataTableColumn<InventoryItem>[] {
  return [
    {
      key: "name",
      header: "Tên vật tư",
      sortKey: "name",
      cell: (item) => (
        <div>
          <div className="font-medium text-ink-900">{item.name}</div>
          <div className="text-[12px] text-ink-400">{item.sku}</div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Loại",
      cellClassName: "hidden sm:table-cell",
      headerClassName: "hidden sm:table-cell",
      cell: (item) => <span className="text-ink-600">{item.category}</span>,
    },
    {
      key: "stock",
      header: "Tồn kho",
      align: "right",
      sortKey: "stock",
      cell: (item) => (
        <div>
          <div className="font-medium text-ink-900">{item.currentStock}</div>
          <div className="text-[12px] text-ink-400">{item.unit}</div>
        </div>
      ),
    },
    {
      key: "unitPrice",
      header: "Đơn giá",
      align: "right",
      cellClassName: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
      cell: (item) => <span className="text-ink-600">{formatVND(item.unitPrice || 0)}</span>,
    },
    {
      key: "value",
      header: "Giá trị",
      align: "right",
      sortKey: "value",
      cellClassName: "hidden lg:table-cell",
      headerClassName: "hidden lg:table-cell",
      cell: (item) => (
        <span className="font-medium text-ink-900">
          {formatCompact(item.currentStock * (item.unitPrice || 0))}
        </span>
      ),
    },
    {
      key: "warehouse",
      header: "Kho",
      cellClassName: "hidden lg:table-cell",
      headerClassName: "hidden lg:table-cell",
      cell: (item) => <span className="text-ink-600">{item.warehouse}</span>,
    },
    {
      key: "status",
      header: "TT",
      align: "center",
      cell: (item) => renderVatTuStatusBadge(item),
    },
  ];
}
