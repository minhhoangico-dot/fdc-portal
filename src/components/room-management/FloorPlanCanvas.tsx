/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RoomBlock } from '@/components/room-management/RoomBlock';
import { cn } from '@/lib/utils';
import type {
  RoomFloorDefinition,
  RoomFloorGrouping,
  RoomLayoutDefinition,
  RoomSummary,
} from '@/types/roomManagement';

interface FloorPlanCanvasProps {
  floors: readonly RoomFloorDefinition[];
  selectedFloor: number;
  selectedLayout: RoomLayoutDefinition;
  selectedFloorRooms: RoomFloorGrouping;
  selectedRoomId: string | null;
  roomSummaryMap: Record<string, RoomSummary>;
  onSelectFloor: (floor: 1 | 2 | 3) => void;
  onSelectRoom: (roomId: string) => void;
  onQuickSupply: (roomId: string) => void;
}

function renderWing(
  rooms: RoomFloorGrouping[keyof RoomFloorGrouping],
  selectedRoomId: string | null,
  roomSummaryMap: Record<string, RoomSummary>,
  onSelectRoom: (roomId: string) => void,
  onQuickSupply: (roomId: string) => void,
) {
  return rooms.map((room) => (
    <RoomBlock
      key={room.id}
      room={room}
      summary={roomSummaryMap[room.id]}
      selected={selectedRoomId === room.id}
      onSelect={onSelectRoom}
      onQuickSupply={onQuickSupply}
    />
  ));
}

export function FloorPlanCanvas({
  floors,
  selectedFloor,
  selectedLayout,
  selectedFloorRooms,
  selectedRoomId,
  roomSummaryMap,
  onSelectFloor,
  onSelectRoom,
  onQuickSupply,
}: FloorPlanCanvasProps) {
  const activeFloor = floors.find((floor) => floor.floor === selectedFloor) ?? floors[0];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Floor header + tabs */}
      <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">{activeFloor.title}</h2>
          <p className="mt-0.5 text-sm text-gray-500">{activeFloor.description}</p>
        </div>

        <div className="flex gap-1.5">
          {floors.map((floor) => (
            <button
              key={floor.id}
              type="button"
              onClick={() => onSelectFloor(floor.floor)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                floor.floor === selectedFloor
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
              )}
            >
              {floor.label}
            </button>
          ))}
        </div>
      </div>

      {/* Floor plan grid */}
      <div className="p-4">
        <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 md:p-5">
          {selectedLayout.kind === 'dual-wing' ? (
            <div className="grid grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] gap-3 md:grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)] md:gap-4">
              {/* Left wing */}
              <div className="space-y-1.5">
                <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                  {selectedLayout.primaryWingLabel}
                </p>
                {renderWing(selectedFloorRooms.left, selectedRoomId, roomSummaryMap, onSelectRoom, onQuickSupply)}
              </div>

              {/* Corridor */}
              <div className="relative rounded-2xl border border-dashed border-gray-300 bg-white/60">
                <div
                  className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  {selectedLayout.corridorLabel}
                </div>
              </div>

              {/* Right wing */}
              <div className="space-y-1.5">
                <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                  {selectedLayout.secondaryWingLabel}
                </p>
                {renderWing(selectedFloorRooms.right, selectedRoomId, roomSummaryMap, onSelectRoom, onQuickSupply)}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)_48px] gap-3 md:grid-cols-[minmax(0,1fr)_72px] md:gap-4">
              {/* Single wing */}
              <div className="space-y-1.5">
                <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                  {selectedLayout.primaryWingLabel}
                </p>
                {renderWing(selectedFloorRooms.center, selectedRoomId, roomSummaryMap, onSelectRoom, onQuickSupply)}
              </div>

              {/* Corridor */}
              <div className="relative rounded-2xl border border-dashed border-gray-300 bg-white/60">
                <div
                  className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  {selectedLayout.corridorLabel}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
