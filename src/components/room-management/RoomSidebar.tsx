/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search } from 'lucide-react';
import { ROOM_TYPE_META } from '@/lib/room-management/catalog';
import { cn } from '@/lib/utils';
import type { RoomCatalogEntry, RoomFloor, RoomFloorDefinition, RoomSummary } from '@/types/roomManagement';

interface RoomSidebarProps {
  floors: readonly RoomFloorDefinition[];
  rooms: readonly RoomCatalogEntry[];
  selectedFloor: RoomFloor;
  selectedRoomId: string | null;
  roomSummaryMap: Record<string, RoomSummary>;
  onSelectFloor: (floor: RoomFloor) => void;
  onSelectRoom: (roomId: string) => void;
}

function getStatusDot(summary: RoomSummary | undefined): string {
  if (!summary) return 'bg-gray-300';
  if (summary.openMaintenanceCount > 0) return 'bg-red-500';
  if (summary.pendingSupplyCount > 0) return 'bg-amber-400';
  return 'bg-emerald-400';
}

export function RoomSidebar({
  floors,
  rooms,
  selectedFloor,
  selectedRoomId,
  roomSummaryMap,
  onSelectFloor,
  onSelectRoom,
}: RoomSidebarProps) {
  const [search, setSearch] = React.useState('');

  const floorRooms = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms
      .filter((r) => r.floor === selectedFloor)
      .filter(
        (r) =>
          !q ||
          r.code.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q),
      )
      .sort((a, b) => a.positionOrder - b.positionOrder);
  }, [rooms, selectedFloor, search]);

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Search */}
      <div className="border-b border-gray-100 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm phòng..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {/* Floor tabs */}
      <div className="flex gap-1 border-b border-gray-100 px-3 py-2">
        {floors.map((floor) => (
          <button
            key={floor.id}
            type="button"
            onClick={() => onSelectFloor(floor.floor)}
            className={cn(
              'flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors',
              floor.floor === selectedFloor
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700',
            )}
          >
            {floor.label}
          </button>
        ))}
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {floorRooms.map((room) => {
            const summary = roomSummaryMap[room.id];
            const meta = ROOM_TYPE_META[room.roomType];
            const isSelected = selectedRoomId === room.id;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => onSelectRoom(room.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all',
                  isSelected
                    ? 'bg-indigo-50 ring-1 ring-indigo-200'
                    : 'hover:bg-gray-50',
                )}
              >
                <span className={cn('h-2 w-2 shrink-0 rounded-full', getStatusDot(summary))} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900">
                    {room.name}
                  </span>
                  <span className="block text-[11px] text-gray-400">{room.code}</span>
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                    meta.badgeClassName,
                  )}
                >
                  {meta.label}
                </span>
              </button>
            );
          })}
          {floorRooms.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-gray-400">
              Không tìm thấy phòng nào.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
