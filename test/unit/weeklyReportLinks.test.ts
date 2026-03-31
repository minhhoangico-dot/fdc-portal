/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWeeklyReportDetailsUrl,
  buildWeeklyReportTvUrl,
  getWeeklyReportDetailsBackTarget,
} from '../../src/lib/weekly-report';

test('weekly report tv URLs use the tv-management namespace', () => {
  const href = buildWeeklyReportTvUrl(new Date('2026-03-25T00:00:00.000Z'));

  assert.match(href, /^\/tv-management\/weekly-report\/tv\?/);
});

test('weekly report detail URLs use the tv-management namespace', () => {
  const href = buildWeeklyReportDetailsUrl({
    key: 'xet_nghiem',
    start: '2026-03-24T00:00:00.000Z',
    end: '2026-03-25T00:00:00.000Z',
    from: 'management',
  });

  assert.match(href, /^\/tv-management\/weekly-report\/details\?/);
});

test('weekly report detail back-target routes to management when opened from management', () => {
  assert.equal(
    getWeeklyReportDetailsBackTarget({
      from: 'management',
      start: '2026-03-25T00:00:00.000Z',
    }),
    '/tv-management/weekly-report',
  );
});

test('weekly report detail back-target routes to the new tv path when opened from tv', () => {
  assert.equal(
    getWeeklyReportDetailsBackTarget({
      from: 'tv',
      start: '2026-03-25T00:00:00.000Z',
    }),
    '/tv-management/weekly-report/tv?date=2026-03-25T00%3A00%3A00.000Z',
  );
});
