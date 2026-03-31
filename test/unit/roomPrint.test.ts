/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPrintableSupplyGroups } from '../../src/lib/room-management/print';

test('print helper groups room supply requests by floor then room', () => {
  const groups = buildPrintableSupplyGroups([
    {
      id: 's1',
      roomId: 'r11',
      title: 'Túi nilon',
      reason: 'Cần dùng trong ngày',
      priority: 'medium',
      status: 'pending',
      requestedBy: 'Tester',
      createdAt: '2026-03-31T08:00:00Z',
      updatedAt: '2026-03-31T08:00:00Z',
      items: [{ id: 'i1', itemName: 'Túi nilon nhỏ', quantity: 5, unit: 'kg' }],
    },
    {
      id: 's2',
      roomId: 'r4',
      title: 'Băng gạc',
      reason: 'Bổ sung cuối ca',
      priority: 'high',
      status: 'approved',
      requestedBy: 'Tester',
      createdAt: '2026-03-31T09:00:00Z',
      updatedAt: '2026-03-31T09:00:00Z',
      items: [{ id: 'i2', itemName: 'Băng gạc', quantity: 2, unit: 'gói' }],
    },
  ]);

  assert.equal(groups[0].floor, 1);
  assert.equal(groups[0].rooms[0].roomId, 'r4');
  assert.equal(groups[0].rooms[1].items[0].itemName, 'Túi nilon nhỏ');
});
