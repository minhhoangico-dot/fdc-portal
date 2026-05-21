/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { bridgeRequest } from '@/lib/bridge-client';
import { supabase } from '@/lib/supabase';
import type { AttendanceEmployee } from '@/types/attendance';
import {
  mapEmployeeRow,
  resolveAttendanceScope,
} from '@/viewmodels/attendance/shared';

export function useAttendanceEmployees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scope = useMemo(
    () => resolveAttendanceScope(user?.role, user?.id, user?.department ?? null),
    [user?.role, user?.id, user?.department],
  );

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('fdc_attendance_employees')
        .select(
          'employee_no,name,card_no,user_type,valid,hidden,user_id,department,last_synced_at',
        )
        .order('name', { ascending: true });

      if (scope.kind === 'team' && scope.department) {
        query = query.eq('department', scope.department);
      }
      if (scope.kind === 'self') {
        query = query.eq('user_id', scope.userId);
      }

      const { data, error: queryErr } = await query;
      if (queryErr) throw queryErr;
      setEmployees((data ?? []).map(mapEmployeeRow));
    } catch (err: any) {
      setError(err?.message ?? 'Không tải được danh sách nhân viên');
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void fetchEmployees();
  }, [fetchEmployees]);

  const triggerSync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    try {
      await bridgeRequest<{ ok: boolean }>('/sync/employees', {
        method: 'POST',
      });
    } catch (err: any) {
      setError(err?.message ?? 'Không thể đồng bộ nhân viên');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const setHidden = useCallback(
    async (employeeNo: string, hidden: boolean) => {
      const { error: updateErr } = await supabase
        .from('fdc_attendance_employees')
        .update({ hidden, updated_at: new Date().toISOString() })
        .eq('employee_no', employeeNo);
      if (updateErr) {
        setError(updateErr.message);
        return;
      }
      setEmployees((prev) =>
        prev.map((e) =>
          e.employeeNo === employeeNo ? { ...e, hidden } : e,
        ),
      );
    },
    [],
  );

  const linkToUser = useCallback(
    async (employeeNo: string, userId: string | null) => {
      const { error: updateErr } = await supabase
        .from('fdc_attendance_employees')
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .eq('employee_no', employeeNo);
      if (updateErr) {
        setError(updateErr.message);
        return;
      }
      setEmployees((prev) =>
        prev.map((e) =>
          e.employeeNo === employeeNo ? { ...e, userId } : e,
        ),
      );
    },
    [],
  );

  return {
    employees,
    isLoading,
    isSyncing,
    error,
    refresh: fetchEmployees,
    triggerSync,
    setHidden,
    linkToUser,
  };
}
