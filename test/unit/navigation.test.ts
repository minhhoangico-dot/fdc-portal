/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { getVisibleNavItems } from '../../src/lib/navigation';

test('super_admin sees a dedicated tv management nav item', () => {
  const items = getVisibleNavItems('super_admin');

  assert.equal(items.some((item) => item.path === '/tv-management'), true);
});

test('authenticated roles see the room management nav item', () => {
  const superAdminItems = getVisibleNavItems('super_admin');
  const staffItems = getVisibleNavItems('staff');

  assert.equal(superAdminItems.some((item) => item.path === '/room-management'), true);
  assert.equal(staffItems.some((item) => item.path === '/room-management'), true);
});

test('weekly report is no longer shown as a top-level nav item', () => {
  const items = getVisibleNavItems('super_admin');

  assert.equal(items.some((item) => item.path === '/weekly-report'), false);
});

test('non-admin roles do not see the tv management nav item', () => {
  const items = getVisibleNavItems('head_nurse');

  assert.equal(items.some((item) => item.path === '/tv-management'), false);
});

test('new business roles see only the modules granted by the permission matrix', () => {
  const pharmacyHeadItems = getVisibleNavItems('pharmacy_head');
  const hrRecordsItems = getVisibleNavItems('hr_records');
  const chiefAccountantItems = getVisibleNavItems('chief_accountant');

  assert.equal(pharmacyHeadItems.some((item) => item.path === '/pharmacy'), true);
  assert.equal(pharmacyHeadItems.some((item) => item.path === '/room-management'), true);
  assert.equal(pharmacyHeadItems.some((item) => item.path === '/admin'), false);

  assert.equal(hrRecordsItems.some((item) => item.path === '/approvals'), true);
  assert.equal(hrRecordsItems.some((item) => item.path === '/inventory'), false);
  assert.equal(hrRecordsItems.some((item) => item.path === '/admin'), false);

  assert.equal(chiefAccountantItems.some((item) => item.path === '/approvals'), true);
  assert.equal(chiefAccountantItems.some((item) => item.path === '/inventory'), true);
  assert.equal(chiefAccountantItems.some((item) => item.path === '/admin'), false);
});
