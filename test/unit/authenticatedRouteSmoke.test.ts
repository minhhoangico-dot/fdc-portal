/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PORTAL_AUTH_SMOKE_ROUTES,
  normalizePortalLoginIdentifier,
} from '@/lib/portal-auth-smoke';

test('normalizePortalLoginIdentifier appends the clinic email domain for username logins', () => {
  assert.equal(normalizePortalLoginIdentifier('  pthue  '), 'pthue@fdc.vn');
});

test('normalizePortalLoginIdentifier preserves email-style logins', () => {
  assert.equal(normalizePortalLoginIdentifier('PTHUE@fdc.vn'), 'pthue@fdc.vn');
});

test('portal auth smoke routes cover the authenticated optimization surfaces', () => {
  assert.deepEqual(
    PORTAL_AUTH_SMOKE_ROUTES.map((route) => route.path),
    ['/dashboard', '/inventory', '/pharmacy', '/weekly-report', '/admin', '/lab-dashboard/tv'],
  );

  const weeklyReportRoute = PORTAL_AUTH_SMOKE_ROUTES.find((route) => route.path === '/weekly-report');
  assert.equal(weeklyReportRoute?.expectedUrlPath, '/tv-management/weekly-report');
  assert.equal(weeklyReportRoute?.expectedText, 'Báo cáo giao ban');

  const labDashboardRoute = PORTAL_AUTH_SMOKE_ROUTES.find((route) => route.path === '/lab-dashboard/tv');
  assert.equal(labDashboardRoute?.bridgeChecks?.includes('/tv-access/check'), true);
  assert.equal(labDashboardRoute?.bridgeChecks?.includes('/lab-dashboard/current'), true);
});
