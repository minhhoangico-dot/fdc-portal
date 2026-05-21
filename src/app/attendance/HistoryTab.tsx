/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useAttendanceHistory } from '@/viewmodels/attendance/useAttendanceHistory';

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryTab() {
  const { filters, setFilters, events, isLoading, error, refresh } =
    useAttendanceHistory();

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="text-gray-600">Từ ngày</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters({ ...filters, startDate: e.target.value })
            }
            className="mt-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Đến ngày</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters({ ...filters, endDate: e.target.value })
            }
            className="mt-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Mã nhân viên</span>
          <input
            type="text"
            placeholder="(tuỳ chọn)"
            value={filters.employeeNo}
            onChange={(e) =>
              setFilters({ ...filters, employeeNo: e.target.value })
            }
            className="mt-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-36"
          />
        </label>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Tải lại
        </button>
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
              <th className="text-left px-4 py-2 font-medium">Thời điểm</th>
              <th className="text-left px-4 py-2 font-medium">Mã NV</th>
              <th className="text-left px-4 py-2 font-medium">Họ tên</th>
              <th className="text-left px-4 py-2 font-medium">Nguồn</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && events.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Đang tải...
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Không có sự kiện chấm công nào.
                </td>
              </tr>
            ) : (
              events.map((evt) => (
                <tr key={evt.eventId} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-700">
                    {formatDateTime(evt.checkTime)}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-600">
                    {evt.employeeNo}
                  </td>
                  <td className="px-4 py-2 text-gray-800">
                    {evt.employeeName ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">
                    {evt.source}
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
