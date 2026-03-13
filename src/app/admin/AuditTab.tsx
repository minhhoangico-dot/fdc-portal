import React from "react";
import { Download, Search } from "lucide-react";

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  details: string;
  timestamp: string;
}

interface AuditTabProps {
  auditLogs: AuditLog[];
  users: { id: string; name: string }[];
  search: string;
  onSearchChange: (value: string) => void;
  onExportCsv: () => void;
}

import { format, parseISO } from "date-fns";

export function AuditTab({
  auditLogs,
  users,
  search,
  onSearchChange,
  onExportCsv,
}: AuditTabProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm nhật ký..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border-transparent rounded-lg text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <button
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          onClick={onExportCsv}
        >
          <Download className="w-4 h-4" />
          Xuất CSV
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thời gian
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Người dùng
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hành động
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Đối tượng
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Chi tiết
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {auditLogs.map((log) => {
              const user = users.find((u) => u.id === log.userId);
              return (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {log.timestamp
                      ? format(parseISO(log.timestamp), "HH:mm:ss dd/MM/yyyy")
                      : "---"}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {user?.name || log.userId}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                        log.action === "CREATE"
                          ? "bg-emerald-100 text-emerald-700"
                          : log.action === "UPDATE"
                          ? "bg-blue-100 text-blue-700"
                          : log.action === "DELETE"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {log.entity}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {log.details}
                  </td>
                </tr>
              );
            })}
            {auditLogs.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  Không tìm thấy nhật ký nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

