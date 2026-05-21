/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AttendanceScheduleOverride } from '@/types/attendance';
import { mapOverrideRow } from '@/viewmodels/attendance/shared';

export interface OverrideUserOption {
  id: string;
  fullName: string;
  role: string | null;
  department: string | null;
}

export type OverrideDraft = {
  id?: string;
  userMappingId: string;
  startTime: string;
  endTime: string;
  allowedLateMinutes: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export function useAttendanceScheduleExceptions() {
  const [overrides, setOverrides] = useState<AttendanceScheduleOverride[]>([]);
  const [users, setUsers] = useState<OverrideUserOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [{ data: overrideRows, error: overrideErr }, { data: userRows, error: userErr }] =
        await Promise.all([
          supabase
            .from('fdc_attendance_schedule_override')
            .select(
              'id,user_mapping_id,start_time,end_time,allowed_late_minutes,effective_from,effective_to,created_at',
            )
            .order('effective_from', { ascending: false }),
          supabase
            .from('fdc_user_mapping')
            .select('id,full_name,role,department_name,is_active')
            .neq('is_active', false)
            .order('full_name', { ascending: true }),
        ]);
      if (overrideErr) throw overrideErr;
      if (userErr) throw userErr;

      const userById = new Map<string, OverrideUserOption>();
      for (const u of userRows ?? []) {
        userById.set(u.id, {
          id: u.id,
          fullName: u.full_name ?? '(không tên)',
          role: u.role ?? null,
          department: u.department_name ?? null,
        });
      }

      const decorated = (overrideRows ?? []).map((row) => {
        const u = userById.get(row.user_mapping_id);
        return mapOverrideRow({
          ...row,
          user_name: u?.fullName ?? null,
          user_role: u?.role ?? null,
          user_department: u?.department ?? null,
        });
      });

      setOverrides(decorated);
      setUsers(Array.from(userById.values()));
    } catch (err: any) {
      setError(err?.message ?? 'Không tải được dữ liệu lịch riêng');
      setOverrides([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const upsertOverride = useCallback(
    async (draft: OverrideDraft) => {
      setIsSaving(true);
      setError(null);
      try {
        const payload = {
          user_mapping_id: draft.userMappingId,
          start_time: draft.startTime,
          end_time: draft.endTime,
          allowed_late_minutes: draft.allowedLateMinutes,
          effective_from: draft.effectiveFrom,
          effective_to: draft.effectiveTo,
        };
        if (draft.id) {
          const { error: updateErr } = await supabase
            .from('fdc_attendance_schedule_override')
            .update(payload)
            .eq('id', draft.id);
          if (updateErr) throw updateErr;
        } else {
          const { error: insertErr } = await supabase
            .from('fdc_attendance_schedule_override')
            .insert(payload);
          if (insertErr) throw insertErr;
        }
        await fetchAll();
      } catch (err: any) {
        setError(err?.message ?? 'Không thể lưu lịch riêng');
      } finally {
        setIsSaving(false);
      }
    },
    [fetchAll],
  );

  const deleteOverride = useCallback(
    async (id: string) => {
      setIsSaving(true);
      setError(null);
      try {
        const { error: deleteErr } = await supabase
          .from('fdc_attendance_schedule_override')
          .delete()
          .eq('id', id);
        if (deleteErr) throw deleteErr;
        setOverrides((prev) => prev.filter((o) => o.id !== id));
      } catch (err: any) {
        setError(err?.message ?? 'Không thể xoá lịch riêng');
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  return {
    overrides,
    users,
    isLoading,
    isSaving,
    error,
    refresh: fetchAll,
    upsertOverride,
    deleteOverride,
  };
}
