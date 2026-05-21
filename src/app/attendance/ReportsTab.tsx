/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useAttendanceReports } from '@/viewmodels/attendance/useAttendanceReports';
import {
  getAttendanceStatusColor,
  getAttendanceStatusLabel,
} from '@/viewmodels/attendance/shared';
import { useAuth } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/access';

function formatTime(value: string | null): string {
  if (!value) return '--:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value: string): string {
  if (!value) return '';
  const [y, m, d] = value.split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export default function ReportsTab() {
  const { user } = useAuth();
  const canExport = user ? can(user.role, 'attendance.export') : false;
  const {
    filters,
    setFilters,
    setReportType,
    records,
    isLoading,
    isExporting,
    error,
    refresh,
    exportXlsx,
  } = useAttendanceReports();

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {(['daily', 'monthly', 'employee'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setReportType(type)}
                className={`px-3 py-1.5 text-sm rounded-md transition ${
                  filters.type === type
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                {type === 'daily' && 'Theo ngày'}
                {type === 'monthly' && 'Theo tháng'}
                {type === 'employee' && 'Theo nhân viên'}
              </button>
            ))}
          </div>

          {filters.type === 'daily' && (
            <input
              type="date"
              value={filters.date ?? ''}
              onChange={(e) =>
                setFilters({ ...filters, date: e.target.value })
              }
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            />
          )}

          {filters.type === 'monthly' && (
            <div className="flex items-center gap-2">
              <select
                value={filters.month ?? 1}
                onChange={(e) =>
                  setFilters({ ...filters, month: Number(e.target.value) })
                }
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Tháng {i + 1}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={filters.year ?? new Date().getFullYear()}
                onChange={(e) =>
                  setFilters({ ...filters, year: Number(e.target.value) })
                }
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-24"
              />
            </div>
          )}

          {filters.type === 'employee' && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Mã NV"
                value={filters.employeeNo ?? ''}
                onChange={(e) =>
                  setFilters({ ...filters, employeeNo: e.target.value })
                }
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-28"
              />
              <input
                type="date"
                value={filters.startDate ?? ''}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              />
              <span className="text-gray-400 text-sm">—</span>
              <input
                type="date"
                value={filters.endDate ?? ''}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Tải lại
          </button>
          {canExport && (
            <button
              type="button"
              onClick={() => void exportXlsx()}
              disabled={isExporting || records.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Ngày</th>
              <th className="text-left px-4 py-2 font-medium">Nhân viên</th>
              <th className="text-left px-4 py-2 font-medium">Phòng ban</th>
              <th className="text-left px-4 py-2 font-medium">Vào</th>
              <th className="text-left px-4 py-2 font-medium">Ra</th>
              <th className="text-right px-4 py-2 font-medium">Muộn</th>
              <th className="text-right px-4 py-2 font-medium">Giờ làm</th>
              <th className="text-left px-4 py-2 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && records.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  Đang tải...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  Không có dữ liệu.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-700">
                    {formatDate(r.date)}
                  </td>
                  <td className="px-4 py-2 text-gray-800">
                    {r.name ?? r.employeeNo ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {r.department ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {formatTime(r.checkIn)}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {formatTime(r.checkOut)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.lateMinutes > 0 ? `${r.lateMinutes}p` : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.hoursWorked.toFixed(1)}h
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${getAttendanceStatusColor(r.status)}`}
                    >
                      {getAttendanceStatusLabel(r.status)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
