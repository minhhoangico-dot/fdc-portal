/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { bridgeRequest } from '@/lib/bridge-client';
import { supabase } from '@/lib/supabase';
import type { AttendanceSchedule } from '@/types/attendance';
import { mapScheduleRow } from '@/viewmodels/attendance/shared';

export type ScheduleDraft = Omit<
  AttendanceSchedule,
  'id' | 'createdAt' | 'updatedAt'
> & { id?: string };

export function useAttendanceSettings() {
  const [schedules, setSchedules] = useState<AttendanceSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: queryErr } = await supabase
        .from('fdc_attendance_schedule')
        .select('id,label,start_time,end_time,allowed_late_minutes,is_default,created_at,updated_at')
        .order('is_default', { ascending: false })
        .order('label', { ascending: true });
      if (queryErr) throw queryErr;
      setSchedules((data ?? []).map(mapScheduleRow));
    } catch (err: any) {
      setError(err?.message ?? 'Không tải được danh sách ca làm việc');
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSchedules();
  }, [fetchSchedules]);

  const upsertSchedule = useCallback(
    async (draft: ScheduleDraft) => {
      setIsSaving(true);
      setError(null);
      try {
        const payload = {
          label: draft.label,
          start_time: draft.startTime,
          end_time: draft.endTime,
          allowed_late_minutes: draft.allowedLateMinutes,
          is_default: draft.isDefault,
          updated_at: new Date().toISOString(),
        };
        if (draft.id) {
          const { error: updateErr } = await supabase
            .from('fdc_attendance_schedule')
            .update(payload)
            .eq('id', draft.id);
          if (updateErr) throw updateErr;
        } else {
          const { error: insertErr } = await supabase
            .from('fdc_attendance_schedule')
            .insert(payload);
          if (insertErr) throw insertErr;
        }
        await fetchSchedules();
      } catch (err: any) {
        setError(err?.message ?? 'Không thể lưu ca làm việc');
      } finally {
        setIsSaving(false);
      }
    },
    [fetchSchedules],
  );

  const setDefault = useCallback(
    async (id: string) => {
      setIsSaving(true);
      setError(null);
      try {
        const { error: clearErr } = await supabase
          .from('fdc_attendance_schedule')
          .update({ is_default: false, updated_at: new Date().toISOString() })
          .neq('id', id);
        if (clearErr) throw clearErr;
        const { error: setErr } = await supabase
          .from('fdc_attendance_schedule')
          .update({ is_default: true, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (setErr) throw setErr;
        await fetchSchedules();
      } catch (err: any) {
        setError(err?.message ?? 'Không thể đặt ca mặc định');
      } finally {
        setIsSaving(false);
      }
    },
    [fetchSchedules],
  );

  const deleteSchedule = useCallback(
    async (id: string) => {
      setIsSaving(true);
      setError(null);
      try {
        const { error: deleteErr } = await supabase
          .from('fdc_attendance_schedule')
          .delete()
          .eq('id', id);
        if (deleteErr) throw deleteErr;
        setSchedules((prev) => prev.filter((s) => s.id !== id));
      } catch (err: any) {
        setError(err?.message ?? 'Không thể xoá ca làm việc');
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const recompute = useCallback(async (fromDate?: string) => {
    setIsRecomputing(true);
    setError(null);
    try {
      const path = fromDate
        ? `/sync/attendance-aggregate?fromDate=${encodeURIComponent(fromDate)}`
        : '/sync/attendance-aggregate';
      await bridgeRequest<{ ok: boolean }>(path, { method: 'POST' });
    } catch (err: any) {
      setError(err?.message ?? 'Không thể tính lại dữ liệu chấm công');
    } finally {
      setIsRecomputing(false);
    }
  }, []);

  return {
    schedules,
    isLoading,
    isSaving,
    isRecomputing,
    error,
    refresh: fetchSchedules,
    upsertSchedule,
    setDefault,
    deleteSchedule,
    recompute,
  };
}
