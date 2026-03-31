/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApprovalWorkQueue } from '@/lib/approvals/workqueue';

test('approval queue separates pending approvals, reviewer intakes, and downstream handoffs', () => {
  const queue = buildApprovalWorkQueue({
    approvals: [
      {
        id: 'req-1',
        requestNumber: 'REQ-001',
        type: 'other',
        title: 'Sua den phong P304',
        requesterId: 'u-requester',
        department: 'Phong kham',
        status: 'pending',
        priority: 'high',
        createdAt: '2026-03-31T08:00:00Z',
        updatedAt: '2026-03-31T09:00:00Z',
        approvalSteps: [
          {
            id: 'step-1',
            stepOrder: 1,
            approverRole: 'chief_accountant',
            approverId: 'u-chief',
            status: 'pending',
          },
        ],
        metadata: {
          workflowKind: 'room_maintenance',
          roomCode: 'P304',
          roomName: 'Phong Kham P304',
          originModule: 'room_management',
        },
      },
    ],
    reviewerIntakes: [
      {
        id: 'intake-1',
        intakeType: 'material',
        title: 'Bo sung vat tu tang 1',
        description: 'Tong hop vat tu',
        roomKey: 'r11',
        roomCode: 'T1-NHATHUOC',
        roomName: 'Nha Thuoc',
        floor: 1,
        reviewGroup: 'pharmacy',
        reviewerRole: 'pharmacy_head',
        status: 'submitted',
        priority: 'normal',
        requesterId: 'u-requester',
        requesterName: 'Le Thi A',
        createdAt: '2026-03-31T08:30:00Z',
        updatedAt: '2026-03-31T08:30:00Z',
        metadata: {
          workflowKind: 'room_material',
          roomCode: 'T1-NHATHUOC',
          roomName: 'Nha Thuoc',
          floor: 1,
          reviewGroup: 'pharmacy',
          originModule: 'room_management',
        },
        items: [],
      },
    ],
    handoffs: [
      {
        id: 'handoff-1',
        requestId: 'req-1',
        assigneeId: 'u-hr',
        assigneeRole: 'hr_records',
        assigneeName: 'Tran Thi B',
        status: 'pending',
        createdAt: '2026-03-31T10:00:00Z',
        updatedAt: '2026-03-31T10:00:00Z',
      },
    ],
  });

  assert.equal(queue.approvals.length, 1);
  assert.equal(queue.reviewerIntakes.length, 1);
  assert.equal(queue.handoffs.length, 1);
  assert.equal(queue.totalCount, 3);
});

test('approval queue flags chief accountant maintenance approvals that require manual forward choice', () => {
  const queue = buildApprovalWorkQueue({
    approvals: [
      {
        id: 'req-2',
        requestNumber: 'REQ-002',
        type: 'other',
        title: 'Sua may lanh phong P201',
        requesterId: 'u-requester',
        department: 'Phong kham',
        status: 'pending',
        priority: 'urgent',
        createdAt: '2026-03-31T11:00:00Z',
        updatedAt: '2026-03-31T11:00:00Z',
        approvalSteps: [
          {
            id: 'step-2',
            stepOrder: 1,
            approverRole: 'chief_accountant',
            approverId: 'u-chief',
            status: 'pending',
          },
        ],
        metadata: {
          workflowKind: 'room_maintenance',
          roomCode: 'P201',
          roomName: 'Phong Kham P201',
          originModule: 'room_management',
        },
      },
    ],
    reviewerIntakes: [],
    handoffs: [],
  });

  assert.equal(queue.approvals[0]?.requiresManualForwardChoice, true);
});
