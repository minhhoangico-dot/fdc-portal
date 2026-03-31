/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRoomManagementStats,
  buildRoomSummaryMap,
} from '../../src/lib/room-management/summary';

test('room summaries count open maintenance and pending supply per room', () => {
  const summary = buildRoomSummaryMap({
    maintenanceReports: [
      {
        id: 'm1',
        roomId: 'r4',
        title: 'Điều hòa lỗi',
        description: 'Không mát',
        requestType: 'incident',
        severity: 'high',
        status: 'new',
        reportedBy: 'Tester',
        createdAt: '2026-03-31T08:00:00Z',
        updatedAt: '2026-03-31T08:00:00Z',
      },
      {
        id: 'm2',
        roomId: 'r4',
        title: 'Đã sửa điều hòa',
        description: 'Xong',
        requestType: 'repair',
        severity: 'low',
        status: 'resolved',
        reportedBy: 'Tester',
        createdAt: '2026-03-31T09:00:00Z',
        updatedAt: '2026-03-31T09:00:00Z',
      },
    ],
    supplyRequests: [
      {
        id: 's1',
        roomId: 'r4',
        title: 'Vật tư P110',
        reason: 'Bổ sung cuối ca',
        priority: 'high',
        status: 'pending',
        requestedBy: 'Tester',
        createdAt: '2026-03-31T10:00:00Z',
        updatedAt: '2026-03-31T10:00:00Z',
        items: [],
      },
      {
        id: 's2',
        roomId: 'r11',
        title: 'Vật tư nhà thuốc',
        reason: 'Tồn kho thấp',
        priority: 'medium',
        status: 'approved',
        requestedBy: 'Tester',
        createdAt: '2026-03-31T10:30:00Z',
        updatedAt: '2026-03-31T10:30:00Z',
        items: [],
      },
    ],
  });

  const stats = buildRoomManagementStats(summary);

  assert.equal(summary.r4.openMaintenanceCount, 1);
  assert.equal(summary.r4.pendingSupplyCount, 1);
  assert.equal(stats.openMaintenanceCount, 1);
  assert.equal(stats.pendingSupplyCount, 1);
  assert.equal(stats.activeRoomCount, 38);
});
