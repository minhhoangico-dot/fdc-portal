/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ApprovalWorkQueue } from '@/lib/approvals/workqueue';
import type { Notification } from '@/types/notification';
import type { RequestHandoffStatus } from '@/types/request';
import type { RoomWorkflowIntakeType } from '@/types/roomWorkflow';

/**
 * Unified inbox ("Cần xử lý", direction §4.4) data model.
 *
 * `buildInbox` is a PURE 1:1 mapper: it emits exactly one `InboxItem` per
 * element of the approval work queue plus one per UNREAD notification. Because
 * the map is strictly 1:1 over the same in-memory arrays the badge counts
 * (`useActionableCount` → `approvalWorkQueue.totalCount + unreadCount`), the
 * list length and the badge number can never drift. See
 * `test/unit/inboxCount.test.ts` for the enforced invariant.
 *
 * Reviewer intakes map to the `Phê duyệt` chip (not a 4th chip): room review
 * work is "chờ tôi duyệt/xử lý" and folds under Phê duyệt so the chip set stays
 * the three fixed by §4.4 while the badge arithmetic (which already includes
 * `reviewerIntakes`) stays equal to the list.
 */

/** Chip buckets — exactly three per direction §4.4. */
export type InboxCategory = 'phe-duyet' | 'ban-giao' | 'thong-bao';

export interface InboxApprovalItem {
  kind: 'approval';
  category: 'phe-duyet';
  id: string;
  requestId: string;
  title: string;
  fromName: string;
  createdAt: string;
  requiresManualForward: boolean;
  amount?: number;
}

export interface InboxReviewItem {
  kind: 'review';
  category: 'phe-duyet';
  id: string;
  intakeId: string;
  title: string;
  fromName: string;
  createdAt: string;
  intakeType: RoomWorkflowIntakeType;
}

export interface InboxHandoffItem {
  kind: 'handoff';
  category: 'ban-giao';
  id: string;
  requestId: string;
  title: string;
  fromName: string;
  createdAt: string;
  status: RequestHandoffStatus;
}

export interface InboxNotificationItem {
  kind: 'notification';
  category: 'thong-bao';
  id: string;
  title: string;
  body: string;
  createdAt: string;
  linkTo?: string;
}

export type InboxItem =
  | InboxApprovalItem
  | InboxReviewItem
  | InboxHandoffItem
  | InboxNotificationItem;

export interface BuildInboxInput {
  workQueue: ApprovalWorkQueue;
  notifications: Notification[];
}

/**
 * A stable, category-namespaced key for an inbox item. Item ids come from
 * different tables (request / intake / handoff / notification) so a namespaced
 * key guards against any cross-table id collision when tracking optimistic
 * dismissals and React list keys.
 */
export function inboxItemKey(item: InboxItem): string {
  return `${item.kind}:${item.id}`;
}

export function buildInbox({ workQueue, notifications }: BuildInboxInput): InboxItem[] {
  const approvals: InboxItem[] = workQueue.approvals.map((request) => ({
    kind: 'approval',
    category: 'phe-duyet',
    id: request.id,
    requestId: request.id,
    title: request.title,
    fromName: request.requesterName ?? request.department ?? '',
    createdAt: request.createdAt,
    requiresManualForward: request.requiresManualForwardChoice,
    amount: request.totalAmount,
  }));

  const reviews: InboxItem[] = workQueue.reviewerIntakes.map((intake) => ({
    kind: 'review',
    category: 'phe-duyet',
    id: intake.id,
    intakeId: intake.id,
    title: intake.title,
    fromName: intake.requesterName ?? intake.roomName ?? '',
    createdAt: intake.createdAt,
    intakeType: intake.intakeType,
  }));

  const handoffs: InboxItem[] = workQueue.handoffs.map((handoff) => ({
    kind: 'handoff',
    category: 'ban-giao',
    id: handoff.id,
    requestId: handoff.requestId,
    title: handoff.note?.trim() ? handoff.note.trim() : 'Bàn giao đề nghị',
    fromName: handoff.assignedByName ?? '',
    createdAt: handoff.createdAt,
    status: handoff.status,
  }));

  const unread: InboxItem[] = notifications
    .filter((notification) => !notification.isRead)
    .map((notification) => ({
      kind: 'notification',
      category: 'thong-bao',
      id: notification.id,
      title: notification.title,
      body: notification.body,
      createdAt: notification.createdAt,
      linkTo: notification.linkTo,
    }));

  return [...approvals, ...reviews, ...handoffs, ...unread];
}
