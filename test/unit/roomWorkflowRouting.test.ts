/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { getReviewGroupForRoom, getReviewerRoleForGroup } from '@/lib/room-management/routing';

test('room routing resolves reviewer roles from room review groups', () => {
  assert.equal(getReviewGroupForRoom('T1-NHATHUOC'), 'pharmacy');
  assert.equal(getReviewGroupForRoom('P304'), 'accounting_304');
  assert.equal(getReviewGroupForRoom('T2-XETNGHIEM'), 'lab');
  assert.equal(getReviewerRoleForGroup('accounting_304'), 'accountant');
  assert.equal(getReviewerRoleForGroup('general_care'), 'head_nurse');
});
