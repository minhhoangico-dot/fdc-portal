/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canBypassOnsiteAccess,
  getOnsiteAccessContent,
} from '@/lib/onsite-access';

test('only super_admin bypasses onsite access', () => {
  assert.equal(canBypassOnsiteAccess('super_admin'), true);
  assert.equal(canBypassOnsiteAccess('head_nurse'), false);
});

test('admin onsite denial copy is not tv-specific', () => {
  const content = getOnsiteAccessContent('admin', 'outside_allowed_networks');

  assert.match(content.title, /Khong the mo trang quan tri/i);
  assert.doesNotMatch(content.description, /man hinh TV/i);
  assert.match(content.description, /Phong kham|Chi nhanh/i);
});

test('tv display onsite denial copy still explains the tv restriction', () => {
  const content = getOnsiteAccessContent('tv_display', 'geolocation_outside_allowed_sites');

  assert.match(content.title, /Khong the mo man hinh TV/i);
  assert.match(content.description, /man hinh TV/i);
});
