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
  const clinicStaffItems = getVisibleNavItems('clinic_staff');

  assert.equal(superAdminItems.some((item) => item.path === '/room-management'), true);
  assert.equal(clinicStaffItems.some((item) => item.path === '/room-management'), true);
});

test('weekly report is no longer shown as a top-level nav item', () => {
  const items = getVisibleNavItems('super_admin');

  assert.equal(items.some((item) => item.path === '/weekly-report'), false);
});

test('non-admin roles do not see the tv management nav item', () => {
  const items = getVisibleNavItems('head_nurse');

  assert.equal(items.some((item) => item.path === '/tv-management'), false);
});

test('department-specific roles see correct modules', () => {
  const pharmacyHeadItems = getVisibleNavItems('pharmacy_head');
  const internalAccountantItems = getVisibleNavItems('internal_accountant');
  const businessHeadItems = getVisibleNavItems('business_head');

  assert.equal(pharmacyHeadItems.some((item) => item.path === '/pharmacy'), true);
  assert.equal(pharmacyHeadItems.some((item) => item.path === '/room-management'), true);
  assert.equal(pharmacyHeadItems.some((item) => item.path === '/admin'), false);

  assert.equal(internalAccountantItems.some((item) => item.path === '/approvals'), true);
  assert.equal(internalAccountantItems.some((item) => item.path === '/inventory'), true);
  assert.equal(internalAccountantItems.some((item) => item.path === '/admin'), false);

  assert.equal(businessHeadItems.some((item) => item.path === '/approvals'), true);
  assert.equal(businessHeadItems.some((item) => item.path === '/admin'), false);
});

test('department staff roles see limited modules', () => {
  const pharmacyStaffItems = getVisibleNavItems('pharmacy_staff');
  const labStaffItems = getVisibleNavItems('lab_staff');
  const businessStaffItems = getVisibleNavItems('business_staff');

  assert.equal(pharmacyStaffItems.some((item) => item.path === '/pharmacy'), true);
  assert.equal(pharmacyStaffItems.some((item) => item.path === '/inventory'), true);
  assert.equal(pharmacyStaffItems.some((item) => item.path === '/approvals'), false);

  assert.equal(labStaffItems.some((item) => item.path === '/pharmacy'), false);
  assert.equal(labStaffItems.some((item) => item.path === '/admin'), false);

  assert.equal(businessStaffItems.some((item) => item.path === '/pharmacy'), false);
  assert.equal(businessStaffItems.some((item) => item.path === '/inventory'), false);
});

test('all roles see the org chart nav item', () => {
  const clinicStaffItems = getVisibleNavItems('clinic_staff');
  const superAdminItems = getVisibleNavItems('super_admin');

  assert.equal(clinicStaffItems.some((item) => item.path === '/org-chart'), true);
  assert.equal(superAdminItems.some((item) => item.path === '/org-chart'), true);
});
