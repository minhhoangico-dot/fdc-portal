/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { AttendanceScheduleException } from '@/types/attendance';
import { mapExceptionRow } from '@/viewmodels/attendance/shared';

export function useAttendanceScheduleExceptions() {
  const { user } = useAuth();
  const [exceptions, setExceptions] = useState<AttendanceScheduleException[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExceptions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: queryErr } = await supabase
        .from('fdc_attendance_schedule_exceptions')
        .select('employee_no,start_time,end_time,allowed_late_minutes,note,updated_at')
        .order('employee_no', { ascending: true });
      if (queryErr) throw queryErr;
      setExceptions((data ?? []).map(mapExceptionRow));
    } catch (err: any) {
      setError(err?.message ?? 'Không tải được dữ liệu lịch riêng');
      setExceptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchExceptions();
  }, [fetchExceptions]);

  const upsertException = useCallback(
    async (next: AttendanceScheduleException) => {
      setIsSaving(true);
      setError(null);
      try {
        const { error: upsertErr } = await supabase
          .from('fdc_attendance_schedule_exceptions')
          .upsert(
            {
              employee_no: next.employeeNo,
              start_time: next.startTime,
              end_time: next.endTime,
              allowed_late_minutes: next.allowedLateMinutes,
              note: next.note ?? null,
              updated_at: new Date().toISOString(),
              updated_by: user?.id ?? null,
            },
            { onConflict: 'employee_no' },
          );
        if (upsertErr) throw upsertErr;
        await fetchExceptions();
      } catch (err: any) {
        setError(err?.message ?? 'Không thể lưu lịch riêng');
      } finally {
        setIsSaving(false);
      }
    },
    [fetchExceptions, user?.id],
  );

  const deleteException = useCallback(
    async (employeeNo: string) => {
      setIsSaving(true);
      setError(null);
      try {
        const { error: deleteErr } = await supabase
          .from('fdc_attendance_schedule_exceptions')
          .delete()
          .eq('employee_no', employeeNo);
        if (deleteErr) throw deleteErr;
        setExceptions((prev) =>
          prev.filter((e) => e.employeeNo !== employeeNo),
        );
      } catch (err: any) {
        setError(err?.message ?? 'Không thể xoá lịch riêng');
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  return {
    exceptions,
    isLoading,
    isSaving,
    error,
    refresh: fetchExceptions,
    upsertException,
    deleteException,
  };
}
