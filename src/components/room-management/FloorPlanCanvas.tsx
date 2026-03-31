/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClipboardList, Layers3, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RoomBlock } from '@/components/room-management/RoomBlock';
import { cn } from '@/lib/utils';
import type {
  RoomFloorDefinition,
  RoomFloorGrouping,
  RoomLayoutDefinition,
  RoomManagementStats,
  RoomSummary,
} from '@/types/roomManagement';

interface FloorPlanCanvasProps {
  floors: readonly RoomFloorDefinition[];
  selectedFloor: number;
  selectedLayout: RoomLayoutDefinition;
  selectedFloorRooms: RoomFloorGrouping;
  selectedRoomId: string | null;
  roomSummaryMap: Record<string, RoomSummary>;
  stats: RoomManagementStats;
  onSelectFloor: (floor: 1 | 2 | 3) => void;
  onSelectRoom: (roomId: string) => void;
}

function renderWing(
  rooms: RoomFloorGrouping[keyof RoomFloorGrouping],
  selectedRoomId: string | null,
  roomSummaryMap: Record<string, RoomSummary>,
  onSelectRoom: (roomId: string) => void,
) {
  return rooms.map((room) => (
    <RoomBlock
      key={room.id}
      room={room}
      summary={roomSummaryMap[room.id]}
      selected={selectedRoomId === room.id}
      onSelect={onSelectRoom}
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
  stats,
  onSelectFloor,
  onSelectRoom,
}: FloorPlanCanvasProps) {
  const activeFloor = floors.find((floor) => floor.floor === selectedFloor) ?? floors[0];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-indigo-600">
                Room Management
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">Quản lý phòng</h1>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-gray-600">
              Quản lý sơ đồ phòng theo từng tầng, ghi nhận sự cố bảo trì và tổng hợp đề xuất vật tư
              ngay trong giao diện portal hiện tại.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <Link
              to="/room-management/maintenance"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              <Wrench className="h-4 w-4" />
              Hàng chờ bảo trì
            </Link>
            <Link
              to="/room-management/print/materials"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Layers3 className="h-4 w-4" />
              In tổng hợp vật tư
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">Sự cố đang mở</p>
          <p className="mt-3 text-3xl font-semibold text-gray-900">{stats.openMaintenanceCount}</p>
          <p className="mt-2 text-sm text-gray-500">Tự động cộng từ tất cả báo cáo chưa hoàn tất.</p>
        </article>
        <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">Đề xuất chờ duyệt</p>
          <p className="mt-3 text-3xl font-semibold text-gray-900">{stats.pendingSupplyCount}</p>
          <p className="mt-2 text-sm text-gray-500">Chỉ tính các phiếu vật tư còn đang chờ xử lý.</p>
        </article>
        <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">Phòng đang theo dõi</p>
          <p className="mt-3 text-3xl font-semibold text-gray-900">
            {stats.activeRoomCount} <span className="text-lg font-medium text-gray-500">/ {stats.activeFloorCount} tầng</span>
          </p>
          <p className="mt-2 text-sm text-gray-500">Giữ nguyên cấu trúc bản đồ đã duyệt của 3 tầng.</p>
        </article>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-2 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{activeFloor.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{activeFloor.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {floors.map((floor) => (
              <button
                key={floor.id}
                type="button"
                onClick={() => onSelectFloor(floor.floor)}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                  floor.floor === selectedFloor
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900',
                )}
              >
                {floor.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-gray-200 bg-gray-50 p-4 md:p-6">
          {selectedLayout.kind === 'dual-wing' ? (
            <div className="grid grid-cols-[minmax(0,1fr)_58px_minmax(0,1fr)] gap-3 md:grid-cols-[minmax(0,1fr)_92px_minmax(0,1fr)] md:gap-5">
              <div className="space-y-3">
                <div className="px-1 text-center text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                  {selectedLayout.primaryWingLabel}
                </div>
                {renderWing(selectedFloorRooms.left, selectedRoomId, roomSummaryMap, onSelectRoom)}
              </div>

              <div className="relative rounded-3xl border border-dashed border-gray-300 bg-white/70">
                <div
                  className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold uppercase tracking-[0.28em] text-gray-400"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  {selectedLayout.corridorLabel}
                </div>
              </div>

              <div className="space-y-3">
                <div className="px-1 text-center text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                  {selectedLayout.secondaryWingLabel}
                </div>
                {renderWing(selectedFloorRooms.right, selectedRoomId, roomSummaryMap, onSelectRoom)}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)_58px] gap-3 md:grid-cols-[minmax(0,1fr)_92px] md:gap-5">
              <div className="space-y-3">
                <div className="px-1 text-center text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                  {selectedLayout.primaryWingLabel}
                </div>
                {renderWing(selectedFloorRooms.center, selectedRoomId, roomSummaryMap, onSelectRoom)}
              </div>

              <div className="relative rounded-3xl border border-dashed border-gray-300 bg-white/70">
                <div
                  className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold uppercase tracking-[0.28em] text-gray-400"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  {selectedLayout.corridorLabel}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
