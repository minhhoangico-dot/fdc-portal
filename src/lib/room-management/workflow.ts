/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  MaterialConsolidationInput,
  MaterialConsolidationPayload,
  RoomWorkflowKind,
  RoomWorkflowMetadata,
} from '@/types/roomWorkflow';

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
