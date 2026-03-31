/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';
import {
  MAINTENANCE_SEVERITY_CLASSNAMES,
  MAINTENANCE_SEVERITY_LABELS,
  MAINTENANCE_STATUS_CLASSNAMES,
  MAINTENANCE_STATUS_LABELS,
  ROOM_FLOORS,
  getRoomById,
} from '@/lib/room-management/catalog';
import { getNextMaintenanceStatuses } from '@/lib/room-management/maintenance';
import { cn, formatTimeAgo } from '@/lib/utils';
import type {
  MaintenanceBoardColumn,
  MaintenanceFilters,
  MaintenanceStatus,
  RoomMaintenanceReport,
} from '@/types/roomManagement';

interface MaintenanceBoardProps {
  columns: MaintenanceBoardColumn[];
  filters: MaintenanceFilters;
  onFiltersChange: (next: MaintenanceFilters) => void;
  onUpdateStatus: (reportId: string, status: MaintenanceStatus) => void;
}

function MaintenanceCard({
  report,
  onUpdateStatus,
}: {
  report: RoomMaintenanceReport;
  onUpdateStatus: (reportId: string, status: MaintenanceStatus) => void;
}) {
  const room = getRoomById(report.roomId);
  const nextStatuses = getNextMaintenanceStatuses(report.status);

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
            {room?.code ?? report.roomId}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-gray-900">{report.title}</h3>
          <p className="mt-1 text-sm text-gray-500">{room?.name ?? 'Phòng không xác định'}</p>
        </div>
        <span
          className={cn(
            'rounded-full border px-2 py-1 text-xs font-medium',
            MAINTENANCE_SEVERITY_CLASSNAMES[report.severity],
          )}
        >
          {MAINTENANCE_SEVERITY_LABELS[report.severity]}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-gray-600">{report.description}</p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
        <span>Người báo: {report.reportedBy}</span>
        <span>Cập nhật {formatTimeAgo(report.updatedAt)}</span>
      </div>

      {nextStatuses.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {nextStatuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onUpdateStatus(report.id, status)}
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Chuyển sang {MAINTENANCE_STATUS_LABELS[status].toLowerCase()}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs font-medium text-gray-400">Không còn bước chuyển trạng thái nào.</p>
      )}
    </article>
  );
}

export function MaintenanceBoard({
  columns,
  filters,
  onFiltersChange,
  onUpdateStatus,
}: MaintenanceBoardProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-indigo-600">Room Management</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Hàng chờ bảo trì</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Theo dõi tất cả báo cáo sự cố nội bộ phát sinh từ bản đồ phòng trong phiên làm việc hiện tại.
            </p>
          </div>
          <Link
            to="/room-management"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Quay lại sơ đồ phòng
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-gray-700">Lọc theo tầng</span>
            <select
              value={filters.floor}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  floor: event.target.value === 'all' ? 'all' : Number(event.target.value) as 1 | 2 | 3,
                })
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">Tất cả các tầng</option>
              {ROOM_FLOORS.map((floor) => (
                <option key={floor.id} value={floor.floor}>
                  {floor.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-gray-700">Lọc theo trạng thái</span>
            <select
              value={filters.status}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  status: event.target.value as MaintenanceFilters['status'],
                })
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(MAINTENANCE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-gray-700">Lọc theo mức độ</span>
            <select
              value={filters.severity}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  severity: event.target.value as MaintenanceFilters['severity'],
                })
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">Tất cả mức độ</option>
              {Object.entries(MAINTENANCE_SEVERITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="overflow-x-auto rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid min-w-[1080px] grid-cols-6 gap-4">
          {columns.map((column) => (
            <div key={column.status} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'rounded-full border px-2 py-1 text-xs font-medium',
                    MAINTENANCE_STATUS_CLASSNAMES[column.status],
                  )}
                >
                  {column.label}
                </span>
                <span className="text-xs font-semibold text-gray-500">{column.reports.length}</span>
              </div>

              <div className="mt-3 space-y-3">
                {column.reports.length > 0 ? (
                  column.reports.map((report) => (
                    <MaintenanceCard key={report.id} report={report} onUpdateStatus={onUpdateStatus} />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
                    Không có báo cáo nào trong cột này.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
