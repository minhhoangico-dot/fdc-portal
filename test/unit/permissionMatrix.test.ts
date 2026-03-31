/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { can, canAccessModule } from '@/lib/permissions/access';

test('new role matrix grants room review and finance actions only to intended roles', () => {
  assert.equal(can('pharmacy_head', 'room_management.review_group_queue'), true);
  assert.equal(can('staff', 'room_management.review_group_queue'), false);
  assert.equal(can('chief_accountant', 'approvals.forward_manual'), true);
  assert.equal(can('internal_accountant', 'approvals.forward_manual'), false);
  assert.equal(canAccessModule('hr_records', 'approvals'), true);
  assert.equal(canAccessModule('doctor', 'admin'), false);
});
