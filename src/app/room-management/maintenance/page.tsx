/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaintenanceBoard } from '@/components/room-management/MaintenanceBoard';
import { useRoomManagement } from '@/contexts/RoomManagementContext';

export default function RoomManagementMaintenancePage() {
  const roomManagement = useRoomManagement();

  return (
    <MaintenanceBoard
      columns={roomManagement.maintenanceBoard}
      filters={roomManagement.maintenanceFilters}
      onFiltersChange={roomManagement.setMaintenanceFilters}
      onUpdateStatus={roomManagement.updateMaintenanceStatus}
    />
  );
}
