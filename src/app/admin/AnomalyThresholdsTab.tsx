/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { useAnomalyThresholds, type AnomalyThresholdRow } from "@/viewmodels/useAnomalyThresholds";
import type { AnomalyRule, AnomalyModuleType } from "@/types/inventory";

const RULE_LABELS: Record<AnomalyRule, string> = {
  near_expiry: "Sắp hết hạn",
  expired: "Đã hết hạn",
  zero_stock: "Hết hàng đột ngột",
  low_stock: "Tồn kho thấp",
  stock_spike: "Xuất kho đột biến",
};

const MODULE_LABELS: Record<AnomalyModuleType, string> = {
  pharmacy: "Khối Dược phẩm",
  supply: "Khối Vật tư",
};

function ThresholdInput({
  label,
  value,
  suffix,
  onChange,
  disabled,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  onChange: (v: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 whitespace-nowrap">{label}</span>
      <input
        type="number"
        className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        disabled={disabled}
      />
      {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
    </div>
  );
}

function ThresholdFields({
  row,
  onSave,
  isSaving,
}: {
  row: AnomalyThresholdRow;
  onSave: (id: string, updates: Record<string, number | boolean | null>) => void;
  isSaving: boolean;
}) {
  const [local, setLocal] = useState<Record<string, number | null>>({});
  const disabled = !row.enabled;

  const getValue = (key: string, original: number | null) =>
    key in local ? local[key] : original;

  const setField = (key: string, value: number | null) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const hasChanges = Object.keys(local).length > 0;

  const handleSave = () => {
    onSave(row.id, local);
    setLocal({});
  };

  if (row.ruleId === "expired" || row.ruleId === "zero_stock") {
    return <span className="text-xs text-gray-400 italic">Không có ngưỡng cấu hình</span>;
  }

  if (row.ruleId === "near_expiry") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <ThresholdInput
          label="Cảnh báo"
          value={getValue("nearExpiryDays", row.nearExpiryDays)}
          suffix="ngày"
          onChange={(v) => setField("nearExpiryDays", v)}
          disabled={disabled}
        />
        <ThresholdInput
          label="Mức cao"
          value={getValue("nearExpiryHighDays", row.nearExpiryHighDays)}
          suffix="ngày"
          onChange={(v) => setField("nearExpiryHighDays", v)}
          disabled={disabled}
        />
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Lưu"}
          </button>
        )}
      </div>
    );
  }

  if (row.ruleId === "low_stock") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <ThresholdInput
          label="Dự trữ"
          value={getValue("lowStockDays", row.lowStockDays)}
          suffix="ngày"
          onChange={(v) => setField("lowStockDays", v)}
          disabled={disabled}
        />
        <ThresholdInput
          label="Mức cao"
          value={getValue("lowStockHighDays", row.lowStockHighDays)}
          suffix="ngày"
          onChange={(v) => setField("lowStockHighDays", v)}
          disabled={disabled}
        />
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Lưu"}
          </button>
        )}
      </div>
    );
  }

  if (row.ruleId === "stock_spike") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <ThresholdInput
          label="Hệ số"
          value={getValue("spikeMultiplier", row.spikeMultiplier)}
          suffix="×"
          onChange={(v) => setField("spikeMultiplier", v)}
          disabled={disabled}
        />
        <ThresholdInput
          label="SL tối thiểu"
          value={getValue("spikeMinUsage", row.spikeMinUsage)}
          onChange={(v) => setField("spikeMinUsage", v)}
          disabled={disabled}
        />
        <ThresholdInput
          label="TB tối thiểu"
          value={getValue("spikeMinAvgUsage", row.spikeMinAvgUsage)}
          suffix="/ngày"
          onChange={(v) => setField("spikeMinAvgUsage", v)}
          disabled={disabled}
        />
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Lưu"}
          </button>
        )}
      </div>
    );
  }

  return null;
}

function ModuleSection({
  moduleType,
  rows,
  onToggle,
  onSave,
  isSaving,
}: {
  moduleType: AnomalyModuleType;
  rows: AnomalyThresholdRow[];
  onToggle: (id: string, enabled: boolean) => void;
  onSave: (id: string, updates: Record<string, number | boolean | null>) => void;
  isSaving: boolean;
}) {
  const defaultRows = rows.filter((r) => r.category === "__default__");
  const overrideRows = rows.filter((r) => r.category !== "__default__");

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">{MODULE_LABELS[moduleType]}</h3>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Loại cảnh báo</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Danh mục</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Ngưỡng</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-600 w-20">Bật/Tắt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {defaultRows.map((row) => (
              <tr key={row.id} className={row.enabled ? "" : "opacity-50"}>
                <td className="px-4 py-3 font-medium text-gray-900">{RULE_LABELS[row.ruleId]}</td>
                <td className="px-4 py-3 text-gray-500">Mặc định</td>
                <td className="px-4 py-3">
                  <ThresholdFields row={row} onSave={onSave} isSaving={isSaving} />
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onToggle(row.id, !row.enabled)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      row.enabled ? "bg-indigo-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        row.enabled ? "translate-x-4.5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </td>
              </tr>
            ))}
            {overrideRows.map((row) => (
              <tr key={row.id} className={`bg-amber-50/50 ${row.enabled ? "" : "opacity-50"}`}>
                <td className="px-4 py-3 font-medium text-gray-900">{RULE_LABELS[row.ruleId]}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-md border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                    {row.category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ThresholdFields row={row} onSave={onSave} isSaving={isSaving} />
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onToggle(row.id, !row.enabled)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      row.enabled ? "bg-indigo-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        row.enabled ? "translate-x-4.5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AnomalyThresholdsTab() {
  const {
    thresholds,
    isLoading,
    isSaving,
    error,
    saveMessage,
    setSaveMessage,
    toggleRule,
    updateThreshold,
  } = useAnomalyThresholds();

  const pharmacyRows = thresholds.filter((t) => t.moduleType === "pharmacy");
  const supplyRows = thresholds.filter((t) => t.moduleType === "supply");

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-gray-900">Cấu hình ngưỡng cảnh báo tồn kho</h2>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Thiết lập ngưỡng phát hiện bất thường cho từng loại kho. Bridge đọc cấu hình này mỗi khi chạy phân tích (6h sáng hàng ngày).
        </p>
      </div>

      {saveMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          <Check className="h-4 w-4" />
          {saveMessage}
          <button
            onClick={() => setSaveMessage(null)}
            className="ml-auto text-emerald-500 hover:text-emerald-700"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-8">
          <ModuleSection
            moduleType="pharmacy"
            rows={pharmacyRows}
            onToggle={toggleRule}
            onSave={updateThreshold}
            isSaving={isSaving}
          />
          <ModuleSection
            moduleType="supply"
            rows={supplyRows}
            onToggle={toggleRule}
            onSave={updateThreshold}
            isSaving={isSaving}
          />
        </div>
      )}
    </div>
  );
}
