/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  MAINTENANCE_SEVERITY_LABELS,
  MAINTENANCE_STATUS_LABELS,
  getRoomById,
} from '@/lib/room-management/catalog';
import type {
  MaintenanceBoardColumn,
  MaintenanceFilters,
  MaintenanceStatus,
  RoomMaintenanceReport,
} from '@/types/roomManagement';

export const MAINTENANCE_STATUS_ORDER: readonly MaintenanceStatus[] = [
  'new',
  'triaged',
  'in_progress',
  'waiting_material',
  'resolved',
  'cancelled',
];

const ALLOWED_TRANSITIONS: Record<MaintenanceStatus, readonly MaintenanceStatus[]> = {
  new: ['triaged', 'cancelled'],
  triaged: ['in_progress', 'waiting_material', 'cancelled'],
  in_progress: ['waiting_material', 'resolved', 'cancelled'],
  waiting_material: ['in_progress', 'resolved', 'cancelled'],
  resolved: [],
  cancelled: [],
};

export function canTransitionMaintenanceStatus(
  current: MaintenanceStatus,
  next: MaintenanceStatus,
): boolean {
  if (current === next) {
    return true;
  }

  return ALLOWED_TRANSITIONS[current].includes(next);
}

export function getNextMaintenanceStatuses(current: MaintenanceStatus) {
  return ALLOWED_TRANSITIONS[current];
}

export function filterMaintenanceReports(
  reports: readonly RoomMaintenanceReport[],
  filters: MaintenanceFilters,
) {
  const normalizedSearch = filters.search?.trim().toLowerCase();

  return reports.filter((report) => {
    const room = getRoomById(report.roomId);

    if (filters.floor !== 'all' && room?.floor !== filters.floor) {
      return false;
    }

    if (filters.status !== 'all' && report.status !== filters.status) {
      return false;
    }

    if (filters.severity !== 'all' && report.severity !== filters.severity) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = [report.title, report.description, room?.name ?? '', room?.code ?? '']
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });
}

export function buildMaintenanceBoard(
  reports: readonly RoomMaintenanceReport[],
): MaintenanceBoardColumn[] {
  return MAINTENANCE_STATUS_ORDER.map((status) => ({
    status,
    label: MAINTENANCE_STATUS_LABELS[status],
    reports: reports
      .filter((report) => report.status === status)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  }));
}

export function updateMaintenanceReportStatus(
  reports: readonly RoomMaintenanceReport[],
  reportId: string,
  nextStatus: MaintenanceStatus,
) {
  return reports.map((report) => {
    if (report.id !== reportId || !canTransitionMaintenanceStatus(report.status, nextStatus)) {
      return report;
    }

    return {
      ...report,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
  });
}

export function getMaintenanceSeverityLabel(severity: keyof typeof MAINTENANCE_SEVERITY_LABELS) {
  return MAINTENANCE_SEVERITY_LABELS[severity];
}
