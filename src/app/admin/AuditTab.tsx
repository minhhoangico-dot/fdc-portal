/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Download, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { DataTable, type DataTableColumn } from "@/ui/DataTable";
import { StatusBadge, type StatusKind } from "@/ui/StatusBadge";

/**
 * AuditTab — reskin of the admin "Nhật ký" table onto `ui/DataTable` + brand
 * tokens (Phase 4a §4 "Quản trị" mapping row).
 *
 * Presentation only: consumes `useAdmin`'s props (`auditLogs`, `users`,
 * `search`, callbacks) verbatim; the `date-fns` timestamp formatting and the
 * `users.find` lookup are preserved exactly, just moved into a `DataTable`
 * cell renderer.
 */

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

const ACTION_STATUS: Record<string, StatusKind> = {
  CREATE: "ok",
  UPDATE: "info",
  DELETE: "danger",
};

export function AuditTab({
  auditLogs,
  users,
  search,
  onSearchChange,
  onExportCsv,
}: AuditTabProps) {
  const columns: DataTableColumn<AuditLog>[] = [
    {
      key: "timestamp",
      header: "Thời gian",
      cellClassName: "whitespace-nowrap text-ink-600",
      cell: (log) =>
        log.timestamp ? format(parseISO(log.timestamp), "HH:mm:ss dd/MM/yyyy") : "---",
    },
    {
      key: "user",
      header: "Người dùng",
      cell: (log) => {
        const user = users.find((u) => u.id === log.userId);
        return <span className="font-medium text-ink-900">{user?.name || log.userId}</span>;
      },
    },
    {
      key: "action",
      header: "Hành động",
      cell: (log) => (
        <StatusBadge status={ACTION_STATUS[log.action] ?? "neutral"} label={log.action} />
      ),
    },
    {
      key: "entity",
      header: "Đối tượng",
      cell: (log) => <span className="text-ink-600">{log.entity}</span>,
    },
    {
      key: "details",
      header: "Chi tiết",
      cell: (log) => <span className="text-ink-600">{log.details}</span>,
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col justify-between gap-4 border-b border-line p-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Tìm kiếm nhật ký..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-field border border-transparent bg-paper py-2 pl-9 pr-4 text-sm text-ink-900 focus:border-brand-600 focus:bg-card focus:outline-none focus:ring-2 focus:ring-brand-600/20"
          />
        </div>
        <button
          className="flex items-center justify-center gap-2 rounded-field border border-line bg-card px-4 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-paper"
          onClick={onExportCsv}
        >
          <Download className="h-4 w-4" />
          Xuất CSV
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <DataTable
          columns={columns}
          rows={auditLogs}
          rowKey={(log) => log.id}
          emptyLabel="Không tìm thấy nhật ký nào phù hợp."
        />
      </div>
    </div>
  );
}
