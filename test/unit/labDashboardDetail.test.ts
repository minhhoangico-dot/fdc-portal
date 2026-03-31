/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLabDashboardTvDetailSearch,
  parseLabDashboardTvDetailState,
} from '../../src/lib/labDashboardDetail';

test('parses detail state from valid search params', () => {
  const state = parseLabDashboardTvDetailState(
    new URLSearchParams('view=detail&section=tat&focus=type%3Ahoa-sinh&tab=source'),
  );

  assert.deepEqual(state, {
    view: 'detail',
    section: 'tat',
    focus: 'type:hoa-sinh',
    tab: 'source',
  });
});

test('falls back to summary mode when required params are invalid', () => {
  const state = parseLabDashboardTvDetailState(
    new URLSearchParams('view=detail&section=queue&focus=median&tab=list'),
  );

  assert.deepEqual(state, {
    view: 'summary',
  });
});

test('builds encoded detail search params', () => {
  const search = buildLabDashboardTvDetailSearch({
    section: 'reagents',
    focus: 'reagent:glucose',
    tab: 'list',
  });

  assert.equal(search, '?view=detail&section=reagents&focus=reagent%3Aglucose&tab=list');
});
