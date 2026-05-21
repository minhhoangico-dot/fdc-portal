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
          'id,user_id,employee_no,date,check_in,check_out,status,late_minutes,hours_worked,overtime_hours,source,schedule_source',
        )
        .eq('status', 'late')
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: false })
        .order('late_minutes', { ascending: false });

      if (scope.kind === 'self') {
        query = query.eq('user_id', scope.userId);
      }

      const { data: attendance, error: attErr } = await query;
      if (attErr) throw attErr;

      const employeeNos = Array.from(
        new Set(
          (attendance ?? [])
            .map((r) => r.employee_no)
            .filter((n): n is string => Boolean(n)),
        ),
      );

      let employeeMap = new Map<
        string,
        { name: string | null; department: string | null }
      >();
      if (employeeNos.length > 0) {
        const { data: employees, error: empErr } = await supabase
          .from('fdc_attendance_employees')
          .select('employee_no,name,department')
          .in('employee_no', employeeNos);
        if (empErr) throw empErr;
        employeeMap = new Map(
          (employees ?? []).map((e) => [
            e.employee_no,
            { name: e.name, department: e.department },
          ]),
        );
      }

      let filtered = (attendance ?? []).map((row) => {
        const meta = row.employee_no ? employeeMap.get(row.employee_no) : null;
        return mapAttendanceRow({
          ...row,
          name: meta?.name ?? null,
          department: meta?.department ?? null,
        });
      });

      if (scope.kind === 'team' && scope.department) {
        filtered = filtered.filter((r) => r.department === scope.department);
      }

      setRecords(filtered);
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
