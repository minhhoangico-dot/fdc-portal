/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { EmptyState } from '@/ui/EmptyState';
import { StatusBadge } from '@/ui/StatusBadge';
import { WidgetCard } from '@/ui/WidgetCard';
import { getAttendanceStatusLabel, resolveAttendanceScope } from '@/viewmodels/attendance/shared';

/**
 * "Đi muộn hôm nay" — Home widget (direction §4.3, permission
 * `attendance.view_team`). Read-only: mirrors the scoped-employee +
 * today's-attendance query shape from `useAttendanceManager`
 * (src/viewmodels/attendance/useAttendanceManager.ts) but keeps its own
 * small hook here — attendance module files are not touched.
 *
 * Self-contained failure: never throws. Loading renders a skeleton; any
 * fetch error renders a quiet EmptyState so one widget's failure never
 * blanks the rest of Home.
 */

interface LateRow {
  key: string;
  name: string;
  department: string | null;
  checkIn: string | null;
  lateMinutes: number;
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatCheckInTime(checkIn: string | null): string | null {
  if (!checkIn) return null;
  const d = new Date(checkIn);
  if (Number.isNaN(d.getTime())) return checkIn;
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function useLateArrivalsToday() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LateRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const scope = resolveAttendanceScope(user.role, user.id, user.department ?? null);
        const today = formatLocalDate(new Date());

        let employeeQuery = supabase
          .from('fdc_attendance_employees')
          .select('employee_no,name,department,user_id')
          .eq('hidden', false);
        if (scope.kind === 'team' && scope.department) {
          employeeQuery = employeeQuery.eq('department', scope.department);
        }
        if (scope.kind === 'self') {
          employeeQuery = employeeQuery.eq('user_id', scope.userId);
        }

        const [employeeRes, attendanceRes] = await Promise.all([
          employeeQuery,
          supabase
            .from('fdc_emp_attendance')
            .select('employee_no,check_in,status,late_minutes')
            .eq('date', today)
            .eq('status', 'late'),
        ]);

        if (employeeRes.error) throw employeeRes.error;
        if (attendanceRes.error) throw attendanceRes.error;

        const employeesByNo = new Map<string, { name: string; department: string | null }>();
        for (const emp of employeeRes.data ?? []) {
          if (emp.employee_no) {
            employeesByNo.set(emp.employee_no, {
              name: emp.name || emp.employee_no,
              department: emp.department ?? null,
            });
          }
        }

        const late: LateRow[] = (attendanceRes.data ?? [])
          .filter((row) => row.employee_no && employeesByNo.has(row.employee_no))
          .map((row) => {
            const emp = employeesByNo.get(row.employee_no as string)!;
            return {
              key: row.employee_no as string,
              name: emp.name,
              department: emp.department,
              checkIn: row.check_in ?? null,
              lateMinutes: row.late_minutes ?? 0,
            };
          })
          .sort((a, b) => b.lateMinutes - a.lateMinutes);

        if (!cancelled) {
          setRows(late);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? 'Không tải được dữ liệu chấm công');
          setRows([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { rows, isLoading, error };
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-2" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-10 rounded-field bg-paper" />
      ))}
    </div>
  );
}

export default function DiMuonHomNay() {
  const { rows, isLoading, error } = useLateArrivalsToday();

  return (
    <WidgetCard title="Đi muộn hôm nay">
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <p className="text-[13px] text-ink-400">Không tải được dữ liệu chấm công hôm nay.</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Chưa có ai đi muộn hôm nay ✓"
          className="border-none p-4"
        />
      ) : (
        <ul className="divide-y divide-line">
          {rows.slice(0, 8).map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-ink-900">{row.name}</p>
                {row.department && (
                  <p className="truncate text-[13px] text-ink-600">{row.department}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {formatCheckInTime(row.checkIn) && (
                  <span className="text-[13px] text-ink-600 [font-variant-numeric:tabular-nums]">
                    {formatCheckInTime(row.checkIn)}
                  </span>
                )}
                <StatusBadge
                  status="warn"
                  label={`${getAttendanceStatusLabel('late')} · ${row.lateMinutes}p`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
