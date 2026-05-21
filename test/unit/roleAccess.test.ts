/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FULL_ACCESS_ROLES,
  canRoleBypassApprovalAssignment,
  hasFullPortalAdminAccess,
  isOnsiteAccessBypassRole,
} from '@/lib/role-access';

test('head_nurse has full portal access but is not an onsite bypass role', () => {
  assert.equal(FULL_ACCESS_ROLES.includes('head_nurse'), true);
  assert.equal(hasFullPortalAdminAccess('head_nurse'), true);
  assert.equal(isOnsiteAccessBypassRole('head_nurse'), false);
  assert.equal(isOnsiteAccessBypassRole('super_admin'), true);
});

test('approval-assignment bypass remains restricted to the real super_admin role', () => {
  assert.equal(canRoleBypassApprovalAssignment('super_admin'), true);
  assert.equal(canRoleBypassApprovalAssignment('head_nurse'), false);
});
