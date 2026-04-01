/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClipboardList, Layers3, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROOM_CATALOG } from '@/lib/room-management/catalog';
import { RoomDetailPanel } from '@/components/room-management/RoomDetailPanel';
import { RoomSidebar } from '@/components/room-management/RoomSidebar';
import { useRoomManagement } from '@/contexts/RoomManagementContext';

export default function RoomManagementPage() {
  const ctx = useRoomManagement();
  const { selectedRoom, roomSummaryMap, state } = ctx;

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Quản lý phòng</h1>
              <p className="text-sm text-gray-500">Chọn phòng bên trái, đề xuất vật tư bên phải.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              to="/room-management/maintenance"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              <Wrench className="h-4 w-4" />
              Bảo trì
            </Link>
            <Link
              to="/room-management/print/materials"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Layers3 className="h-4 w-4" />
              In tổng hợp
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
            <p className="text-xl font-bold text-gray-900">{ctx.stats.openMaintenanceCount}</p>
            <p className="text-[11px] font-medium text-gray-500">Sự cố mở</p>
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
            <p className="text-xl font-bold text-gray-900">{ctx.stats.pendingSupplyCount}</p>
            <p className="text-[11px] font-medium text-gray-500">Đề xuất chờ</p>
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
            <p className="text-xl font-bold text-gray-900">{ctx.stats.activeRoomCount}</p>
            <p className="text-[11px] font-medium text-gray-500">Phòng</p>
          </div>
        </div>
      </section>

      {/* ── Master-Detail Layout ────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Left: Room List */}
        <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] lg:self-start">
          <RoomSidebar
            floors={ctx.floors}
            rooms={ROOM_CATALOG}
            selectedFloor={state.selectedFloor}
            selectedRoomId={state.selectedRoomId}
            roomSummaryMap={roomSummaryMap}
            onSelectFloor={ctx.selectFloor}
            onSelectRoom={ctx.selectRoom}
          />
        </div>

        {/* Right: Detail Panel */}
        <div className="min-w-0">
          {selectedRoom && roomSummaryMap[selectedRoom.id] ? (
            <RoomDetailPanel
              room={selectedRoom}
              summary={roomSummaryMap[selectedRoom.id]}
              supplyRequests={state.supplyRequests.filter((r) => r.roomId === selectedRoom.id)}
              maintenanceReports={state.maintenanceReports.filter((r) => r.roomId === selectedRoom.id)}
              onCreateSupply={ctx.createSupplyRequest}
              onCreateMaintenance={ctx.createMaintenanceReport}
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-20 text-center">
              <ClipboardList className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-500">Chọn một phòng để bắt đầu đề xuất vật tư</p>
              <p className="mt-1 text-xs text-gray-400">Danh sách phòng theo từng tầng nằm bên trái</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
