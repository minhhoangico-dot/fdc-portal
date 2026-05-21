/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useAttendanceManager } from '@/viewmodels/attendance/useAttendanceManager';
import {
  getAttendanceStatusColor,
  getAttendanceStatusLabel,
} from '@/viewmodels/attendance/shared';

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
  return `${d}/${m}`;
}

export default function ManagerTab() {
  const { range, setRange, records, isLoading, error, refresh, scope } =
    useAttendanceManager();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setRange('today')}
            className={`px-3 py-1.5 text-sm rounded-md transition ${
              range === 'today'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => setRange('week')}
            className={`px-3 py-1.5 text-sm rounded-md transition ${
              range === 'week'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            7 ngày qua
          </button>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Tải lại
        </button>
      </div>

      <div className="text-xs text-gray-500">
        {scope.kind === 'all' && 'Phạm vi: Toàn phòng khám'}
        {scope.kind === 'team' &&
          `Phạm vi: ${scope.department ?? 'Phòng ban của bạn'}`}
        {scope.kind === 'self' && 'Phạm vi: Cá nhân'}
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
              <th className="text-left px-4 py-2 font-medium">Giờ vào</th>
              <th className="text-right px-4 py-2 font-medium">Đi muộn</th>
              <th className="text-left px-4 py-2 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Đang tải...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Không có nhân viên đi muộn trong khoảng thời gian này.
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
                  <td className="px-4 py-2 text-right text-amber-700 font-medium">
                    {r.lateMinutes}p
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
