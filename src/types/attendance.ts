/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AttendanceStatus =
  | 'on_time'
  | 'late_allowed'
  | 'late'
  | 'absent'
  | 'leave'
  | 'weekend'
  | 'holiday';

export interface AttendanceRecord {
  id: string;
  userId: string | null;
  name: string | null;
  department: string | null;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  lateMinutes: number;
  hoursWorked: number;
  overtime: number;
  shiftType: string;
  source: string;
  processedAt: string | null;
}

export interface AttendanceSummary {
  present: number;
  late: number;
  absent: number;
  leave: number;
}

export interface AttendanceEmployee {
  employeeNo: string;
  name: string;
  cardNo: string | null;
  userType: string;
  valid: boolean;
  hidden: boolean;
  userId: string | null;
  department: string | null;
  lastSyncedAt: string | null;
}

export interface AttendanceSchedule {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  allowedLateMinutes: number;
  isDefault: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AttendanceScheduleOverride {
  id: string;
  userMappingId: string;
  userName: string | null;
  userRole: string | null;
  userDepartment: string | null;
  startTime: string;
  endTime: string;
  allowedLateMinutes: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string | null;
}

export interface AttendanceRawEvent {
  eventId: string;
  employeeNo: string;
  employeeName?: string | null;
  checkTime: string;
  source: string;
}

export type AttendanceReportType = 'daily' | 'monthly' | 'employee';

export interface AttendanceReportFilters {
  type: AttendanceReportType;
  date?: string;
  month?: number;
  year?: number;
  employeeNo?: string;
  userMappingId?: string;
  startDate?: string;
  endDate?: string;
}
