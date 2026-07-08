/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { format, parseISO } from "date-fns";
import { ArrowRight, Database, RefreshCw, Server, CheckCircle2, XCircle, RotateCw } from "lucide-react";
import { isBridgeHeartbeatStale } from "@/lib/bridge";
import { formatTimeAgo } from "@/lib/utils";
import { BridgeHealth, SyncRecord } from "@/types/sync";
import { WidgetCard } from "@/ui/WidgetCard";
import { StatusBadge } from "@/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "@/ui/DataTable";
import type { StatusKind } from "@/ui/StatusBadge";

interface HealthTabProps {
  bridgeHealth: BridgeHealth;
  syncHistory: SyncRecord[];
  onManualSync: (type: string) => void;
  isSyncing: boolean;
  refreshSyncData: () => Promise<void>;
  syncMessage?: { type: 'success' | 'error'; text: string } | null;
  onDismissSyncMessage?: () => void;
}

function getSyncTypeLabel(type: string): string {
  const map: Record<string, string> = {
    HIS: "HIS",
    MISA: "MISA",
    timekeeping: "Máy chấm công",
    inventory: "Kho",
    patient: "Bệnh nhân",
    invoice: "Hóa đơn",
    attendance: "Chấm công",
    syncInventory: "Đồng bộ kho",
    syncMedicineImports: "Nhập thuốc",
    detectAnomalies: "Phát hiện bất thường",
  };
  return map[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

function formatSyncStatus(status: SyncRecord["status"]): string {
  return status === "success"
    ? "Thành công"
    : status === "pending"
      ? "Đang xử lý"
      : "Thất bại";
}

function syncStatusKind(status: SyncRecord["status"]): StatusKind {
  return status === "success" ? "ok" : status === "pending" ? "warn" : "danger";
}

function getDurationMs(record: SyncRecord): number | null {
  if (!record.startedAt || !record.completedAt) return null;
  const start = parseISO(record.startedAt).getTime();
  const end = parseISO(record.completedAt).getTime();
  return end - start;
}

const SYNC_BUTTON_CLASS =
  "w-full flex items-center justify-between px-3 py-2 bg-paper text-ink-600 rounded-field text-sm font-medium border border-line transition-colors";

export function HealthTab({
  bridgeHealth,
  syncHistory,
  onManualSync,
  isSyncing,
  refreshSyncData,
  syncMessage,
  onDismissSyncMessage,
}: HealthTabProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const isRefreshing = React.useRef(false);
  const hasHeartbeat = Boolean(bridgeHealth.lastHeartbeat);
  const heartbeatIsStale = isBridgeHeartbeatStale(bridgeHealth.lastHeartbeat);
  const showStaleHeartbeatWarning =
    bridgeHealth.status === "offline" && hasHeartbeat && heartbeatIsStale;
  const showMissingHeartbeatWarning =
    bridgeHealth.status === "offline" && !hasHeartbeat;

  const handleRefresh = async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    try {
      await refreshSyncData();
    } finally {
      isRefreshing.current = false;
    }
  };

  const recentSyncs = syncHistory.slice(0, 5);
  const expandedSync = recentSyncs.find((sync) => sync.id === expandedId) ?? null;
  const syncDisabled = isSyncing || bridgeHealth.status !== "online";

  const historyColumns: DataTableColumn<SyncRecord>[] = [
    {
      key: "type",
      header: "Loại",
      cell: (sync) => (
        <span className="font-medium text-ink-900">{getSyncTypeLabel(sync.type)}</span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      cell: (sync) => (
        <StatusBadge status={syncStatusKind(sync.status)} label={formatSyncStatus(sync.status)} />
      ),
    },
    {
      key: "records",
      header: "Số bản ghi",
      align: "right",
      cell: (sync) => <span className="text-ink-600">{sync.recordsSynced}</span>,
    },
    {
      key: "startedAt",
      header: "Thời gian bắt đầu",
      cell: (sync) => (
        <span className="text-ink-600">
          {sync.startedAt ? format(parseISO(sync.startedAt), "HH:mm:ss dd/MM/yyyy") : "---"}
        </span>
      ),
    },
    {
      key: "error",
      header: "Chi tiết lỗi",
      cell: (sync) => (
        <span className="text-danger-600">
          {sync.error ? `${sync.error.slice(0, 40)}${sync.error.length > 40 ? "…" : ""}` : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {syncMessage && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-card border text-sm ${
            syncMessage.type === "success"
              ? "bg-brand-50 text-brand-700 border-brand-100"
              : "bg-danger-600/10 text-danger-600 border-danger-600/20"
          }`}
        >
          <span>{syncMessage.text}</span>
          <button onClick={onDismissSyncMessage} className="ml-4 font-medium hover:underline">
            Đóng
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <WidgetCard
          title="LAN Bridge"
          actions={
            <StatusBadge
              status={bridgeHealth.status === "online" ? "ok" : "danger"}
              label={bridgeHealth.status}
              className="uppercase tracking-wide"
            />
          }
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-600">Kết nối HIS</span>
              {bridgeHealth.hisConnected ? (
                <CheckCircle2 className="w-4 h-4 text-ok-600" />
              ) : (
                <XCircle className="w-4 h-4 text-danger-600" />
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-600">Kết nối MISA</span>
              {bridgeHealth.misaConnected ? (
                <CheckCircle2 className="w-4 h-4 text-ok-600" />
              ) : (
                <XCircle className="w-4 h-4 text-danger-600" />
              )}
            </div>
            <div className="pt-3 border-t border-line flex items-center justify-between text-xs text-ink-600">
              <span>Heartbeat cuối:</span>
              <span className="[font-variant-numeric:tabular-nums]">
                {bridgeHealth.lastHeartbeat
                  ? formatTimeAgo(bridgeHealth.lastHeartbeat)
                  : bridgeHealth.status === "online"
                    ? "Đang kết nối..."
                    : "—"}
              </span>
            </div>
            {(showStaleHeartbeatWarning || showMissingHeartbeatWarning) && (
              <div className="rounded-field border border-warn-600/20 bg-warn-100/60 px-3 py-2 text-xs text-warn-600">
                {showStaleHeartbeatWarning
                  ? `Mất kết nối với Bridge từ ${formatTimeAgo(bridgeHealth.lastHeartbeat)}`
                  : "Chưa nhận được tín hiệu từ Bridge"}
              </div>
            )}
          </div>
        </WidgetCard>

        <WidgetCard
          title="Hàng đợi đồng bộ"
          actions={<Database className="w-4 h-4 text-brand-600" />}
        >
          <div className="flex flex-col items-center justify-center h-24">
            <div className="text-4xl font-bold text-ink-900 [font-variant-numeric:tabular-nums]">
              {bridgeHealth.queueDepth}
            </div>
            <div className="text-sm text-ink-600 mt-1">bản ghi đang chờ</div>
          </div>
        </WidgetCard>

        <WidgetCard
          title="Đồng bộ thủ công"
          actions={<RefreshCw className="w-4 h-4 text-brand-600" />}
        >
          {bridgeHealth.status !== "online" && (
            <p className="mb-3 text-xs text-warn-600">
              LAN Bridge đang offline. Vui lòng kiểm tra dịch vụ fdc-lan-bridge trong mạng nội bộ trước khi đồng bộ.
            </p>
          )}
          <div className="space-y-2">
            <button
              onClick={() => onManualSync("HIS")}
              disabled={syncDisabled}
              className={`${SYNC_BUTTON_CLASS} ${
                syncDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              <span>Đồng bộ từ HIS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onManualSync("MISA")}
              disabled={syncDisabled}
              className={`${SYNC_BUTTON_CLASS} ${
                syncDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              <span>Đồng bộ từ MISA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onManualSync("timekeeping")}
              disabled={syncDisabled}
              className={`${SYNC_BUTTON_CLASS} ${
                syncDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              <span>Đồng bộ Máy chấm công</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </WidgetCard>
      </div>

      <WidgetCard
        title="Lịch sử đồng bộ gần đây"
        actions={
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 px-2 py-1 text-sm text-ink-600 hover:text-brand-600 hover:bg-brand-50 rounded-field transition-colors"
          >
            <RotateCw className="w-4 h-4" />
            Làm mới
          </button>
        }
      >
        <div className="space-y-4">
          <DataTable<SyncRecord>
            columns={historyColumns}
            rows={recentSyncs}
            rowKey={(sync) => sync.id}
            onRowClick={(sync) => setExpandedId((id) => (id === sync.id ? null : sync.id))}
            isRowActive={(sync) => sync.id === expandedId}
            emptyLabel="Chưa có lịch sử đồng bộ"
          />

          {expandedSync && (
            <div className="rounded-card border border-line bg-paper px-4 py-4">
              <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-ink-600">Loại:</span> {getSyncTypeLabel(expandedSync.type)}
                </div>
                <div>
                  <span className="text-ink-600">Trạng thái:</span>{" "}
                  <StatusBadge
                    status={syncStatusKind(expandedSync.status)}
                    label={formatSyncStatus(expandedSync.status)}
                  />
                </div>
                <div>
                  <span className="text-ink-600">Số bản ghi:</span>{" "}
                  <span className="[font-variant-numeric:tabular-nums]">{expandedSync.recordsSynced}</span>
                </div>
                <div>
                  <span className="text-ink-600">Thời gian bắt đầu:</span>{" "}
                  {expandedSync.startedAt
                    ? format(parseISO(expandedSync.startedAt), "HH:mm:ss dd/MM/yyyy")
                    : "---"}
                </div>
                <div>
                  <span className="text-ink-600">Thời gian kết thúc:</span>{" "}
                  {expandedSync.completedAt
                    ? format(parseISO(expandedSync.completedAt), "HH:mm:ss dd/MM/yyyy")
                    : "---"}
                </div>
                <div>
                  <span className="text-ink-600">Thời lượng:</span>{" "}
                  {getDurationMs(expandedSync) != null
                    ? `${(getDurationMs(expandedSync)! / 1000).toFixed(1)}s`
                    : "---"}
                </div>
                {expandedSync.error && (
                  <div className="sm:col-span-2">
                    <span className="text-ink-600">Lỗi:</span>{" "}
                    <span className="text-danger-600">{expandedSync.error}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </WidgetCard>
    </div>
  );
}
