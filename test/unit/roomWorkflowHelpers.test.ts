/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMaterialConsolidationPayload } from '@/lib/room-management/workflow';

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
