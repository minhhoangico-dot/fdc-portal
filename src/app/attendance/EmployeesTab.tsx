/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, RefreshCw, RefreshCcw } from 'lucide-react';
import { useAttendanceEmployees } from '@/viewmodels/attendance/useAttendanceEmployees';

export default function EmployeesTab() {
  const {
    employees,
    isLoading,
    isSyncing,
    error,
    refresh,
    triggerSync,
    setHidden,
  } = useAttendanceEmployees();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return employees;
    const q = query.trim().toLowerCase();
    return employees.filter(
      (e) =>
        e.employeeNo.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        (e.department ?? '').toLowerCase().includes(q),
    );
  }, [employees, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <input
          type="text"
          placeholder="Tìm theo mã, tên, phòng ban..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-72"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Tải lại
          </button>
          <button
            type="button"
            onClick={() => void triggerSync()}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-50"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ từ máy chấm công'}
          </button>
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
              <th className="text-left px-4 py-2 font-medium">Mã NV</th>
              <th className="text-left px-4 py-2 font-medium">Họ tên</th>
              <th className="text-left px-4 py-2 font-medium">Thẻ</th>
              <th className="text-left px-4 py-2 font-medium">Phòng ban</th>
              <th className="text-left px-4 py-2 font-medium">User Portal</th>
              <th className="text-left px-4 py-2 font-medium">Trạng thái</th>
              <th className="text-right px-4 py-2 font-medium">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  Đang tải...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  Chưa có nhân viên nào.
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.employeeNo} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-mono text-xs text-gray-600">
                    {e.employeeNo}
                  </td>
                  <td className="px-4 py-2 text-gray-800">{e.name}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">
                    {e.cardNo ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {e.department ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">
                    {e.userId ? (
                      <span className="text-emerald-700">Đã liên kết</span>
                    ) : (
                      <span className="text-amber-700">Chưa liên kết</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {e.hidden ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-500">
                        Ẩn
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-emerald-100 text-emerald-700">
                        Hoạt động
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => void setHidden(e.employeeNo, !e.hidden)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50"
                    >
                      {e.hidden ? (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Hiện
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Ẩn
                        </>
                      )}
                    </button>
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
