/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  MaterialConsolidationInput,
  MaterialConsolidationPayload,
  RoomReviewGroup,
  RoomReviewerRole,
  RoomWorkflowIntake,
  RoomWorkflowIntakeItem,
  RoomWorkflowIntakeStatus,
  RoomWorkflowKind,
  RoomWorkflowMetadata,
} from '@/types/roomWorkflow';
import type {
  MaintenanceStatus,
  RoomMaintenanceReport,
  RoomSupplyRequest,
  SupplyStatus,
} from '@/types/roomManagement';

export function buildRoomWorkflowMetadata(
  workflowKind: RoomWorkflowKind,
  input: Omit<MaterialConsolidationInput, 'items'>,
): RoomWorkflowMetadata {
  return {
    workflowKind,
    roomId: input.roomId,
    roomCode: input.roomCode,
    roomName: input.roomName,
    floor: input.floor,
    reviewGroup: input.reviewGroup,
    sourceIntakeIds: input.intakeIds,
    originModule: 'room_management',
  };
}

export function buildMaterialConsolidationPayload(
  input: MaterialConsolidationInput,
): MaterialConsolidationPayload {
  const totalAmount = input.items.reduce(
    (sum, item) => sum + item.qty * (item.price || 0),
    0,
  );

  return {
    requestType: 'purchase',
    metadata: {
      ...buildRoomWorkflowMetadata('room_material', input),
      items: input.items,
    },
    totalAmount,
  };
}

export function aggregateRoomIntakeItems(
  items: Array<{
    item_name: string;
    quantity: number;
    unit: string;
  }>,
) {
  const grouped = new Map<string, { name: string; qty: number; unit: string }>();

  for (const item of items) {
    const key = `${item.item_name.trim().toLowerCase()}::${item.unit.trim().toLowerCase()}`;
    const current = grouped.get(key);

    if (current) {
      current.qty += Number(item.quantity);
      continue;
    }

    grouped.set(key, {
      name: item.item_name.trim(),
      qty: Number(item.quantity),
      unit: item.unit.trim(),
    });
  }

  return Array.from(grouped.values());
}

function mapIntakeStatusToMaintenanceStatus(status: string): MaintenanceStatus {
  switch (status) {
    case 'submitted':
      return 'new';
    case 'in_review':
      return 'triaged';
    case 'consolidated':
    case 'promoted':
      return 'in_progress';
    case 'approved':
      return 'resolved';
    case 'rejected':
    case 'cancelled':
      return 'cancelled';
    default:
      return 'new';
  }
}

function mapIntakeStatusToSupplyStatus(status: string): SupplyStatus {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'cancelled':
    case 'rejected':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function normalizeRoomWorkflowPriority(priority?: string | null): 'low' | 'normal' | 'high' | 'urgent' {
  if (priority === 'low' || priority === 'normal' || priority === 'high' || priority === 'urgent') {
    return priority;
  }

  return 'normal';
}

export function mapRoomIntakeToWorkflowIntake(
  row: {
    id: string;
    room_key?: string | null;
    room_code?: string | null;
    room_name?: string | null;
    floor?: number | null;
    intake_type: string;
    title: string;
    description?: string | null;
    priority?: string | null;
    review_group?: string | null;
    reviewer_role?: string | null;
    status: string;
    requester_id?: string | null;
    requester_name?: string | null;
    created_at: string;
    updated_at?: string | null;
    metadata?: Record<string, unknown> | null;
  },
  items: Array<{
    id: string;
    intake_id: string;
    item_name: string;
    quantity: number;
    unit: string;
  }>,
): RoomWorkflowIntake {
  const metadata = (row.metadata || {}) as RoomWorkflowMetadata;

  return {
    id: row.id,
    intakeType: row.intake_type === 'maintenance' ? 'maintenance' : 'material',
    title: row.title,
    description: row.description || '',
    roomKey: row.room_key || String(metadata.roomId || ''),
    roomCode: row.room_code || metadata.roomCode || '',
    roomName: row.room_name || metadata.roomName || '',
    floor: Number(row.floor ?? metadata.floor ?? 1) as RoomWorkflowIntake['floor'],
    reviewGroup: (row.review_group || metadata.reviewGroup || 'general_care') as RoomReviewGroup,
    reviewerRole: (row.reviewer_role || 'head_nurse') as RoomReviewerRole,
    status: row.status as RoomWorkflowIntakeStatus,
    priority: normalizeRoomWorkflowPriority(row.priority),
    requesterId: row.requester_id || '',
    requesterName: row.requester_name || 'Unknown',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    metadata,
    items: items.map<RoomWorkflowIntakeItem>((item) => ({
      id: item.id,
      intakeId: item.intake_id,
      itemName: item.item_name,
      quantity: Number(item.quantity),
      unit: item.unit,
    })),
  };
}

export function mapMaintenanceIntakeToReport(row: {
  id: string;
  room_key?: string | null;
  title: string;
  description?: string | null;
  priority?: string | null;
  status: string;
  requester_name?: string | null;
  created_at: string;
  updated_at?: string | null;
  metadata?: Record<string, unknown> | null;
}): RoomMaintenanceReport {
  return {
    id: row.id,
    roomId: row.room_key || String(row.metadata?.roomId || ''),
    title: row.title,
    description: row.description || '',
    requestType:
      row.metadata?.requestType === 'repair' || row.metadata?.requestType === 'inspection'
        ? row.metadata.requestType
        : 'incident',
    severity:
      row.priority === 'low' || row.priority === 'medium' || row.priority === 'high' || row.priority === 'urgent'
        ? row.priority
        : 'medium',
    status: mapIntakeStatusToMaintenanceStatus(row.status),
    reportedBy: row.requester_name || 'Unknown',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

export function mapMaterialIntakeToSupplyRequest(
  row: {
    id: string;
    room_key?: string | null;
    title: string;
    description?: string | null;
    priority?: string | null;
    status: string;
    requester_name?: string | null;
    created_at: string;
    updated_at?: string | null;
  },
  items: Array<{
    id: string;
    item_name: string;
    quantity: number;
    unit: string;
  }>,
): RoomSupplyRequest {
  return {
    id: row.id,
    roomId: row.room_key || '',
    title: row.title,
    reason: row.description || '',
    priority:
      row.priority === 'low' || row.priority === 'medium' || row.priority === 'high' || row.priority === 'urgent'
        ? row.priority
        : 'medium',
    status: mapIntakeStatusToSupplyStatus(row.status),
    requestedBy: row.requester_name || 'Unknown',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    items: items.map((item) => ({
      id: item.id,
      itemName: item.item_name,
      quantity: Number(item.quantity),
      unit: item.unit,
    })),
  };
}

export function buildRoomWorkflowCollections(
  intakes: Array<{
    id: string;
    room_key?: string | null;
    intake_type: string;
    title: string;
    description?: string | null;
    priority?: string | null;
    status: string;
    requester_name?: string | null;
    created_at: string;
    updated_at?: string | null;
    metadata?: Record<string, unknown> | null;
  }>,
  items: Array<{
    id: string;
    intake_id: string;
    item_name: string;
    quantity: number;
    unit: string;
  }>,
) {
  const itemsByIntakeId = new Map<string, typeof items>();

  for (const item of items) {
    const current = itemsByIntakeId.get(item.intake_id) ?? [];
    current.push(item);
    itemsByIntakeId.set(item.intake_id, current);
  }

  const maintenanceReports: RoomMaintenanceReport[] = [];
  const supplyRequests: RoomSupplyRequest[] = [];
  const reviewerIntakes: RoomWorkflowIntake[] = [];

  for (const intake of intakes) {
    const intakeItems = itemsByIntakeId.get(intake.id) ?? [];
    reviewerIntakes.push(mapRoomIntakeToWorkflowIntake(intake, intakeItems));

    if (intake.intake_type === 'maintenance') {
      maintenanceReports.push(mapMaintenanceIntakeToReport(intake));
      continue;
    }

    if (intake.intake_type === 'material') {
      supplyRequests.push(
        mapMaterialIntakeToSupplyRequest(
          intake,
          intakeItems,
        ),
      );
    }
  }

  return { maintenanceReports, supplyRequests, reviewerIntakes };
}
