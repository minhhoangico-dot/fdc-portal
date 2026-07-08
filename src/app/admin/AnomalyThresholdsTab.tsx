/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { useAnomalyThresholds, type AnomalyThresholdRow } from "@/viewmodels/useAnomalyThresholds";
import { PageHeader } from "@/ui/PageHeader";
import { WidgetCard } from "@/ui/WidgetCard";
import { StatusBadge } from "@/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "@/ui/DataTable";
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
      <span className="text-xs text-ink-600 whitespace-nowrap">{label}</span>
      <input
        type="number"
        className="w-20 rounded-field border border-line bg-card px-2 py-1 text-sm text-ink-900 [font-variant-numeric:tabular-nums] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-paper disabled:text-ink-400"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        disabled={disabled}
      />
      {suffix && <span className="text-xs text-ink-400">{suffix}</span>}
    </div>
  );
}

function SaveButton({ isSaving, onSave }: { isSaving: boolean; onSave: () => void }) {
  return (
    <button
      onClick={onSave}
      disabled={isSaving}
      className="rounded-field bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
    >
      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Lưu"}
    </button>
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
    return <span className="text-xs text-ink-400 italic">Không có ngưỡng cấu hình</span>;
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
        {hasChanges && <SaveButton isSaving={isSaving} onSave={handleSave} />}
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
        {hasChanges && <SaveButton isSaving={isSaving} onSave={handleSave} />}
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
        {hasChanges && <SaveButton isSaving={isSaving} onSave={handleSave} />}
      </div>
    );
  }

  return null;
}

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        enabled ? "bg-brand-600" : "bg-ink-400"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card transition-transform ${
          enabled ? "translate-x-4.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
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
  const orderedRows = [...defaultRows, ...overrideRows];

  const dim = (enabled: boolean) => (enabled ? "" : "opacity-50");

  const columns: DataTableColumn<AnomalyThresholdRow>[] = [
    {
      key: "rule",
      header: "Loại cảnh báo",
      cell: (row) => (
        <span className={`font-medium text-ink-900 ${dim(row.enabled)}`}>
          {RULE_LABELS[row.ruleId]}
        </span>
      ),
    },
    {
      key: "category",
      header: "Danh mục",
      cell: (row) =>
        row.category === "__default__" ? (
          <span className={`text-ink-600 ${dim(row.enabled)}`}>Mặc định</span>
        ) : (
          <span className={dim(row.enabled)}>
            <StatusBadge status="warn" label={row.category} />
          </span>
        ),
    },
    {
      key: "threshold",
      header: "Ngưỡng",
      cell: (row) => <ThresholdFields row={row} onSave={onSave} isSaving={isSaving} />,
    },
    {
      key: "toggle",
      header: "Bật/Tắt",
      align: "center",
      headerClassName: "w-20",
      cell: (row) => (
        <ToggleSwitch enabled={row.enabled} onToggle={() => onToggle(row.id, !row.enabled)} />
      ),
    },
  ];

  return (
    <WidgetCard title={MODULE_LABELS[moduleType]}>
      <DataTable
        columns={columns}
        rows={orderedRows}
        rowKey={(row) => row.id}
        density="compact"
      />
    </WidgetCard>
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
      <PageHeader
        title="Cấu hình ngưỡng cảnh báo tồn kho"
        sub="Thiết lập ngưỡng phát hiện bất thường cho từng loại kho. Bridge đọc cấu hình này mỗi khi chạy phân tích (6h sáng hàng ngày)."
        actions={<AlertTriangle className="h-5 w-5 text-warn-600" />}
      />

      {saveMessage && (
        <div className="flex items-center gap-2 rounded-card border border-brand-100 bg-brand-50 px-4 py-2.5 text-sm text-brand-700">
          <Check className="h-4 w-4" />
          {saveMessage}
          <button
            onClick={() => setSaveMessage(null)}
            className="ml-auto text-brand-600 hover:text-brand-700"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-card border border-danger-600/20 bg-danger-600/10 px-4 py-2.5 text-sm text-danger-600">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-ink-400" />
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
