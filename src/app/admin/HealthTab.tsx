import React from "react";
import { format, parseISO } from "date-fns";
import { ArrowRight, Database, RefreshCw, Server, CheckCircle2, XCircle, RotateCw } from "lucide-react";
import { isBridgeHeartbeatStale } from "@/lib/bridge";
import { formatTimeAgo } from "@/lib/utils";
import { BridgeHealth, SyncRecord } from "@/types/sync";

interface HealthTabProps {
  bridgeHealth: BridgeHealth;
  syncHistory: SyncRecord[];
  onManualSync: (type: string) => void;
  isSyncing: boolean;
  refreshSyncData: () => void;
  syncMessage?: { type: 'success' | 'error'; text: string } | null;
  onDismissSyncMessage?: () => void;
}

function getSyncTypeLabel(type: string): string {
  const map: Record<string, string> = {
    HIS: 'HIS',
    MISA: 'MISA',
    timekeeping: 'Máy chấm công',
    inventory: 'Kho',
    patient: 'Bệnh nhân',
    invoice: 'Hóa đơn',
    attendance: 'Chấm công',
  };
  return map[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

export function HealthTab({
  bridgeHealth,
  syncHistory,
  onManualSync,
  isSyncing,
  refreshSyncData,
  syncMessage,
  onDismissSyncMessage,
}: HealthTabProps) {
  const isRefreshing = React.useRef(false);
  const hasHeartbeat = Boolean(bridgeHealth.lastHeartbeat);
  const heartbeatIsStale = isBridgeHeartbeatStale(bridgeHealth.lastHeartbeat);
  const showStaleHeartbeatWarning =
    bridgeHealth.status === "offline" && hasHeartbeat && heartbeatIsStale;
  const showMissingHeartbeatWarning =
    bridgeHealth.status === "offline" && !hasHeartbeat;

  const handleRefresh = () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    refreshSyncData();
    setTimeout(() => { isRefreshing.current = false; }, 1000);
  };

  return (
    <div className="p-6 space-y-6">
      {syncMessage && (
        <div className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm ${
          syncMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          <span>{syncMessage.text}</span>
          <button onClick={onDismissSyncMessage} className="ml-4 font-medium hover:underline">Đóng</button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-600" />
              LAN Bridge
            </h3>
            <span
              className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                bridgeHealth.status === "online"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {bridgeHealth.status}
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Kết nối HIS</span>
              {bridgeHealth.hisConnected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-500" />
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Kết nối MISA</span>
              {bridgeHealth.misaConnected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-500" />
              )}
            </div>
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Heartbeat cuối:</span>
              <span>
                {bridgeHealth.lastHeartbeat
                  ? formatTimeAgo(bridgeHealth.lastHeartbeat)
                  : bridgeHealth.status === "online"
                    ? "Đang kết nối..."
                    : "—"}
              </span>
            </div>
            {(showStaleHeartbeatWarning || showMissingHeartbeatWarning) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {showStaleHeartbeatWarning
                  ? `Máº¥t káº¿t ná»‘i vá»›i Bridge tá»« ${formatTimeAgo(bridgeHealth.lastHeartbeat)}`
                  : "ChÆ°a nháº­n Ä‘Æ°á»£c tÃ­n hiá»‡u tá»« Bridge"}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              Hàng đợi đồng bộ
            </h3>
          </div>
          <div className="flex flex-col items-center justify-center h-24">
            <div className="text-4xl font-bold text-gray-900">
              {bridgeHealth.queueDepth}
            </div>
            <div className="text-sm text-gray-500 mt-1">bản ghi đang chờ</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-indigo-600" />
            Đồng bộ thủ công
          </h3>
          {bridgeHealth.status !== "online" && (
            <p className="mb-3 text-xs text-amber-600">
              LAN Bridge đang offline. Vui lòng kiểm tra dịch vụ fdc-lan-bridge trong mạng nội bộ trước khi đồng bộ.
            </p>
          )}
          <div className="space-y-2">
            <button
              onClick={() => onManualSync("HIS")}
              disabled={isSyncing || bridgeHealth.status !== "online"}
              className={`w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors ${
                isSyncing || bridgeHealth.status !== "online"
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-indigo-50 hover:text-indigo-700"
              }`}
            >
              <span>Đồng bộ từ HIS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onManualSync("MISA")}
              disabled={isSyncing || bridgeHealth.status !== "online"}
              className={`w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors ${
                isSyncing || bridgeHealth.status !== "online"
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-indigo-50 hover:text-indigo-700"
              }`}
            >
              <span>Đồng bộ từ MISA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onManualSync("timekeeping")}
              disabled={isSyncing || bridgeHealth.status !== "online"}
              className={`w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors ${
                isSyncing || bridgeHealth.status !== "online"
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-indigo-50 hover:text-indigo-700"
              }`}
            >
              <span>Đồng bộ Máy chấm công</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">
            Lịch sử đồng bộ gần đây
          </h3>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <RotateCw className="w-4 h-4" />
            Làm mới
          </button>
        </div>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                  Số bản ghi
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian bắt đầu
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chi tiết lỗi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {syncHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    Chưa có lịch sử đồng bộ
                  </td>
                </tr>
              ) : (
                syncHistory.slice(0, 5).map((sync) => (
                  <tr key={sync.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {getSyncTypeLabel(sync.type)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                          sync.status === "success"
                            ? "bg-emerald-100 text-emerald-700"
                            : sync.status === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {sync.status === "success" ? "Thành công" : sync.status === "pending" ? "Đang xử lý" : "Thất bại"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {sync.recordsSynced}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {sync.startedAt
                        ? format(parseISO(sync.startedAt), "HH:mm:ss dd/MM/yyyy")
                        : "---"}
                    </td>
                    <td className="px-4 py-3 text-sm text-rose-600">
                      {sync.error || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

