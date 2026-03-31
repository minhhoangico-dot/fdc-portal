/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMaintenanceBoard,
  canTransitionMaintenanceStatus,
  filterMaintenanceReports,
} from '../../src/lib/room-management/maintenance';
import type { RoomMaintenanceReport } from '../../src/types/roomManagement';

test('maintenance helpers filter reports and keep status order stable', () => {
  const reports: RoomMaintenanceReport[] = [
    {
      id: 'm1',
      roomId: 'r4',
      title: 'Điều hòa hỏng',
      description: 'Phòng nóng',
      requestType: 'incident',
      severity: 'high',
      status: 'new',
      reportedBy: 'Tester',
      createdAt: '2026-03-31T08:00:00Z',
      updatedAt: '2026-03-31T08:00:00Z',
    },
    {
      id: 'm2',
      roomId: 'r15',
      title: 'Tắc bồn cầu',
      description: 'Khẩn cấp',
      requestType: 'repair',
      severity: 'urgent',
      status: 'in_progress',
      reportedBy: 'Tester',
      createdAt: '2026-03-31T09:00:00Z',
      updatedAt: '2026-03-31T09:00:00Z',
    },
  ];

  assert.equal(filterMaintenanceReports(reports, { floor: 1, status: 'all', severity: 'urgent' }).length, 1);
  assert.equal(canTransitionMaintenanceStatus('new', 'triaged'), true);
  assert.equal(canTransitionMaintenanceStatus('resolved', 'new'), false);
  assert.equal(buildMaintenanceBoard(reports)[0].status, 'new');
  assert.equal(buildMaintenanceBoard(reports)[2].status, 'in_progress');
});
