/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { useActionableData } from '@/contexts/ActionableDataContext';

export interface ActionableCount {
  /** Pending approval-work-queue items awaiting this user (steps + handoffs + reviews). */
  approvalCount: number;
  /** Unread in-app notifications. */
  notificationCount: number;
  /** The badge number shown on the "Cần xử lý" nav slot. */
  total: number;
}

/**
 * The count behind the "Cần xử lý" inbox badge: everything awaiting the user
 * right now = pending approval steps for me + unread notifications. Reads the
 * shared `ActionableDataContext` (one `useApprovals` + one `useNotifications`
 * instance for the whole shell) so the badge and the inbox derive from the SAME
 * arrays and can never disagree.
 */
export function useActionableCount(): ActionableCount {
  const { approvals, notifications, approvalEnabled } = useActionableData();

  const approvalCount = approvalEnabled ? approvals.approvalWorkQueue.totalCount : 0;
  const notificationCount = notifications.unreadCount;

  return useMemo(
    () => ({
      approvalCount,
      notificationCount,
      total: approvalCount + notificationCount,
    }),
    [approvalCount, notificationCount],
  );
}
