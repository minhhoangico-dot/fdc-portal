/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ROOM_FLOORS, getRoomById } from '@/lib/room-management/catalog';
import type {
  PrintFilters,
  PrintableSupplyFloorGroup,
  PrintableSupplyItem,
  RoomSupplyRequest,
} from '@/types/roomManagement';

const WING_ORDER = {
  left: 0,
  center: 1,
  right: 2,
} as const;

function pushItem(items: PrintableSupplyItem[], itemName: string, quantity: number, unit: string) {
  const existing = items.find((candidate) => candidate.itemName === itemName && candidate.unit === unit);
  if (existing) {
    existing.quantity += quantity;
    return;
  }

  items.push({ itemName, quantity, unit });
}

export function buildPrintableSupplyGroups(
  requests: readonly RoomSupplyRequest[],
  filters: Partial<PrintFilters> = {},
): PrintableSupplyFloorGroup[] {
  const floorMap = new Map<number, PrintableSupplyFloorGroup>();
  const normalizedFloor = filters.floor ?? 'all';
  const normalizedStatus = filters.status ?? 'all';

  for (const request of requests) {
    if (normalizedStatus !== 'all' && request.status !== normalizedStatus) {
      continue;
    }

    const room = getRoomById(request.roomId);
    if (!room) continue;

    if (normalizedFloor !== 'all' && room.floor !== normalizedFloor) {
      continue;
    }

    const floorLabel = ROOM_FLOORS.find((floor) => floor.floor === room.floor)?.label ?? `Tầng ${room.floor}`;
    const existingFloor =
      floorMap.get(room.floor) ??
      {
        floor: room.floor,
        label: floorLabel,
        rooms: [],
      };

    let roomGroup = existingFloor.rooms.find((candidate) => candidate.roomId === room.id);
    if (!roomGroup) {
      roomGroup = {
        roomId: room.id,
        roomCode: room.code,
        roomName: room.name,
        items: [],
        requestCount: 0,
      };
      existingFloor.rooms.push(roomGroup);
    }

    roomGroup.requestCount += 1;
    for (const item of request.items) {
      pushItem(roomGroup.items, item.itemName, item.quantity, item.unit);
    }

    floorMap.set(room.floor, existingFloor);
  }

  return [...floorMap.values()]
    .sort((left, right) => left.floor - right.floor)
    .map((floorGroup) => ({
      ...floorGroup,
      rooms: floorGroup.rooms.sort((left, right) => {
        const leftRoom = getRoomById(left.roomId);
        const rightRoom = getRoomById(right.roomId);
        const wingDifference =
          (leftRoom ? WING_ORDER[leftRoom.wing] : 0) - (rightRoom ? WING_ORDER[rightRoom.wing] : 0);

        if (wingDifference !== 0) {
          return wingDifference;
        }

        return (leftRoom?.positionOrder ?? 0) - (rightRoom?.positionOrder ?? 0);
      }),
    }));
}
