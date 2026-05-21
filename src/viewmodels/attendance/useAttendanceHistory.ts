/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { AttendanceRawEvent } from '@/types/attendance';
import { resolveAttendanceScope } from '@/viewmodels/attendance/shared';

export interface HistoryFilters {
  startDate: string;
  endDate: string;
  employeeNo: string;
}

function getInitialFilters(): HistoryFilters {
  const today = new Date();
  const week = new Date(today);
  week.setDate(today.getDate() - 7);
  return {
    startDate: week.toISOString().slice(0, 10),
    endDate: today.toISOString().slice(0, 10),
    employeeNo: '',
  };
}

export function useAttendanceHistory() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<HistoryFilters>(getInitialFilters());
  const [events, setEvents] = useState<AttendanceRawEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scope = useMemo(
    () => resolveAttendanceScope(user?.role, user?.id, user?.department ?? null),
    [user?.role, user?.id, user?.department],
  );

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setEvents([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const startIso = `${filters.startDate}T00:00:00.000Z`;
      const endIso = `${filters.endDate}T23:59:59.999Z`;

      let query = supabase
        .from('fdc_attendance_records')
        .select('event_id,employee_id,check_time,source')
        .gte('check_time', startIso)
        .lte('check_time', endIso)
        .order('check_time', { ascending: false })
        .limit(2000);

      let allowedEmployeeNos: Set<string> | null = null;

      if (scope.kind !== 'all') {
        let empQuery = supabase
          .from('fdc_attendance_employees')
          .select('employee_no');
        if (scope.kind === 'team' && scope.department) {
          empQuery = empQuery.eq('department', scope.department);
        }
        if (scope.kind === 'self') {
          empQuery = empQuery.eq('user_id', scope.userId);
        }
        const { data: allowed, error: empErr } = await empQuery;
        if (empErr) throw empErr;
        allowedEmployeeNos = new Set((allowed ?? []).map((e) => e.employee_no));
        if (allowedEmployeeNos.size === 0) {
          setEvents([]);
          return;
        }
        query = query.in('employee_id', Array.from(allowedEmployeeNos));
      }

      if (filters.employeeNo.trim()) {
        query = query.eq('employee_id', filters.employeeNo.trim());
      }

      const { data: rows, error: queryErr } = await query;
      if (queryErr) throw queryErr;

      const employeeIds = Array.from(
        new Set((rows ?? []).map((r) => r.employee_id).filter(Boolean)),
      );

      let nameMap = new Map<string, string | null>();
      if (employeeIds.length > 0) {
        const { data: emps, error: nameErr } = await supabase
          .from('fdc_attendance_employees')
          .select('employee_no,name')
          .in('employee_no', employeeIds);
        if (nameErr) throw nameErr;
        nameMap = new Map((emps ?? []).map((e) => [e.employee_no, e.name]));
      }

      setEvents(
        (rows ?? []).map((row) => ({
          eventId: row.event_id,
          employeeNo: row.employee_id,
          employeeName: nameMap.get(row.employee_id) ?? null,
          checkTime: row.check_time,
          source: row.source ?? 'HIKVISION',
        })),
      );
    } catch (err: any) {
      setError(err?.message ?? 'Không tải được lịch sử chấm công');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, scope, filters.startDate, filters.endDate, filters.employeeNo]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  return {
    filters,
    setFilters,
    events,
    isLoading,
    error,
    refresh: fetchHistory,
    scope,
  };
}
