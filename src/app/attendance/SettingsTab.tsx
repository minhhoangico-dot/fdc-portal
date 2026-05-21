/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CheckCircle2, Plus, RefreshCcw, Save, Star, Trash2, X } from 'lucide-react';
import {
  useAttendanceSettings,
  type ScheduleDraft,
} from '@/viewmodels/attendance/useAttendanceSettings';

const EMPTY_DRAFT: ScheduleDraft = {
  label: 'Ca mới',
  startTime: '08:00',
  endTime: '17:30',
  allowedLateMinutes: 15,
  isDefault: false,
};

export default function SettingsTab() {
  const {
    schedules,
    isLoading,
    isSaving,
    isRecomputing,
    error,
    upsertSchedule,
    setDefault,
    deleteSchedule,
    recompute,
  } = useAttendanceSettings();
  const [editing, setEditing] = useState<ScheduleDraft | null>(null);
  const [recomputeFrom, setRecomputeFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });

  const handleSave = async () => {
    if (!editing) return;
    await upsertSchedule(editing);
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ca làm việc</h2>
            <p className="text-sm text-gray-500">
              Định nghĩa các khung giờ làm việc. Một ca được đánh dấu mặc định
              sẽ áp dụng cho mọi nhân viên không có lịch riêng.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing({ ...EMPTY_DRAFT })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm ca
          </button>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Tên ca</th>
                <th className="text-left px-4 py-2 font-medium">Giờ vào</th>
                <th className="text-left px-4 py-2 font-medium">Giờ ra</th>
                <th className="text-right px-4 py-2 font-medium">Muộn cho phép</th>
                <th className="text-center px-4 py-2 font-medium">Mặc định</th>
                <th className="text-right px-4 py-2 font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && schedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    Đang tải...
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    Chưa có ca làm việc nào.
                  </td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 text-gray-800">{s.label}</td>
                    <td className="px-4 py-2 text-gray-700">{s.startTime}</td>
                    <td className="px-4 py-2 text-gray-700">{s.endTime}</td>
                    <td className="px-4 py-2 text-right">
                      {s.allowedLateMinutes}p
                    </td>
                    <td className="px-4 py-2 text-center">
                      {s.isDefault ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => void setDefault(s.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50"
                        >
                          <Star className="w-3 h-3" /> Đặt
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({
                            id: s.id,
                            label: s.label,
                            startTime: s.startTime,
                            endTime: s.endTime,
                            allowedLateMinutes: s.allowedLateMinutes,
                            isDefault: s.isDefault,
                          })
                        }
                        className="px-2 py-1 text-xs border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50"
                      >
                        Sửa
                      </button>
                      {!s.isDefault && (
                        <button
                          type="button"
                          onClick={() => void deleteSchedule(s.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-rose-200 text-rose-600 rounded-md hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Tính lại dữ liệu chấm công
        </h2>
        <p className="text-sm text-gray-500">
          Áp dụng khung giờ và lịch riêng hiện tại cho dữ liệu cũ. Quá trình
          chạy ngầm trên bridge bằng <code>process_daily_attendance</code>.
        </p>
        <div className="flex items-end gap-3">
          <label className="block text-sm">
            <span className="text-gray-600">Tính từ ngày</span>
            <input
              type="date"
              value={recomputeFrom}
              onChange={(e) => setRecomputeFrom(e.target.value)}
              className="mt-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => void recompute(recomputeFrom)}
            disabled={isRecomputing}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm border border-indigo-200 text-indigo-700 rounded-lg disabled:opacity-50"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            {isRecomputing ? 'Đang tính lại...' : 'Tính lại'}
          </button>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editing.id ? 'Sửa ca làm việc' : 'Thêm ca làm việc'}
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
              <span className="text-gray-600">Tên ca</span>
              <input
                type="text"
                value={editing.label}
                onChange={(e) =>
                  setEditing({ ...editing, label: e.target.value })
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.isDefault}
                onChange={(e) =>
                  setEditing({ ...editing, isDefault: e.target.checked })
                }
              />
              <span className="text-gray-600">Đặt làm ca mặc định</span>
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
                disabled={isSaving || !editing.label.trim()}
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
