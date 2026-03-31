/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoomWorkflowCollections } from '@/lib/room-management/workflow';

test('workflow collections split backend intakes into maintenance and supply arrays', () => {
  const collections = buildRoomWorkflowCollections(
    [
      {
        id: 'm-1',
        room_key: 'r33',
        intake_type: 'maintenance',
        title: 'Den hu',
        description: 'Can thay',
        priority: 'high',
        status: 'in_review',
        requester_name: 'Tester',
        created_at: '2026-03-31T08:00:00Z',
        updated_at: '2026-03-31T08:30:00Z',
        metadata: { requestType: 'repair' },
      },
      {
        id: 's-1',
        room_key: 'r11',
        intake_type: 'material',
        title: 'Bo sung tui nilon',
        description: 'Ton kho thap',
        priority: 'urgent',
        status: 'submitted',
        requester_name: 'Tester',
        created_at: '2026-03-31T09:00:00Z',
        updated_at: '2026-03-31T09:15:00Z',
        metadata: {},
      },
    ],
    [{ id: 'item-1', intake_id: 's-1', item_name: 'Tui nilon', quantity: 5, unit: 'kg' }],
  );

  assert.equal(collections.maintenanceReports.length, 1);
  assert.equal(collections.supplyRequests.length, 1);
  assert.equal(collections.maintenanceReports[0].roomId, 'r33');
  assert.equal(collections.supplyRequests[0].items[0].itemName, 'Tui nilon');
});
