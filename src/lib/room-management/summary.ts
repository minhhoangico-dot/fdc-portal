/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ROOM_CATALOG, ROOM_FLOORS } from '@/lib/room-management/catalog';
import type {
  RoomActivityItem,
  RoomManagementStats,
  RoomMaintenanceReport,
  RoomSummary,
  RoomSupplyRequest,
} from '@/types/roomManagement';

function markLatest(summary: RoomSummary, candidate: string) {
  if (!summary.latestActivityAt || new Date(candidate) > new Date(summary.latestActivityAt)) {
    summary.latestActivityAt = candidate;
  }
}

export function buildRoomSummaryMap(input: {
  maintenanceReports: readonly RoomMaintenanceReport[];
  supplyRequests: readonly RoomSupplyRequest[];
}) {
  const summary = Object.fromEntries(
    ROOM_CATALOG.map((room) => [
      room.id,
      {
        roomId: room.id,
        openMaintenanceCount: 0,
        pendingSupplyCount: 0,
        latestActivityAt: null,
      } satisfies RoomSummary,
    ]),
  ) as Record<string, RoomSummary>;

  for (const report of input.maintenanceReports) {
    const roomSummary = summary[report.roomId];
    if (!roomSummary) continue;

    if (report.status !== 'resolved' && report.status !== 'cancelled') {
      roomSummary.openMaintenanceCount += 1;
    }

    markLatest(roomSummary, report.updatedAt);
  }

  for (const request of input.supplyRequests) {
    const roomSummary = summary[request.roomId];
    if (!roomSummary) continue;

    if (request.status === 'pending') {
      roomSummary.pendingSupplyCount += 1;
    }

    markLatest(roomSummary, request.updatedAt);
  }

  return summary;
}

export function buildRoomManagementStats(summaryMap: Record<string, RoomSummary>): RoomManagementStats {
  const summary = Object.values(summaryMap);

  return {
    openMaintenanceCount: summary.reduce((count, room) => count + room.openMaintenanceCount, 0),
    pendingSupplyCount: summary.reduce((count, room) => count + room.pendingSupplyCount, 0),
    activeRoomCount: ROOM_CATALOG.length,
    activeFloorCount: ROOM_FLOORS.length,
  };
}

export function getRoomRecentActivity(
  roomId: string,
  maintenanceReports: readonly RoomMaintenanceReport[],
  supplyRequests: readonly RoomSupplyRequest[],
): RoomActivityItem[] {
  const activity: RoomActivityItem[] = [];

  for (const report of maintenanceReports) {
    if (report.roomId !== roomId) continue;

    activity.push({
      id: report.id,
      roomId,
      title: report.title,
      kind: 'maintenance',
      status: report.status,
      createdAt: report.updatedAt,
    });
  }

  for (const request of supplyRequests) {
    if (request.roomId !== roomId) continue;

    activity.push({
      id: request.id,
      roomId,
      title: request.title,
      kind: 'supply',
      status: request.status,
      createdAt: request.updatedAt,
    });
  }

  return activity.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
