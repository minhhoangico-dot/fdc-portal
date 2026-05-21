/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Save, RefreshCcw } from 'lucide-react';
import { useAttendanceSettings } from '@/viewmodels/attendance/useAttendanceSettings';

export default function SettingsTab() {
  const {
    schedule,
    updatedAt,
    isLoading,
    isSaving,
    isRecomputing,
    error,
    save,
    recompute,
  } = useAttendanceSettings();
  const [draft, setDraft] = useState(schedule);
  const [recomputeFrom, setRecomputeFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => {
    setDraft(schedule);
  }, [schedule]);

  return (
    <div className="space-y-4 max-w-xl">
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Khung giờ làm việc chung
        </h2>
        <p className="text-sm text-gray-500">
          Áp dụng cho toàn bộ nhân viên trừ khi có lịch riêng. Sau khi lưu, hãy
          tính lại dữ liệu để cập nhật trạng thái đi muộn.
        </p>

        <div className="grid grid-cols-3 gap-4">
          <label className="block text-sm">
            <span className="text-gray-600">Giờ vào</span>
            <input
              type="time"
              value={draft.startTime}
              onChange={(e) =>
                setDraft({ ...draft, startTime: e.target.value })
              }
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">Giờ ra</span>
            <input
              type="time"
              value={draft.endTime}
              onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">Muộn cho phép (phút)</span>
            <input
              type="number"
              min={0}
              value={draft.allowedLateMinutes}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  allowedLateMinutes: Number(e.target.value),
                })
              }
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void save(draft)}
            disabled={isSaving || isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
          {updatedAt && (
            <span className="text-xs text-gray-400">
              Cập nhật: {new Date(updatedAt).toLocaleString('vi-VN')}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Tính lại dữ liệu chấm công
        </h2>
        <p className="text-sm text-gray-500">
          Áp dụng khung giờ và lịch riêng mới cho dữ liệu cũ. Quá trình chạy
          ngầm trên bridge.
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
    </div>
  );
}
