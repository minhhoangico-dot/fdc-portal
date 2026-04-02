/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { can, canAccessModule } from '@/lib/permissions/access';

test('role matrix grants room review and finance actions only to intended roles', () => {
  assert.equal(can('pharmacy_head', 'room_management.review_group_queue'), true);
  assert.equal(can('clinic_staff', 'room_management.review_group_queue'), false);
  assert.equal(can('accountant', 'room_management.review_group_queue'), true);
  assert.equal(can('accountant', 'room_management.consolidate_materials'), true);
  assert.equal(can('super_admin', 'approvals.forward_manual'), true);
  assert.equal(can('internal_accountant', 'approvals.forward_manual'), false);
  assert.equal(canAccessModule('internal_accountant', 'approvals'), true);
  assert.equal(canAccessModule('clinic_staff', 'admin'), false);
});

test('department-specific staff roles get appropriate module access', () => {
  assert.equal(can('pharmacy_staff', 'pharmacy.view'), true);
  assert.equal(can('pharmacy_staff', 'pharmacy.operate'), false);
  assert.equal(can('pharmacy_staff', 'inventory.view'), true);
  assert.equal(can('lab_staff', 'lab_dashboard.view'), true);
  assert.equal(can('lab_staff', 'lab_dashboard.operate'), false);
  assert.equal(can('business_staff', 'pharmacy.view'), false);
  assert.equal(can('clinic_staff', 'lab_dashboard.view'), false);
});

test('business_head has approver permissions', () => {
  assert.equal(can('business_head', 'approvals.review_assigned'), true);
  assert.equal(can('business_head', 'approvals.approve'), true);
  assert.equal(can('business_head', 'approvals.reject'), true);
  assert.equal(can('business_head', 'requests.view_assigned'), true);
  assert.equal(can('business_head', 'approvals.forward_manual'), false);
});

test('super_admin absorbs all former chief_accountant permissions', () => {
  assert.equal(can('super_admin', 'approvals.forward_manual'), true);
  assert.equal(can('super_admin', 'requests.view_all'), true);
  assert.equal(can('super_admin', 'room_management.review_group_queue'), true);
  assert.equal(can('super_admin', 'admin.manage'), true);
});

test('org_chart module is accessible to all roles', () => {
  assert.equal(can('clinic_staff', 'org_chart.view'), true);
  assert.equal(can('super_admin', 'org_chart.view'), true);
  assert.equal(canAccessModule('business_staff', 'org_chart'), true);
});
