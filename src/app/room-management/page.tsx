/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FloorPlanCanvas } from '@/components/room-management/FloorPlanCanvas';
import { RoomDrawer } from '@/components/room-management/RoomDrawer';
import { useRoomManagement } from '@/contexts/RoomManagementContext';

export default function RoomManagementPage() {
  const roomManagement = useRoomManagement();
  const { selectedRoom, roomSummaryMap, recentActivity, state } = roomManagement;

  const handleQuickSupply = React.useCallback(
    (roomId: string) => {
      roomManagement.selectRoom(roomId, 'supply');
    },
    [roomManagement],
  );

  return (
    <>
      <FloorPlanCanvas
        floors={roomManagement.floors}
        selectedFloor={state.selectedFloor}
        selectedLayout={roomManagement.selectedLayout}
        selectedFloorRooms={roomManagement.selectedFloorRooms}
        selectedRoomId={state.selectedRoomId}
        roomSummaryMap={roomSummaryMap}
        stats={roomManagement.stats}
        onSelectFloor={roomManagement.selectFloor}
        onSelectRoom={roomManagement.selectRoom}
        onQuickSupply={handleQuickSupply}
      />

      <RoomDrawer
        room={selectedRoom}
        activeTab={state.activeDrawerTab}
        summary={selectedRoom ? roomSummaryMap[selectedRoom.id] : null}
        activity={recentActivity}
        maintenanceReports={state.maintenanceReports.filter((report) => report.roomId === selectedRoom?.id)}
        supplyRequests={state.supplyRequests.filter((request) => request.roomId === selectedRoom?.id)}
        onClose={roomManagement.closeRoom}
        onTabChange={roomManagement.setDrawerTab}
        onCreateMaintenance={roomManagement.createMaintenanceReport}
        onCreateSupply={roomManagement.createSupplyRequest}
        autoOpenSupplyForm={state.activeDrawerTab === 'supply'}
      />
    </>
  );
}
