/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { can } from '@/lib/permissions/access';
import type {
  AttendanceEmployee,
  AttendanceRecord,
  AttendanceSchedule,
  AttendanceScheduleOverride,
  AttendanceStatus,
} from '@/types/attendance';
import type { Role } from '@/types/user';

export type AttendanceScope =
  | { kind: 'all' }
  | { kind: 'team'; department: string | null }
  | { kind: 'self'; userId: string };

export function resolveAttendanceScope(
  role: Role | undefined,
  userId: string | undefined,
  department: string | null | undefined,
): AttendanceScope {
  if (!role || !userId) {
    return { kind: 'self', userId: userId ?? '' };
  }
  if (can(role, 'attendance.view_all')) return { kind: 'all' };
  if (can(role, 'attendance.view_team')) {
    return { kind: 'team', department: department ?? null };
  }
  return { kind: 'self', userId };
}

export function mapAttendanceRow(row: any): AttendanceRecord {
  return {
    id: row.id ?? `${row.user_id}-${row.date}`,
    userId: row.user_id ?? null,
    name: row.name ?? null,
    department: row.department ?? null,
    date: row.date,
    checkIn: row.check_in ?? null,
    checkOut: row.check_out ?? null,
    status: (row.status as AttendanceStatus) ?? 'on_time',
    lateMinutes: row.late_minutes ?? 0,
    hoursWorked: Number(row.hours_worked ?? 0),
    overtime: Number(row.overtime ?? 0),
    shiftType: row.shift_type ?? 'standard',
    source: row.source ?? 'processed',
    processedAt: row.processed_at ?? null,
  };
}

export function mapEmployeeRow(row: any): AttendanceEmployee {
  return {
    employeeNo: row.employee_no,
    name: row.name ?? '',
    cardNo: row.card_no ?? null,
    userType: row.user_type ?? 'normal',
    valid: row.valid ?? true,
    hidden: row.hidden ?? false,
    userId: row.user_id ?? null,
    department: row.department ?? null,
    lastSyncedAt: row.last_synced_at ?? null,
  };
}

export function mapScheduleRow(row: any): AttendanceSchedule {
  return {
    id: row.id,
    label: row.label ?? '',
    startTime: row.start_time,
    endTime: row.end_time,
    allowedLateMinutes: row.allowed_late_minutes ?? 0,
    isDefault: row.is_default ?? false,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function mapOverrideRow(row: any): AttendanceScheduleOverride {
  const mapping = row.fdc_user_mapping ?? row.user_mapping ?? null;
  return {
    id: row.id,
    userMappingId: row.user_mapping_id,
    userName: mapping?.full_name ?? row.user_name ?? null,
    userRole: mapping?.role ?? row.user_role ?? null,
    userDepartment: mapping?.department_name ?? row.user_department ?? null,
    startTime: row.start_time,
    endTime: row.end_time,
    allowedLateMinutes:
      row.allowed_late_minutes === null || row.allowed_late_minutes === undefined
        ? null
        : Number(row.allowed_late_minutes),
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to ?? null,
    createdAt: row.created_at ?? null,
  };
}

export function getAttendanceStatusLabel(status: AttendanceStatus): string {
  switch (status) {
    case 'on_time':
      return 'Đúng giờ';
    case 'late_allowed':
      return 'Muộn (cho phép)';
    case 'late':
      return 'Đi muộn';
    case 'absent':
      return 'Vắng mặt';
    case 'leave':
      return 'Nghỉ phép';
    case 'weekend':
      return 'Cuối tuần';
    case 'holiday':
      return 'Nghỉ lễ';
    default:
      return status;
  }
}

export function getAttendanceStatusColor(status: AttendanceStatus): string {
  switch (status) {
    case 'on_time':
      return 'bg-emerald-100 text-emerald-700';
    case 'late_allowed':
      return 'bg-blue-100 text-blue-700';
    case 'late':
      return 'bg-amber-100 text-amber-700';
    case 'absent':
      return 'bg-rose-100 text-rose-700';
    case 'leave':
      return 'bg-indigo-100 text-indigo-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}
