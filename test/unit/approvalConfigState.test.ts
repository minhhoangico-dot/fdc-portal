/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addApprovalConfigStep,
  buildApprovalConfigSavePayload,
  normalizeApprovalConfig,
  updateApprovalConfigStep,
} from '@/lib/approval-config';

test('addApprovalConfigStep appends a default approval step immutably', () => {
  const original = [
    normalizeApprovalConfig({
      id: 'template-1',
      request_type: 'payment',
      name: 'Thanh toan',
      is_active: true,
      steps: [],
    }),
  ];

  const updated = addApprovalConfigStep(original, 'template-1');

  assert.equal(original[0].steps.length, 0);
  assert.equal(updated[0].steps.length, 1);
  assert.equal(updated[0].steps[0]?.stepType, 'approval');
});

test('updateApprovalConfigStep can switch an approval step to a notification step', () => {
  const original = [
    normalizeApprovalConfig({
      id: 'template-1',
      request_type: 'payment',
      name: 'Thanh toan',
      is_active: true,
      steps: [{ id: 'step-1', role: 'business_head', sla_hours: 24 }],
    }),
  ];

  const updated = updateApprovalConfigStep(
    original,
    'template-1',
    0,
    'stepType',
    'notification',
  );

  assert.equal(original[0].steps[0]?.stepType, 'approval');
  assert.equal(updated[0].steps[0]?.stepType, 'notification');
});

test('buildApprovalConfigSavePayload rejects a workflow whose first step is notification', () => {
  const original = [
    normalizeApprovalConfig({
      id: 'template-1',
      request_type: 'payment',
      name: 'Thanh toan',
      is_active: true,
      steps: [{ id: 'step-1', role: 'business_head', sla_hours: 24 }],
    }),
  ];

  const updated = updateApprovalConfigStep(
    original,
    'template-1',
    0,
    'stepType',
    'notification',
  );

  assert.throws(
    () => buildApprovalConfigSavePayload(updated, 'template-1'),
    /Workflow first step must be approval\./,
  );
});
