/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBridgeUrl, resolveBridgeBaseUrl } from '@/lib/bridge-client';

test('resolveBridgeBaseUrl uses the dev proxy path during local development', () => {
  assert.equal(
    resolveBridgeBaseUrl({
      DEV: true,
      VITE_BRIDGE_URL: 'https://bridge.fdc-nhanvien.org',
    }),
    '/api/bridge',
  );
});

test('resolveBridgeBaseUrl prefers the configured bridge url outside dev', () => {
  assert.equal(
    resolveBridgeBaseUrl({
      DEV: false,
      VITE_BRIDGE_URL: 'https://bridge.fdc-nhanvien.org',
    }),
    'https://bridge.fdc-nhanvien.org',
  );
});

test('buildBridgeUrl joins the proxy base and request path without duplicate slashes', () => {
  assert.equal(
    buildBridgeUrl('/tv-access/check', { DEV: true, VITE_BRIDGE_URL: undefined }),
    '/api/bridge/tv-access/check',
  );
});
