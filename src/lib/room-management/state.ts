/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MAINTENANCE_SEED, SUPPLY_SEED, getRoomById } from '@/lib/room-management/catalog';
import { updateMaintenanceReportStatus } from '@/lib/room-management/maintenance';
import type {
  MaintenanceStatus,
  RoomDrawerTab,
  RoomManagementState,
  RoomMaintenanceReport,
  RoomSupplyRequest,
} from '@/types/roomManagement';

export type RoomManagementAction =
  | { type: 'select_floor'; payload: RoomManagementState['selectedFloor'] }
  | { type: 'select_room'; payload: { roomId: string; tab?: RoomDrawerTab } }
  | { type: 'close_room' }
  | { type: 'set_drawer_tab'; payload: RoomDrawerTab }
  | { type: 'create_maintenance_report'; payload: RoomMaintenanceReport }
  | { type: 'update_maintenance_status'; payload: { reportId: string; status: MaintenanceStatus } }
  | { type: 'create_supply_request'; payload: RoomSupplyRequest };

function cloneMaintenanceSeed() {
  return MAINTENANCE_SEED.map((report) => ({ ...report }));
}

function cloneSupplySeed() {
  return SUPPLY_SEED.map((request) => ({
    ...request,
    items: request.items.map((item) => ({ ...item })),
  }));
}

export function createInitialRoomManagementState(): RoomManagementState {
  return {
    selectedFloor: 1,
    selectedRoomId: null,
    activeDrawerTab: 'overview',
    maintenanceReports: cloneMaintenanceSeed(),
    supplyRequests: cloneSupplySeed(),
  };
}

export function roomManagementReducer(
  state: RoomManagementState,
  action: RoomManagementAction,
): RoomManagementState {
  switch (action.type) {
    case 'select_floor': {
      const selectedRoom = state.selectedRoomId ? getRoomById(state.selectedRoomId) : null;
      return {
        ...state,
        selectedFloor: action.payload,
        selectedRoomId: selectedRoom?.floor === action.payload ? state.selectedRoomId : null,
        activeDrawerTab: selectedRoom?.floor === action.payload ? state.activeDrawerTab : 'overview',
      };
    }
    case 'select_room': {
      const room = getRoomById(action.payload.roomId);
      if (!room) {
        return state;
      }

      return {
        ...state,
        selectedFloor: room.floor,
        selectedRoomId: room.id,
        activeDrawerTab: action.payload.tab ?? 'overview',
      };
    }
    case 'close_room':
      return {
        ...state,
        selectedRoomId: null,
        activeDrawerTab: 'overview',
      };
    case 'set_drawer_tab':
      return {
        ...state,
        activeDrawerTab: action.payload,
      };
    case 'create_maintenance_report':
      return {
        ...state,
        maintenanceReports: [action.payload, ...state.maintenanceReports],
      };
    case 'update_maintenance_status':
      return {
        ...state,
        maintenanceReports: updateMaintenanceReportStatus(
          state.maintenanceReports,
          action.payload.reportId,
          action.payload.status,
        ),
      };
    case 'create_supply_request':
      return {
        ...state,
        supplyRequests: [action.payload, ...state.supplyRequests],
      };
    default:
      return state;
  }
}
