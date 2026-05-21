/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Save, Trash2, X } from 'lucide-react';
import {
  useAttendanceScheduleExceptions,
  type OverrideDraft,
} from '@/viewmodels/attendance/useAttendanceScheduleExceptions';

const todayIso = () => new Date().toISOString().slice(0, 10);

const EMPTY_DRAFT: OverrideDraft = {
  userMappingId: '',
  startTime: '08:00',
  endTime: '17:30',
  allowedLateMinutes: 15,
  effectiveFrom: todayIso(),
  effectiveTo: null,
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  const [y, m, d] = value.split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export default function ScheduleExceptionsTab() {
  const {
    overrides,
    users,
    isLoading,
    isSaving,
    error,
    upsertOverride,
    deleteOverride,
  } = useAttendanceScheduleExceptions();
  const [editing, setEditing] = useState<OverrideDraft | null>(null);

  const handleSave = async () => {
    if (!editing || !editing.userMappingId) return;
    await upsertOverride(editing);
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Đặt khung giờ riêng cho từng nhân viên trong một khoảng thời gian (ca
          chiều, nửa ngày, ...).
        </p>
        <button
          type="button"
          onClick={() => setEditing({ ...EMPTY_DRAFT })}
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
              <th className="text-left px-4 py-2 font-medium">Nhân viên</th>
              <th className="text-left px-4 py-2 font-medium">Phòng ban</th>
              <th className="text-left px-4 py-2 font-medium">Hiệu lực từ</th>
              <th className="text-left px-4 py-2 font-medium">Hiệu lực đến</th>
              <th className="text-left px-4 py-2 font-medium">Giờ vào</th>
              <th className="text-left px-4 py-2 font-medium">Giờ ra</th>
              <th className="text-right px-4 py-2 font-medium">Muộn cho phép</th>
              <th className="text-right px-4 py-2 font-medium">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && overrides.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  Đang tải...
                </td>
              </tr>
            ) : overrides.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  Chưa có lịch riêng nào.
                </td>
              </tr>
            ) : (
              overrides.map((o) => (
                <tr key={o.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-800">
                    {o.userName ?? o.userMappingId}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {o.userDepartment ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {formatDate(o.effectiveFrom)}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {formatDate(o.effectiveTo)}
                  </td>
                  <td className="px-4 py-2">{o.startTime}</td>
                  <td className="px-4 py-2">{o.endTime}</td>
                  <td className="px-4 py-2 text-right">
                    {o.allowedLateMinutes === null
                      ? '(mặc định)'
                      : `${o.allowedLateMinutes}p`}
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          id: o.id,
                          userMappingId: o.userMappingId,
                          startTime: o.startTime,
                          endTime: o.endTime,
                          allowedLateMinutes: o.allowedLateMinutes,
                          effectiveFrom: o.effectiveFrom,
                          effectiveTo: o.effectiveTo,
                        })
                      }
                      className="px-2 py-1 text-xs border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteOverride(o.id)}
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
              <h3 className="text-lg font-semibold">
                {editing.id ? 'Sửa lịch riêng' : 'Thêm lịch riêng'}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="block text-sm">
              <span className="text-gray-600">Nhân viên</span>
              <select
                value={editing.userMappingId}
                onChange={(e) =>
                  setEditing({ ...editing, userMappingId: e.target.value })
                }
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="">— Chọn nhân viên —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                    {u.department ? ` · ${u.department}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-gray-600">Hiệu lực từ</span>
                <input
                  type="date"
                  value={editing.effectiveFrom}
                  onChange={(e) =>
                    setEditing({ ...editing, effectiveFrom: e.target.value })
                  }
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">Hiệu lực đến (tuỳ chọn)</span>
                <input
                  type="date"
                  value={editing.effectiveTo ?? ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      effectiveTo: e.target.value || null,
                    })
                  }
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                />
              </label>
            </div>

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
              <span className="text-gray-600">
                Muộn cho phép (phút, bỏ trống = dùng ca mặc định)
              </span>
              <input
                type="number"
                min={0}
                value={editing.allowedLateMinutes ?? ''}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    allowedLateMinutes:
                      e.target.value === '' ? null : Number(e.target.value),
                  })
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
                disabled={isSaving || !editing.userMappingId}
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
