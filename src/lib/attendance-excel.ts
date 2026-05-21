/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import type {
  AttendanceRecord,
  AttendanceReportFilters,
} from '@/types/attendance';
import { getAttendanceStatusLabel } from '@/viewmodels/attendance/shared';

function formatTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value: string): string {
  if (!value) return '';
  const [y, m, d] = value.split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function reportTitle(filters: AttendanceReportFilters): string {
  if (filters.type === 'monthly' && filters.month && filters.year) {
    return `Bao_cao_thang_${String(filters.month).padStart(2, '0')}_${filters.year}`;
  }
  if (filters.type === 'employee' && filters.employeeNo) {
    return `Nhan_vien_${filters.employeeNo}`;
  }
  return `Bao_cao_ngay_${filters.date ?? new Date().toISOString().slice(0, 10)}`;
}

export function buildAttendanceWorkbook(
  records: AttendanceRecord[],
  filters: AttendanceReportFilters,
): void {
  const rows = records.map((r) => ({
    Ngày: formatDate(r.date),
    'Mã NV': r.employeeNo ?? '',
    'Họ tên': r.name ?? '',
    'Phòng ban': r.department ?? '',
    'Giờ vào': formatTime(r.checkIn),
    'Giờ ra': formatTime(r.checkOut),
    'Trạng thái': getAttendanceStatusLabel(r.status),
    'Đi muộn (phút)': r.lateMinutes,
    'Giờ làm': r.hoursWorked,
    'Tăng ca': r.overtimeHours,
    Nguồn: r.scheduleSource ?? r.source,
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  const colWidths = [
    { wch: 12 },
    { wch: 10 },
    { wch: 22 },
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
  ];
  sheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Cham_cong');

  const fileName = `${reportTitle(filters)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
