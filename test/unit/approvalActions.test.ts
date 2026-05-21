/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertNonEmptySelection,
  normalizeSelectionIds,
} from '@/lib/approval-actions';

test('assertNonEmptySelection throws a useful error for an empty selection', () => {
  assert.throws(() => assertNonEmptySelection([]), /No approval requests selected\./);
});

test('normalizeSelectionIds preserves first-seen order while removing duplicates', () => {
  assert.deepEqual(
    normalizeSelectionIds(['request-2', 'request-1', 'request-2', 'request-3', 'request-1']),
    ['request-2', 'request-1', 'request-3'],
  );
});

test('assertNonEmptySelection returns stable ids for a non-empty selection', () => {
  const selection = normalizeSelectionIds(['request-1', 'request-2', 'request-1']);

  assert.deepEqual(assertNonEmptySelection(selection), ['request-1', 'request-2']);
});
