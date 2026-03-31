/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ROOM_CATALOG } from '@/lib/room-management/catalog';
import type { RoomReviewGroup, RoomReviewerRole } from '@/types/roomWorkflow';

export function getReviewGroupForRoom(roomCodeOrId: string): RoomReviewGroup {
  const room =
    ROOM_CATALOG.find((entry) => entry.code === roomCodeOrId) ??
    ROOM_CATALOG.find((entry) => entry.id === roomCodeOrId);

  if (!room) {
    return 'general_care';
  }

  if (room.code === 'T1-NHATHUOC' || room.roomType === 'pharmacy') {
    return 'pharmacy';
  }

  if (room.code === 'P304') {
    return 'accounting_304';
  }

  if (room.code === 'T2-XETNGHIEM' || room.roomType === 'lab') {
    return 'lab';
  }

  return 'general_care';
}

export function getReviewerRoleForGroup(group: RoomReviewGroup): RoomReviewerRole {
  switch (group) {
    case 'pharmacy':
      return 'pharmacy_head';
    case 'accounting_304':
      return 'accounting_supervisor';
    case 'lab':
      return 'lab_head';
    case 'general_care':
    default:
      return 'head_nurse';
  }
}
