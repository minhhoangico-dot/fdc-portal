/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import {
  ROOM_FLOORS,
  ROOM_LAYOUTS,
  getRoomById,
  getRoomsForFloor,
} from '@/lib/room-management/catalog';
import {
  buildMaintenanceBoard,
  filterMaintenanceReports,
} from '@/lib/room-management/maintenance';
import { buildPrintableSupplyGroups } from '@/lib/room-management/print';
import {
  createInitialRoomManagementState,
  roomManagementReducer,
} from '@/lib/room-management/state';
import {
  buildRoomManagementStats,
  buildRoomSummaryMap,
  getRoomRecentActivity,
} from '@/lib/room-management/summary';
import { useRoomWorkflow } from '@/viewmodels/useRoomWorkflow';
import type {
  CreateMaintenanceReportInput,
  CreateSupplyRequestInput,
  MaintenanceFilters,
  MaintenanceStatus,
  PrintFilters,
  RoomDrawerTab,
  RoomManagementState,
  RoomMaintenanceReport,
} from '@/types/roomManagement';

interface RoomManagementContextValue {
  state: RoomManagementState;
  floors: typeof ROOM_FLOORS;
  selectedRoom: ReturnType<typeof getRoomById>;
  selectedFloorRooms: ReturnType<typeof getRoomsForFloor>;
  selectedLayout: (typeof ROOM_LAYOUTS)[RoomManagementState['selectedFloor']];
  roomSummaryMap: ReturnType<typeof buildRoomSummaryMap>;
  stats: ReturnType<typeof buildRoomManagementStats>;
  recentActivity: ReturnType<typeof getRoomRecentActivity>;
  maintenanceBoard: ReturnType<typeof buildMaintenanceBoard>;
  filteredMaintenanceReports: RoomMaintenanceReport[];
  printableSupplyGroups: ReturnType<typeof buildPrintableSupplyGroups>;
  isLoading: boolean;
  workflowError: string | null;
  selectFloor: (floor: RoomManagementState['selectedFloor']) => void;
  selectRoom: (roomId: string, tab?: RoomDrawerTab) => void;
  closeRoom: () => void;
  setDrawerTab: (tab: RoomDrawerTab) => void;
  createMaintenanceReport: (input: CreateMaintenanceReportInput) => void;
  updateMaintenanceStatus: (reportId: string, status: MaintenanceStatus) => void;
  createSupplyRequest: (input: CreateSupplyRequestInput) => void;
  maintenanceFilters: MaintenanceFilters;
  setMaintenanceFilters: React.Dispatch<React.SetStateAction<MaintenanceFilters>>;
  printFilters: PrintFilters;
  setPrintFilters: React.Dispatch<React.SetStateAction<PrintFilters>>;
}

const RoomManagementContext = React.createContext<RoomManagementContextValue | null>(null);

export function RoomManagementProvider() {
  const [uiState, dispatch] = React.useReducer(
    roomManagementReducer,
    undefined,
    createInitialRoomManagementState,
  );
  const workflow = useRoomWorkflow();
  const [maintenanceFilters, setMaintenanceFilters] = React.useState<MaintenanceFilters>({
    floor: 'all',
    status: 'all',
    severity: 'all',
    search: '',
  });
  const [printFilters, setPrintFilters] = React.useState<PrintFilters>({
    floor: 'all',
    status: 'all',
  });

  const state = React.useMemo<RoomManagementState>(
    () => ({
      ...uiState,
      maintenanceReports: workflow.maintenanceReports,
      supplyRequests: workflow.supplyRequests,
    }),
    [uiState, workflow.maintenanceReports, workflow.supplyRequests],
  );

  const roomSummaryMap = React.useMemo(
    () =>
      buildRoomSummaryMap({
        maintenanceReports: state.maintenanceReports,
        supplyRequests: state.supplyRequests,
      }),
    [state.maintenanceReports, state.supplyRequests],
  );
  const stats = React.useMemo(() => buildRoomManagementStats(roomSummaryMap), [roomSummaryMap]);
  const selectedRoom = state.selectedRoomId ? getRoomById(state.selectedRoomId) : null;
  const selectedFloorRooms = React.useMemo(
    () => getRoomsForFloor(state.selectedFloor),
    [state.selectedFloor],
  );
  const recentActivity = React.useMemo(
    () =>
      selectedRoom
        ? getRoomRecentActivity(selectedRoom.id, state.maintenanceReports, state.supplyRequests)
        : [],
    [selectedRoom, state.maintenanceReports, state.supplyRequests],
  );
  const filteredMaintenanceReports = React.useMemo(
    () => filterMaintenanceReports(state.maintenanceReports, maintenanceFilters),
    [maintenanceFilters, state.maintenanceReports],
  );
  const maintenanceBoard = React.useMemo(
    () => buildMaintenanceBoard(filteredMaintenanceReports),
    [filteredMaintenanceReports],
  );
  const printableSupplyGroups = React.useMemo(
    () => buildPrintableSupplyGroups(state.supplyRequests, printFilters),
    [printFilters, state.supplyRequests],
  );

  const value = React.useMemo<RoomManagementContextValue>(
    () => ({
      state,
      floors: ROOM_FLOORS,
      selectedRoom,
      selectedFloorRooms,
      selectedLayout: ROOM_LAYOUTS[state.selectedFloor],
      roomSummaryMap,
      stats,
      recentActivity,
      maintenanceBoard,
      filteredMaintenanceReports,
      printableSupplyGroups,
      isLoading: workflow.isLoading,
      workflowError: workflow.error,
      selectFloor: (floor) => dispatch({ type: 'select_floor', payload: floor }),
      selectRoom: (roomId, tab) => dispatch({ type: 'select_room', payload: { roomId, tab } }),
      closeRoom: () => dispatch({ type: 'close_room' }),
      setDrawerTab: (tab) => dispatch({ type: 'set_drawer_tab', payload: tab }),
      createMaintenanceReport: (input) => void workflow.createMaintenanceReport(input),
      updateMaintenanceStatus: (reportId, status) =>
        void workflow.updateMaintenanceStatus(reportId, status),
      createSupplyRequest: (input) => void workflow.createSupplyRequest(input),
      maintenanceFilters,
      setMaintenanceFilters,
      printFilters,
      setPrintFilters,
    }),
    [
      filteredMaintenanceReports,
      maintenanceBoard,
      maintenanceFilters,
      printFilters,
      printableSupplyGroups,
      recentActivity,
      roomSummaryMap,
      selectedFloorRooms,
      selectedRoom,
      state,
      stats,
      workflow.error,
      workflow.isLoading,
      workflow,
    ],
  );

  return (
    <RoomManagementContext.Provider value={value}>
      <Outlet />
    </RoomManagementContext.Provider>
  );
}

export function useRoomManagement() {
  const context = React.useContext(RoomManagementContext);
  if (!context) {
    throw new Error('useRoomManagement must be used within RoomManagementProvider');
  }

  return context;
}
