/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { AttendanceRecord } from '@/types/attendance';
import {
  mapAttendanceRow,
  resolveAttendanceScope,
} from '@/viewmodels/attendance/shared';

export type ManagerRange = 'today' | 'week';

const LATE_STATUSES = ['late', 'late_allowed'];

export function useAttendanceManager() {
  const { user } = useAuth();
  const [range, setRange] = useState<ManagerRange>('today');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scope = useMemo(
    () => resolveAttendanceScope(user?.role, user?.id, user?.department ?? null),
    [user?.role, user?.id, user?.department],
  );

  const dateRange = useMemo(() => {
    const today = new Date();
    const end = new Date(today);
    const start = new Date(today);
    if (range === 'week') {
      start.setDate(start.getDate() - 6);
    }
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return { start: fmt(start), end: fmt(end) };
  }, [range]);

  const fetchLate = useCallback(async () => {
    if (!user) {
      setRecords([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('fdc_emp_attendance')
        .select(
          'id,user_id,date,check_in,check_out,status,late_minutes,hours_worked,overtime,shift_type,source,processed_at',
        )
        .in('status', LATE_STATUSES)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: false })
        .order('late_minutes', { ascending: false });

      if (scope.kind === 'self') {
        query = query.eq('user_id', scope.userId);
      }

      const { data: attendance, error: attErr } = await query;
      if (attErr) throw attErr;

      const userIds = Array.from(
        new Set(
          (attendance ?? [])
            .map((r) => r.user_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      let userMap = new Map<
        string,
        { name: string | null; department: string | null }
      >();
      if (userIds.length > 0) {
        const { data: users, error: userErr } = await supabase
          .from('fdc_user_mapping')
          .select('id,full_name,department_name')
          .in('id', userIds);
        if (userErr) throw userErr;
        userMap = new Map(
          (users ?? []).map((u) => [
            u.id,
            { name: u.full_name, department: u.department_name },
          ]),
        );
      }

      let mapped = (attendance ?? []).map((row) => {
        const meta = row.user_id ? userMap.get(row.user_id) : null;
        return mapAttendanceRow({
          ...row,
          name: meta?.name ?? null,
          department: meta?.department ?? null,
        });
      });

      if (scope.kind === 'team' && scope.department) {
        mapped = mapped.filter((r) => r.department === scope.department);
      }

      setRecords(mapped);
    } catch (err: any) {
      setError(err?.message ?? 'Không tải được dữ liệu chấm công');
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, scope, dateRange.start, dateRange.end]);

  useEffect(() => {
    void fetchLate();
  }, [fetchLate]);

  return {
    range,
    setRange,
    records,
    isLoading,
    error,
    refresh: fetchLate,
    scope,
  };
}
