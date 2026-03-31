/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMaterialConsolidationPayload,
  mapMaterialIntakeToSupplyRequest,
  mapMaintenanceIntakeToReport,
} from '@/lib/room-management/workflow';

test('material consolidation metadata keeps source intake provenance', () => {
  const payload = buildMaterialConsolidationPayload({
    roomId: 'r33',
    roomCode: 'P304',
    roomName: 'Phong Kham P304',
    floor: 3,
    reviewGroup: 'accounting_304',
    intakeIds: ['i1', 'i2'],
    items: [
      { name: 'Giay in', qty: 4, unit: 'ram', price: 75000 },
      { name: 'Muc in', qty: 1, unit: 'hop', price: 350000 },
    ],
  });

  assert.equal(payload.requestType, 'purchase');
  assert.equal(payload.metadata.workflowKind, 'room_material');
  assert.equal(payload.metadata.roomCode, 'P304');
  assert.equal(payload.metadata.reviewGroup, 'accounting_304');
  assert.deepEqual(payload.metadata.sourceIntakeIds, ['i1', 'i2']);
  assert.equal(payload.totalAmount, 650000);
});

test('backend room intakes map into the existing room UI view models', () => {
  const maintenance = mapMaintenanceIntakeToReport({
    id: 'rm-1',
    room_key: 'r33',
    title: 'Den hu',
    description: 'Can thay den moi',
    priority: 'high',
    status: 'in_review',
    requester_name: 'Tester',
    created_at: '2026-03-31T08:00:00Z',
    updated_at: '2026-03-31T08:30:00Z',
    metadata: { requestType: 'repair' },
  });

  const supply = mapMaterialIntakeToSupplyRequest(
    {
      id: 'rs-1',
      room_key: 'r11',
      title: 'Bo sung tui nilon',
      description: 'Ton kho dang thap',
      priority: 'urgent',
      status: 'submitted',
      requester_name: 'Tester',
      created_at: '2026-03-31T09:00:00Z',
      updated_at: '2026-03-31T09:15:00Z',
    },
    [{ id: 'item-1', item_name: 'Tui nilon', quantity: 5, unit: 'kg' }],
  );

  assert.equal(maintenance.roomId, 'r33');
  assert.equal(maintenance.status, 'triaged');
  assert.equal(maintenance.requestType, 'repair');
  assert.equal(supply.roomId, 'r11');
  assert.equal(supply.status, 'pending');
  assert.equal(supply.items[0].itemName, 'Tui nilon');
});
