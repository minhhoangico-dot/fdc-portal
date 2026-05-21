/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { bridgeRequest } from '@/lib/bridge-client';
import { supabase } from '@/lib/supabase';
import type { AttendanceSchedule } from '@/types/attendance';

const DEFAULT_SCHEDULE: AttendanceSchedule = {
  startTime: '08:00',
  endTime: '17:30',
  allowedLateMinutes: 5,
};

export function useAttendanceSettings() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<AttendanceSchedule>(DEFAULT_SCHEDULE);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: queryErr } = await supabase
        .from('fdc_attendance_settings')
        .select('value,updated_at')
        .eq('key', 'global_schedule')
        .maybeSingle();
      if (queryErr) throw queryErr;
      if (data?.value) {
        setSchedule({
          startTime: data.value.startTime ?? DEFAULT_SCHEDULE.startTime,
          endTime: data.value.endTime ?? DEFAULT_SCHEDULE.endTime,
          allowedLateMinutes:
            data.value.allowedLateMinutes ?? DEFAULT_SCHEDULE.allowedLateMinutes,
        });
        setUpdatedAt(data.updated_at ?? null);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Không tải được cấu hình');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const save = useCallback(
    async (next: AttendanceSchedule) => {
      setIsSaving(true);
      setError(null);
      try {
        const { error: upsertErr } = await supabase
          .from('fdc_attendance_settings')
          .upsert(
            {
              key: 'global_schedule',
              value: next,
              updated_at: new Date().toISOString(),
              updated_by: user?.id ?? null,
            },
            { onConflict: 'key' },
          );
        if (upsertErr) throw upsertErr;
        setSchedule(next);
        setUpdatedAt(new Date().toISOString());
      } catch (err: any) {
        setError(err?.message ?? 'Không thể lưu cấu hình');
      } finally {
        setIsSaving(false);
      }
    },
    [user?.id],
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
    schedule,
    updatedAt,
    isLoading,
    isSaving,
    isRecomputing,
    error,
    save,
    recompute,
    refresh: fetchSettings,
  };
}
