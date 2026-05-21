/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type {
  AttendanceRecord,
  AttendanceReportFilters,
  AttendanceReportType,
} from '@/types/attendance';
import {
  mapAttendanceRow,
  resolveAttendanceScope,
} from '@/viewmodels/attendance/shared';

function getDefaultFilters(): AttendanceReportFilters {
  const today = new Date();
  return {
    type: 'daily',
    date: today.toISOString().slice(0, 10),
    month: today.getMonth() + 1,
    year: today.getFullYear(),
  };
}

function getReportDateRange(filters: AttendanceReportFilters): {
  start: string;
  end: string;
} {
  if (filters.type === 'monthly' && filters.month && filters.year) {
    const month = String(filters.month).padStart(2, '0');
    const start = `${filters.year}-${month}-01`;
    const lastDay = new Date(filters.year, filters.month, 0).getDate();
    const end = `${filters.year}-${month}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  }
  if (filters.type === 'employee' && filters.startDate && filters.endDate) {
    return { start: filters.startDate, end: filters.endDate };
  }
  const d = filters.date || new Date().toISOString().slice(0, 10);
  return { start: d, end: d };
}

export function useAttendanceReports() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<AttendanceReportFilters>(
    getDefaultFilters(),
  );
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scope = useMemo(
    () => resolveAttendanceScope(user?.role, user?.id, user?.department ?? null),
    [user?.role, user?.id, user?.department],
  );

  const fetchReport = useCallback(async () => {
    if (!user) {
      setRecords([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { start, end } = getReportDateRange(filters);

      let query = supabase
        .from('fdc_emp_attendance')
        .select(
          'id,user_id,date,check_in,check_out,status,late_minutes,hours_worked,overtime,shift_type,source,processed_at',
        )
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true });

      if (scope.kind === 'self') {
        query = query.eq('user_id', scope.userId);
      }
      if (filters.type === 'employee' && filters.userMappingId) {
        query = query.eq('user_id', filters.userMappingId);
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
      setError(err?.message ?? 'Không tải được báo cáo');
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, scope, filters]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const exportXlsx = useCallback(async () => {
    if (records.length === 0) return;
    setIsExporting(true);
    try {
      const { buildAttendanceWorkbook } = await import(
        '@/lib/attendance-excel'
      );
      buildAttendanceWorkbook(records, filters);
    } catch (err: any) {
      setError(err?.message ?? 'Không thể xuất Excel');
    } finally {
      setIsExporting(false);
    }
  }, [records, filters]);

  const setReportType = useCallback((type: AttendanceReportType) => {
    setFilters((prev) => ({ ...prev, type }));
  }, []);

  return {
    filters,
    setFilters,
    setReportType,
    records,
    isLoading,
    isExporting,
    error,
    refresh: fetchReport,
    exportXlsx,
    scope,
  };
}
