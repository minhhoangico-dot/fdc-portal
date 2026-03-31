/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialRoomManagementState,
  roomManagementReducer,
} from '../../src/lib/room-management/state';

test('room management reducer appends maintenance and supply actions into shared session state', () => {
  const state = createInitialRoomManagementState();

  const withMaintenance = roomManagementReducer(state, {
    type: 'create_maintenance_report',
    payload: {
      id: 'm-local',
      roomId: 'r4',
      title: 'Đèn chập chờn',
      description: 'Cần kiểm tra',
      requestType: 'incident',
      severity: 'medium',
      status: 'new',
      reportedBy: 'Tester',
      createdAt: '2026-03-31T11:00:00Z',
      updatedAt: '2026-03-31T11:00:00Z',
    },
  });

  const withSupply = roomManagementReducer(withMaintenance, {
    type: 'create_supply_request',
    payload: {
      id: 's-local',
      roomId: 'r4',
      title: 'Bổ sung khẩu trang',
      reason: 'Tồn kho thấp',
      priority: 'medium',
      status: 'pending',
      requestedBy: 'Tester',
      createdAt: '2026-03-31T11:05:00Z',
      updatedAt: '2026-03-31T11:05:00Z',
      items: [{ id: 'i-local', itemName: 'Khẩu trang', quantity: 2, unit: 'hộp' }],
    },
  });

  assert.equal(withMaintenance.maintenanceReports[0].id, 'm-local');
  assert.equal(withSupply.supplyRequests[0].id, 's-local');
  assert.equal(withSupply.maintenanceReports.length, state.maintenanceReports.length + 1);
  assert.equal(withSupply.supplyRequests.length, state.supplyRequests.length + 1);
});
