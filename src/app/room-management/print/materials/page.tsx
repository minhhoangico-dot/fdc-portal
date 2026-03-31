/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaterialsPrintPreview } from '@/components/room-management/MaterialsPrintPreview';
import { useRoomManagement } from '@/contexts/RoomManagementContext';

export default function RoomManagementMaterialsPrintPage() {
  const roomManagement = useRoomManagement();

  return (
    <MaterialsPrintPreview
      groups={roomManagement.printableSupplyGroups}
      filters={roomManagement.printFilters}
      onFiltersChange={roomManagement.setPrintFilters}
    />
  );
}
