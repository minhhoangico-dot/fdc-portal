/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AttendanceStatus =
  | 'on_time'
  | 'late'
  | 'absent'
  | 'leave'
  | 'weekend'
  | 'holiday';

export interface AttendanceRecord {
  id: string;
  userId: string | null;
  employeeNo: string | null;
  name: string | null;
  department: string | null;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  lateMinutes: number;
  hoursWorked: number;
  overtimeHours: number;
  source: string;
  scheduleSource?: string;
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
  startTime: string;
  endTime: string;
  allowedLateMinutes: number;
}

export interface AttendanceScheduleException extends AttendanceSchedule {
  employeeNo: string;
  note: string | null;
  updatedAt: string | null;
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
  startDate?: string;
  endDate?: string;
}
