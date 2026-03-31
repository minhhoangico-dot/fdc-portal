/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_TABS, getAdminLegacyTabRedirect } from '../../src/app/admin/admin-navigation';

test('legacy weekly report admin tab redirects to the weekly report tv management page', () => {
  assert.equal(getAdminLegacyTabRedirect('weekly_report'), '/tv-management/weekly-report');
});

test('legacy tv screens admin tab redirects to the dedicated tv management page', () => {
  assert.equal(getAdminLegacyTabRedirect('tv_screens'), '/tv-management');
});

test('admin tabs no longer include the tv screens tab', () => {
  assert.equal(ADMIN_TABS.some((tab) => tab.id === 'tv_screens'), false);
});
