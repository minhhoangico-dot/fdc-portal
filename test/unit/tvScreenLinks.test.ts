/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTvScreenPreviewHref,
  getTvScreenPublicAlias,
  getTvScreenSettingsHref,
  isWeeklyReportTvScreen,
} from '../../src/lib/tv-screen-links';
import type { TvScreen } from '../../src/types/tvScreen';

const internalScreen: TvScreen = {
  id: 'tv-1',
  slug: 'xet-nghiem',
  name: 'TV Xet nghiem',
  location: 'Khoa Xet nghiem',
  contentType: 'internal',
  contentUrl: '/lab-dashboard/tv',
  isActive: true,
  refreshIntervalSeconds: 60,
  settings: {},
  createdAt: '2026-03-25T08:00:00.000Z',
  updatedAt: '2026-03-25T08:00:00.000Z',
};

const urlScreen: TvScreen = {
  ...internalScreen,
  id: 'tv-2',
  slug: 'sanh-cho',
  contentType: 'url',
  contentUrl: 'https://grafana.example.com/tv',
};

const weeklyReportScreen: TvScreen = {
  ...internalScreen,
  id: 'tv-3',
  slug: 'bao-cao-giao-ban',
  name: 'TV Bao cao giao ban',
  contentUrl: '/tv-management/weekly-report/tv',
  settings: { featureKey: 'weekly_report' },
};

const legacyWeeklyReportScreen: TvScreen = {
  ...internalScreen,
  id: 'tv-4',
  slug: 'bao-cao-giao-ban-cu',
  name: 'TV Bao cao giao ban cu',
  contentUrl: '/weekly-report/tv',
};

test('internal tv preview uses the configured internal target route', () => {
  assert.equal(getTvScreenPreviewHref(internalScreen), '/lab-dashboard/tv');
});

test('external tv preview keeps using the public slug wrapper route', () => {
  assert.equal(getTvScreenPreviewHref(urlScreen), '/tv/sanh-cho');
});

test('public alias is always exposed as /tv/{slug}', () => {
  assert.equal(getTvScreenPublicAlias(internalScreen), '/tv/xet-nghiem');
  assert.equal(getTvScreenPublicAlias(urlScreen), '/tv/sanh-cho');
});

test('weekly report screens expose a management settings link', () => {
  assert.equal(getTvScreenSettingsHref(weeklyReportScreen), '/tv-management/weekly-report');
});

test('weekly report screens are recognized via featureKey', () => {
  assert.equal(isWeeklyReportTvScreen(weeklyReportScreen), true);
});

test('legacy weekly report internal routes are still recognized before SQL backfill', () => {
  assert.equal(isWeeklyReportTvScreen(legacyWeeklyReportScreen), true);
  assert.equal(getTvScreenSettingsHref(legacyWeeklyReportScreen), '/tv-management/weekly-report');
});
