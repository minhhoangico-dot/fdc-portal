/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApprovalWorkQueue } from '@/lib/approvals/workqueue';
import { buildInbox, inboxItemKey } from '@/lib/inbox/buildInbox';
import type { Request, RequestHandoff } from '@/types/request';
import type { RoomWorkflowIntake } from '@/types/roomWorkflow';
import type { Notification } from '@/types/notification';

function makeRequest(id: string, over: Partial<Request> = {}): Request {
  return {
    id,
    requestNumber: `REQ-${id}`,
    type: 'other',
    title: `Đề nghị ${id}`,
    requesterId: 'u-req',
    department: 'Phòng khám',
    status: 'pending',
    priority: 'normal',
    createdAt: '2026-07-08T00:00:00.000Z',
    updatedAt: '2026-07-08T00:00:00.000Z',
    approvalSteps: [],
    requesterName: 'Nguyễn A',
    ...over,
  };
}

function makeIntake(id: string, over: Partial<RoomWorkflowIntake> = {}): RoomWorkflowIntake {
  return {
    id,
    intakeType: 'material',
    title: `Phiếu ${id}`,
    description: '',
    roomKey: 'P304',
    roomCode: 'P304',
    roomName: 'Phòng 304',
    floor: 3,
    reviewGroup: 'pharmacy',
    reviewerRole: 'pharmacy_head',
    status: 'submitted',
    priority: 'normal',
    requesterId: 'u-req',
    requesterName: 'Trần B',
    createdAt: '2026-07-08T00:00:00.000Z',
    updatedAt: '2026-07-08T00:00:00.000Z',
    metadata: {},
    items: [],
    ...over,
  };
}

function makeHandoff(id: string, over: Partial<RequestHandoff> = {}): RequestHandoff {
  return {
    id,
    requestId: `req-of-${id}`,
    assigneeId: 'u-acct',
    assigneeRole: 'internal_accountant',
    status: 'pending',
    createdAt: '2026-07-08T00:00:00.000Z',
    updatedAt: '2026-07-08T00:00:00.000Z',
    assignedByName: 'Lê C',
    ...over,
  };
}

function makeNotification(id: string, isRead: boolean): Notification {
  return {
    id,
    userId: 'u-me',
    type: 'system',
    title: `Thông báo ${id}`,
    body: 'Nội dung',
    isRead,
    createdAt: '2026-07-08T00:00:00.000Z',
  };
}

test('buildInbox emits exactly one item per work-queue element + unread notification', () => {
  const workQueue = buildApprovalWorkQueue({
    approvals: [makeRequest('a1'), makeRequest('a2')],
    reviewerIntakes: [makeIntake('i1')],
    handoffs: [makeHandoff('h1'), makeHandoff('h2')],
  });
  const notifications = [
    makeNotification('n1', false),
    makeNotification('n2', true), // read → excluded
    makeNotification('n3', false),
  ];

  const items = buildInbox({ workQueue, notifications });
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // The load-bearing invariant (Phase-2 spec §3.1): list length === badge total.
  assert.equal(items.length, workQueue.totalCount + unreadCount);
  assert.equal(items.length, 2 + 1 + 2 + 2);

  // 1:1 breakdown per category/source.
  assert.equal(items.filter((i) => i.kind === 'approval').length, 2);
  assert.equal(items.filter((i) => i.kind === 'review').length, 1);
  assert.equal(items.filter((i) => i.kind === 'handoff').length, 2);
  assert.equal(items.filter((i) => i.kind === 'notification').length, unreadCount);

  // Reviewer intakes fold under the Phê duyệt chip (spec §3.1 deviation note).
  assert.equal(items.filter((i) => i.category === 'phe-duyet').length, 3);
  assert.equal(items.filter((i) => i.category === 'ban-giao').length, 2);
  assert.equal(items.filter((i) => i.category === 'thong-bao').length, 2);
});

test('buildInbox is empty when nothing awaits and drops read notifications', () => {
  const workQueue = buildApprovalWorkQueue({ approvals: [], reviewerIntakes: [], handoffs: [] });
  const items = buildInbox({
    workQueue,
    notifications: [makeNotification('n1', true), makeNotification('n2', true)],
  });
  assert.equal(items.length, 0);
  assert.equal(items.length, workQueue.totalCount);
});

test('inboxItemKey namespaces by kind so cross-table id collisions stay distinct', () => {
  const sharedId = 'shared-uuid';
  const workQueue = buildApprovalWorkQueue({
    approvals: [makeRequest(sharedId)],
    reviewerIntakes: [makeIntake(sharedId)],
    handoffs: [],
  });
  const items = buildInbox({ workQueue, notifications: [] });
  const keys = new Set(items.map(inboxItemKey));
  assert.equal(keys.size, items.length); // no collision despite equal ids
});
