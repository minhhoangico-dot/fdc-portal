/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/access';
import { useApprovals } from '@/viewmodels/useApprovals';
import { useNotifications } from '@/viewmodels/useNotifications';

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
 * right now = pending approval steps for me + unread notifications. Reuses the
 * existing `useApprovals` / `useNotifications` viewmodels (both already wired to
 * the shared realtime helper) rather than introducing a third subscription
 * pattern.
 */
export function useActionableCount(): ActionableCount {
  const { user } = useAuth();

  const approvalEnabled = Boolean(
    user &&
      (can(user.role, 'approvals.review_assigned') ||
        can(user.role, 'approvals.receive_handoff') ||
        can(user.role, 'room_management.review_group_queue')),
  );

  const { approvalWorkQueue } = useApprovals({ enabled: approvalEnabled });
  const { unreadCount } = useNotifications();

  return useMemo(() => {
    const approvalCount = approvalEnabled ? approvalWorkQueue.totalCount : 0;
    const notificationCount = unreadCount;
    return {
      approvalCount,
      notificationCount,
      total: approvalCount + notificationCount,
    };
  }, [approvalEnabled, approvalWorkQueue.totalCount, unreadCount]);
}
