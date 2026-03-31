/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RoomFloor = 1 | 2 | 3;
export type RoomWing = 'left' | 'right' | 'center';
export type RoomType =
  | 'reception'
  | 'waiting'
  | 'medical'
  | 'storage'
  | 'lab'
  | 'pharmacy'
  | 'utility'
  | 'vaccine'
  | 'stairs'
  | 'office'
  | 'inpatient';
export type RoomLayoutKind = 'dual-wing' | 'single-wing';
export type RoomDrawerTab = 'overview' | 'maintenance' | 'supply';
export type MaintenanceRequestType = 'incident' | 'repair' | 'inspection';
export type MaintenanceSeverity = 'low' | 'medium' | 'high' | 'urgent';
export type MaintenanceStatus =
  | 'new'
  | 'triaged'
  | 'in_progress'
  | 'waiting_material'
  | 'resolved'
  | 'cancelled';
export type SupplyPriority = 'low' | 'medium' | 'high' | 'urgent';
export type SupplyStatus = 'pending' | 'approved' | 'fulfilled' | 'cancelled';

export interface RoomCatalogEntry {
  id: string;
  code: string;
  name: string;
  floor: RoomFloor;
  wing: RoomWing;
  roomType: RoomType;
  status: 'active';
  positionOrder: number;
}

export interface RoomFloorDefinition {
  id: `floor-${RoomFloor}`;
  floor: RoomFloor;
  label: string;
  title: string;
  description: string;
  kind: RoomLayoutKind;
  corridorLabel: string;
  primaryWingLabel: string;
  secondaryWingLabel?: string;
}

export interface RoomLayoutDefinition {
  kind: RoomLayoutKind;
  corridorLabel: string;
  primaryWingLabel: string;
  secondaryWingLabel?: string;
}

export interface RoomFloorGrouping {
  left: RoomCatalogEntry[];
  right: RoomCatalogEntry[];
  center: RoomCatalogEntry[];
}

export interface RoomMaintenanceReport {
  id: string;
  roomId: string;
  title: string;
  description: string;
  requestType: MaintenanceRequestType;
  severity: MaintenanceSeverity;
  status: MaintenanceStatus;
  reportedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomSupplyItem {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
}

export interface RoomSupplyRequest {
  id: string;
  roomId: string;
  title: string;
  reason: string;
  priority: SupplyPriority;
  status: SupplyStatus;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
  items: RoomSupplyItem[];
}

export interface RoomSummary {
  roomId: string;
  openMaintenanceCount: number;
  pendingSupplyCount: number;
  latestActivityAt: string | null;
}

export interface RoomManagementStats {
  openMaintenanceCount: number;
  pendingSupplyCount: number;
  activeRoomCount: number;
  activeFloorCount: number;
}

export interface RoomActivityItem {
  id: string;
  roomId: string;
  title: string;
  kind: 'maintenance' | 'supply';
  status: string;
  createdAt: string;
}

export interface MaintenanceFilters {
  floor: RoomFloor | 'all';
  status: MaintenanceStatus | 'all';
  severity: MaintenanceSeverity | 'all';
  search?: string;
}

export interface MaintenanceBoardColumn {
  status: MaintenanceStatus;
  label: string;
  reports: RoomMaintenanceReport[];
}

export interface PrintableSupplyItem {
  itemName: string;
  quantity: number;
  unit: string;
}

export interface PrintableSupplyRoomGroup {
  roomId: string;
  roomCode: string;
  roomName: string;
  items: PrintableSupplyItem[];
  requestCount: number;
}

export interface PrintableSupplyFloorGroup {
  floor: RoomFloor;
  label: string;
  rooms: PrintableSupplyRoomGroup[];
}

export interface PrintFilters {
  floor: RoomFloor | 'all';
  status: SupplyStatus | 'all';
}

export interface RoomManagementState {
  selectedFloor: RoomFloor;
  selectedRoomId: string | null;
  activeDrawerTab: RoomDrawerTab;
  maintenanceReports: RoomMaintenanceReport[];
  supplyRequests: RoomSupplyRequest[];
}

export interface CreateMaintenanceReportInput {
  roomId: string;
  title: string;
  description: string;
  requestType: MaintenanceRequestType;
  severity: MaintenanceSeverity;
}

export interface CreateSupplyRequestInput {
  roomId: string;
  title: string;
  reason: string;
  priority: SupplyPriority;
  items: Array<{
    itemName: string;
    quantity: number;
    unit: string;
  }>;
}
