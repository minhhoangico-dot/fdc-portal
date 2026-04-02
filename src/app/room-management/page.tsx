/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClipboardList, Layers3, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FloorPlanCanvas } from '@/components/room-management/FloorPlanCanvas';
import { RoomDrawer } from '@/components/room-management/RoomDrawer';
import { useRoomManagement } from '@/contexts/RoomManagementContext';

export default function RoomManagementPage() {
  const ctx = useRoomManagement();
  const { selectedRoom, roomSummaryMap, state } = ctx;

  const handleQuickSupply = (roomId: string) => {
    ctx.selectRoom(roomId, 'supply');
  };

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
              <p className="text-sm text-gray-500">
                Sơ đồ trực quan theo tầng. Nhấn phòng để xem chi tiết & đề xuất vật tư.
              </p>
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

      {/* ── Floor Plan ──────────────────────────────────────── */}
      <FloorPlanCanvas
        floors={ctx.floors}
        selectedFloor={state.selectedFloor}
        selectedLayout={ctx.selectedLayout}
        selectedFloorRooms={ctx.selectedFloorRooms}
        selectedRoomId={state.selectedRoomId}
        roomSummaryMap={roomSummaryMap}
        onSelectFloor={ctx.selectFloor}
        onSelectRoom={(roomId) => ctx.selectRoom(roomId)}
        onQuickSupply={handleQuickSupply}
      />

      {/* ── Room Detail Drawer ──────────────────────────────── */}
      <RoomDrawer
        room={selectedRoom}
        activeTab={state.activeDrawerTab}
        summary={selectedRoom ? (roomSummaryMap[selectedRoom.id] ?? null) : null}
        activity={ctx.recentActivity}
        maintenanceReports={state.maintenanceReports.filter(
          (r) => selectedRoom && r.roomId === selectedRoom.id,
        )}
        supplyRequests={state.supplyRequests.filter(
          (r) => selectedRoom && r.roomId === selectedRoom.id,
        )}
        onClose={ctx.closeRoom}
        onTabChange={ctx.setDrawerTab}
        onCreateMaintenance={ctx.createMaintenanceReport}
        onCreateSupply={ctx.createSupplyRequest}
        autoOpenSupplyForm={state.activeDrawerTab === 'supply'}
      />
    </div>
  );
}
