/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { Calculator, DollarSign, Package, X } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { formatVND } from "@/lib/utils";
import { DataTable, type DataTableColumn } from "@/ui/DataTable";
import { KpiCard } from "@/ui/KpiCard";
import { WidgetCard } from "@/ui/WidgetCard";
import type { InventoryItem } from "@/types/inventory";

/**
 * KhoValuationView — re-skin of `app/valuation/page.tsx` presentation onto
 * KPI tiles + `ui/DataTable` + estimate/import-history drawer (Phase 3 spec
 * §5, "Giá trị" sub-tab).
 *
 * PRESENTATION ONLY. Consumes the ACTIVE frozen viewmodel
 * (`usePharmacyInventory` / `useSupplyInventory`) via `vm`, passed in by the
 * caller (`KhoWorkspace`) — same fields (`filteredInventory`,
 * `filterWarehouse`, `setFilterWarehouse`, `uniqueWarehouses`), same shape,
 * zero change to what is fetched or computed upstream. The
 * `itemsWithValue` / `totalFilteredValue` / `valueByWarehouse` derivations
 * below are the identical pure presentation compute from the legacy
 * valuation page — not viewmodel logic — reproduced verbatim so the numbers
 * are provably unchanged. The Thuốc-only import-history fetch is a
 * byte-for-byte copy of the inline `fdc_medicine_imports` query at
 * `app/valuation/page.tsx:52-79`.
 */

export interface KhoValuationVm {
  filteredInventory: InventoryItem[];
  filterWarehouse: string;
  setFilterWarehouse: (warehouse: string) => void;
  uniqueWarehouses: string[];
}

export interface KhoValuationViewProps {
  /** The single ACTIVE viewmodel (pharmacy or supply) — enabled-dual-hook §4. */
  vm: KhoValuationVm;
  /** Which warehouse is active; gates the Thuốc-only import-history drawer. */
  warehouse: "thuoc" | "vat-tu";
}

interface ValuationItem extends InventoryItem {
  price: number;
  totalValue: number;
}

export function KhoValuationView({ vm, warehouse }: KhoValuationViewProps) {
  const { filteredInventory, filterWarehouse, setFilterWarehouse, uniqueWarehouses } = vm;

  const [selectedItem, setSelectedItem] = useState<ValuationItem | null>(null);
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  React.useEffect(() => {
    setSelectedItem(null);
    setImportHistory([]);
  }, [warehouse]);

  // Verbatim copy of app/valuation/page.tsx:52-79 (Thuốc-only import history).
  React.useEffect(() => {
    const fetchHistory = async () => {
      if (warehouse !== "thuoc" || !selectedItem?.medicineCode) {
        setImportHistory([]);
        return;
      }

      setIsFetchingHistory(true);
      try {
        const { data, error } = await supabase
          .from("fdc_medicine_imports")
          .select("*")
          .eq("medicine_code", selectedItem.medicineCode)
          .order("import_date", { ascending: false })
          .limit(10);

        if (error) {
          console.error("[valuation] fetchHistory error:", error);
        }

        setImportHistory(data || []);
      } finally {
        setIsFetchingHistory(false);
      }
    };

    fetchHistory();
  }, [warehouse, selectedItem]);

  // Identical pure presentation compute to app/valuation/page.tsx:81-106.
  const itemsWithValue = useMemo<ValuationItem[]>(() => {
    return filteredInventory
      .map((item) => {
        const price = item.unitPrice || 0;
        const totalValue = item.currentStock * price;

        return {
          ...item,
          price,
          totalValue,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredInventory]);

  const totalFilteredValue = useMemo(() => {
    return itemsWithValue.reduce((sum, item) => sum + item.totalValue, 0);
  }, [itemsWithValue]);

  const valueByWarehouse = useMemo(() => {
    const breakdown: Record<string, number> = {};
    itemsWithValue.forEach((item) => {
      breakdown[item.warehouse] = (breakdown[item.warehouse] || 0) + item.totalValue;
    });
    return Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  }, [itemsWithValue]);

  const showWarehouseBreakdown = filterWarehouse === "all" && valueByWarehouse.length > 0;
  const supportsImportHistory = warehouse === "thuoc";

  const columns: DataTableColumn<ValuationItem>[] = [
    {
      key: "sku",
      header: "Mã hàng",
      cell: (item) => <span className="text-ink-600">{item.sku}</span>,
    },
    {
      key: "name",
      header: "Tên hàng",
      cell: (item) => <span className="font-medium text-ink-900">{item.name}</span>,
    },
    {
      key: "warehouse",
      header: "Kho",
      cell: (item) => <span className="text-ink-600">{item.warehouse}</span>,
      cellClassName: "hidden sm:table-cell",
      headerClassName: "hidden sm:table-cell",
    },
    {
      key: "stock",
      header: "Tồn kho",
      align: "right",
      cell: (item) => (
        <>
          <span className="font-medium text-ink-900">{item.currentStock}</span>{" "}
          <span className="text-xs font-normal text-ink-400">{item.unit}</span>
        </>
      ),
    },
    {
      key: "price",
      header: "Đơn giá ước tính",
      align: "right",
      cell: (item) => <span className="text-ink-600">{formatVND(item.price)}</span>,
    },
    {
      key: "totalValue",
      header: "Thành tiền",
      align: "right",
      cell: (item) => (
        <span className="font-semibold text-brand-600">{formatVND(item.totalValue)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-[600] text-ink-900">Chi tiết giá trị tồn kho</h2>
          <p className="text-[13px] text-ink-600 mt-1">
            Bảng tính ước lượng giá trị của các mặt hàng hiện có trong kho
          </p>
        </div>

        <select
          value={filterWarehouse}
          onChange={(event) => setFilterWarehouse(event.target.value)}
          className="px-4 py-2 bg-card border border-line rounded-card text-sm font-medium text-ink-900 shadow-card focus:outline-none focus:ring-2 focus:ring-brand-600 min-w-[200px]"
        >
          <option value="all">Tất cả kho</option>
          {uniqueWarehouses.map((wh) => (
            <option key={wh} value={wh}>
              {wh}
            </option>
          ))}
        </select>
      </div>

      <div
        className={`grid grid-cols-1 ${
          showWarehouseBreakdown ? "lg:grid-cols-3" : "md:grid-cols-2"
        } gap-4`}
      >
        <KpiCard
          label="Tổng giá trị (hiện tại)"
          value={formatVND(totalFilteredValue)}
          icon={<DollarSign className="w-6 h-6" />}
        />

        <KpiCard
          label="Số lượng mã hàng"
          value={`${itemsWithValue.filter((item) => item.currentStock > 0).length} mã`}
          icon={<Package className="w-6 h-6" />}
        />

        {showWarehouseBreakdown && (
          <WidgetCard title="Giá trị theo từng kho" className="lg:col-span-1 md:col-span-2">
            <div className="space-y-3 max-h-[120px] overflow-y-auto pr-2">
              {valueByWarehouse.map(([wh, value]) => (
                <div key={wh} className="flex justify-between items-center px-1">
                  <span className="font-medium text-ink-600 text-sm truncate mr-2" title={wh}>
                    {wh}
                  </span>
                  <span className="font-bold text-brand-600 text-sm shrink-0">
                    {formatVND(value)}
                  </span>
                </div>
              ))}
            </div>
          </WidgetCard>
        )}
      </div>

      <div className="flex relative">
        <div className="flex-1 min-w-0">
          <DataTable
            columns={columns}
            rows={itemsWithValue}
            rowKey={(item) => item.id}
            onRowClick={(item) => setSelectedItem(item)}
            isRowActive={(item) => selectedItem?.id === item.id}
            emptyLabel="Không có dữ liệu tồn kho."
          />
        </div>

        {selectedItem && (
          <div
            className="fixed inset-0 bg-ink-900/50 z-40 sm:hidden"
            onClick={() => setSelectedItem(null)}
          />
        )}

        {selectedItem && (
          <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-card shadow-2xl border-l border-line transform transition-transform duration-300 z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-ink-900">Chi tiết mã hàng</h2>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 text-ink-400 hover:text-ink-900 hover:bg-paper rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-ink-900">{selectedItem.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-ink-600">
                    <span className="bg-paper px-2 py-0.5 rounded-md text-ink-900 font-medium">
                      {selectedItem.sku}
                    </span>
                    <span>•</span>
                    <span>{selectedItem.warehouse}</span>
                    <span>•</span>
                    <span>{selectedItem.category}</span>
                  </div>
                </div>

                <div className="bg-paper rounded-card p-5 border border-line space-y-4">
                  <h4 className="flex items-center gap-2 font-medium text-ink-900 border-b border-line pb-2">
                    <Calculator className="w-4 h-4 text-brand-600" />
                    Chi tiết ước tính thành tiền
                  </h4>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-ink-600">Đơn giá tham khảo</span>
                    <span className="font-semibold text-ink-900">
                      {formatVND(selectedItem.price)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-ink-600 border-b border-line border-dashed pb-1">
                      Số lượng tồn kho
                    </span>
                    <span className="font-semibold text-ink-900 border-b border-line border-dashed pb-1">
                      x {selectedItem.currentStock} {selectedItem.unit}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-base pt-2">
                    <span className="font-medium text-ink-900">Thành tiền ước tính</span>
                    <span className="font-bold text-brand-600 text-lg">
                      {formatVND(selectedItem.totalValue)}
                    </span>
                  </div>
                </div>

                {supportsImportHistory && selectedItem.medicineCode && (
                  <div className="space-y-4 pt-4 border-t border-line">
                    <h3 className="font-semibold text-ink-900">Lịch sử nhập kho (tham khảo)</h3>

                    {isFetchingHistory ? (
                      <div className="text-sm text-ink-600 text-center py-4">
                        Đang tải lịch sử...
                      </div>
                    ) : importHistory.length > 0 ? (
                      <div className="space-y-3">
                        {importHistory.map((hist) => (
                          <div
                            key={hist.id}
                            className="bg-card border text-sm border-line rounded-card p-4 shadow-card relative overflow-hidden group"
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-600 rounded-l-card opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-medium text-ink-900">
                                {hist.import_date
                                  ? format(new Date(hist.import_date), "dd/MM/yyyy HH:mm")
                                  : "N/A"}
                              </div>
                              <div className="font-semibold text-brand-600">
                                {formatVND(hist.unit_price)}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-ink-600">
                              <div>
                                <span className="block text-ink-400">Số lượng nhập</span>
                                <span className="font-medium text-ink-900">
                                  {hist.quantity} {selectedItem.unit}
                                </span>
                              </div>
                              <div>
                                <span className="block text-ink-400">Lô / Date</span>
                                <span className="font-medium text-ink-900">
                                  {hist.batch_number || "N/A"}
                                </span>
                              </div>
                              {hist.supplier_name && (
                                <div className="col-span-2 mt-1">
                                  <span className="block text-ink-400">Nhà cung cấp</span>
                                  <span
                                    className="font-medium text-ink-900 truncate block"
                                    title={hist.supplier_name}
                                  >
                                    {hist.supplier_name}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-ink-600 text-center py-4 bg-paper rounded-card border border-dashed border-line">
                        Không có dữ liệu lịch sử nhập hàng trong 1 năm qua.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default KhoValuationView;
