/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { RequestLineItem, RequestMetadata, RequestType } from '@/types/request';
import type { Role } from '@/types/user';
import type { RoomFloor } from '@/types/roomManagement';

export type RoomWorkflowKind = 'room_material' | 'room_maintenance';
export type RoomReviewGroup = 'pharmacy' | 'accounting_304' | 'lab' | 'general_care';

export interface RoomWorkflowMetadata extends RequestMetadata {
  workflowKind?: RoomWorkflowKind;
  roomId?: string;
  roomCode?: string;
  roomName?: string;
  floor?: RoomFloor;
  reviewGroup?: RoomReviewGroup;
  sourceIntakeIds?: string[];
  originModule?: 'room_management';
}

export interface MaterialConsolidationInput {
  roomId: string;
  roomCode: string;
  roomName: string;
  floor: RoomFloor;
  reviewGroup: RoomReviewGroup;
  intakeIds: string[];
  items: RequestLineItem[];
}

export interface MaterialConsolidationPayload {
  requestType: RequestType;
  metadata: RoomWorkflowMetadata;
  totalAmount: number;
}

export type RoomReviewerRole = Extract<
  Role,
  'head_nurse' | 'pharmacy_head' | 'accounting_supervisor' | 'lab_head'
>;
