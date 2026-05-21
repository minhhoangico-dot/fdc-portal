/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { useAttendanceScheduleExceptions } from '@/viewmodels/attendance/useAttendanceScheduleExceptions';
import type { AttendanceScheduleException } from '@/types/attendance';

const EMPTY_EXCEPTION: AttendanceScheduleException = {
  employeeNo: '',
  startTime: '08:00',
  endTime: '17:30',
  allowedLateMinutes: 0,
  note: null,
  updatedAt: null,
};

export default function ScheduleExceptionsTab() {
  const {
    exceptions,
    isLoading,
    isSaving,
    error,
    upsertException,
    deleteException,
  } = useAttendanceScheduleExceptions();
  const [editing, setEditing] = useState<AttendanceScheduleException | null>(null);

  const handleSave = async () => {
    if (!editing || !editing.employeeNo.trim()) return;
    await upsertException(editing);
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Cho phép đặt khung giờ riêng cho từng nhân viên (ca chiều, nửa ngày,
          ...).
        </p>
        <button
          type="button"
          onClick={() => setEditing({ ...EMPTY_EXCEPTION })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm lịch riêng
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
              <th className="text-left px-4 py-2 font-medium">Mã NV</th>
              <th className="text-left px-4 py-2 font-medium">Giờ vào</th>
              <th className="text-left px-4 py-2 font-medium">Giờ ra</th>
              <th className="text-right px-4 py-2 font-medium">Muộn cho phép</th>
              <th className="text-left px-4 py-2 font-medium">Ghi chú</th>
              <th className="text-right px-4 py-2 font-medium">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && exceptions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Đang tải...
                </td>
              </tr>
            ) : exceptions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Chưa có lịch riêng nào.
                </td>
              </tr>
            ) : (
              exceptions.map((e) => (
                <tr key={e.employeeNo} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-mono text-xs text-gray-600">
                    {e.employeeNo}
                  </td>
                  <td className="px-4 py-2">{e.startTime}</td>
                  <td className="px-4 py-2">{e.endTime}</td>
                  <td className="px-4 py-2 text-right">
                    {e.allowedLateMinutes}p
                  </td>
                  <td className="px-4 py-2 text-gray-500">{e.note ?? '—'}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditing(e)}
                      className="px-2 py-1 text-xs border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteException(e.employeeNo)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-rose-200 text-rose-600 rounded-md hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Lịch riêng nhân viên</h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="block text-sm">
              <span className="text-gray-600">Mã nhân viên</span>
              <input
                type="text"
                value={editing.employeeNo}
                onChange={(e) =>
                  setEditing({ ...editing, employeeNo: e.target.value })
                }
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-gray-600">Giờ vào</span>
                <input
                  type="time"
                  value={editing.startTime}
                  onChange={(e) =>
                    setEditing({ ...editing, startTime: e.target.value })
                  }
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">Giờ ra</span>
                <input
                  type="time"
                  value={editing.endTime}
                  onChange={(e) =>
                    setEditing({ ...editing, endTime: e.target.value })
                  }
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-gray-600">Muộn cho phép (phút)</span>
              <input
                type="number"
                min={0}
                value={editing.allowedLateMinutes}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    allowedLateMinutes: Number(e.target.value),
                  })
                }
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Ghi chú</span>
              <input
                type="text"
                value={editing.note ?? ''}
                onChange={(e) =>
                  setEditing({ ...editing, note: e.target.value || null })
                }
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving || !editing.employeeNo.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
