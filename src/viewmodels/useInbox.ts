/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/access';
import { useApprovals } from '@/viewmodels/useApprovals';
import { useNotifications } from '@/viewmodels/useNotifications';
import {
  buildInbox,
  inboxItemKey,
  type InboxItem,
} from '@/lib/inbox/buildInbox';

/**
 * The unified inbox "Cần xử lý" viewmodel (direction §4.4, Phase-2 spec §3.2).
 *
 * It COMPOSES the existing frozen hooks — one `useApprovals` instance (data +
 * action fns) and `useNotifications` — and never re-implements approval logic
 * (same requirement `ChoBanDuyet` satisfies). The `items` list is the pure
 * `buildInbox` map over the very arrays the badge counts, so the inbox and
 * `useActionableCount` can never disagree.
 */

export interface UseInboxResult {
  items: InboxItem[];
  isLoading: boolean;
  /** True when this user has any approval-work permission (Chờ tôi lens shown). */
  approvalEnabled: boolean;
  itemKey: (item: InboxItem) => string;
  approve: (item: InboxItem) => Promise<void>;
  reject: (item: InboxItem, note: string) => Promise<void>;
  receiveHandoff: (item: InboxItem) => Promise<void>;
  completeHandoff: (item: InboxItem) => Promise<void>;
  markRead: (item: InboxItem) => Promise<void>;
}

export function useInbox(): UseInboxResult {
  const { user } = useAuth();

  // Replicate `useActionableCount`'s EXACT predicate so the inbox mounts the
  // same single `useApprovals` instance the badge does — keep these two in sync.
  const approvalEnabled = Boolean(
    user &&
      (can(user.role, 'approvals.review_assigned') ||
        can(user.role, 'approvals.receive_handoff') ||
        can(user.role, 'room_management.review_group_queue')),
  );

  const approvals = useApprovals({ enabled: approvalEnabled });
  const { notifications, isLoading: notificationsLoading, markAsRead } = useNotifications();

  const items = useMemo(
    () => buildInbox({ workQueue: approvals.approvalWorkQueue, notifications }),
    [approvals.approvalWorkQueue, notifications],
  );

  // Optimistic removal: acting on an item hides it immediately; the shared-table
  // realtime refetch inside useApprovals/useNotifications then drops it from the
  // source arrays, at which point its key is pruned from `dismissed`.
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setDismissed((prev) => {
      if (prev.size === 0) return prev;
      const liveKeys = new Set(items.map(inboxItemKey));
      let changed = false;
      const next = new Set<string>();
      prev.forEach((key) => {
        if (liveKeys.has(key)) next.add(key);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [items]);

  const dismiss = useCallback((item: InboxItem) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(inboxItemKey(item));
      return next;
    });
  }, []);

  const visibleItems = useMemo(
    () => items.filter((item) => !dismissed.has(inboxItemKey(item))),
    [items, dismissed],
  );

  const approve = useCallback(
    async (item: InboxItem) => {
      if (item.kind !== 'approval') return;
      dismiss(item);
      try {
        await approvals.approveRequest(item.requestId);
      } catch (error) {
        setDismissed((prev) => {
          const next = new Set(prev);
          next.delete(inboxItemKey(item));
          return next;
        });
        throw error;
      }
    },
    [approvals, dismiss],
  );

  const reject = useCallback(
    async (item: InboxItem, note: string) => {
      if (item.kind !== 'approval') return;
      dismiss(item);
      try {
        await approvals.rejectRequest(item.requestId, note);
      } catch (error) {
        setDismissed((prev) => {
          const next = new Set(prev);
          next.delete(inboxItemKey(item));
          return next;
        });
        throw error;
      }
    },
    [approvals, dismiss],
  );

  const handoffAction = useCallback(
    async (item: InboxItem, status: 'received' | 'completed') => {
      if (item.kind !== 'handoff') return;
      dismiss(item);
      try {
        await approvals.updateHandoffStatus(item.id, status);
      } catch (error) {
        setDismissed((prev) => {
          const next = new Set(prev);
          next.delete(inboxItemKey(item));
          return next;
        });
        throw error;
      }
    },
    [approvals, dismiss],
  );

  const receiveHandoff = useCallback(
    (item: InboxItem) => handoffAction(item, 'received'),
    [handoffAction],
  );

  const completeHandoff = useCallback(
    (item: InboxItem) => handoffAction(item, 'completed'),
    [handoffAction],
  );

  const markRead = useCallback(
    async (item: InboxItem) => {
      if (item.kind !== 'notification') return;
      dismiss(item);
      try {
        await markAsRead(item.id);
      } catch (error) {
        setDismissed((prev) => {
          const next = new Set(prev);
          next.delete(inboxItemKey(item));
          return next;
        });
        throw error;
      }
    },
    [markAsRead, dismiss],
  );

  return {
    items: visibleItems,
    isLoading: approvals.isLoading || notificationsLoading,
    approvalEnabled,
    itemKey: inboxItemKey,
    approve,
    reject,
    receiveHandoff,
    completeHandoff,
    markRead,
  };
}
