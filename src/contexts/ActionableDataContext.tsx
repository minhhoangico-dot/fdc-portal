/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/access';
import { useApprovals } from '@/viewmodels/useApprovals';
import { useNotifications } from '@/viewmodels/useNotifications';

/**
 * The single source of truth for the two "actionable" realtime feeds — approval
 * work queue + in-app notifications. Previously `useActionableCount` (nav badge)
 * and `useInbox` (inbox list) EACH instantiated their own `useApprovals` +
 * `useNotifications`, doubling the `public:fdc_approvals` and
 * `public:fdc_notifications:<uid>` channels and holding the badge↔inbox
 * agreement together by a hand-replicated predicate. Hoisting one instance of
 * each into a provider mounted inside `AppShell` collapses the channels and
 * makes that agreement hold by SHARED REFERENCE instead of replication.
 */

export interface ActionableData {
  approvals: ReturnType<typeof useApprovals>;
  notifications: ReturnType<typeof useNotifications>;
  /** True when this user holds any approval-work permission (the canonical predicate). */
  approvalEnabled: boolean;
}

const ActionableDataContext = createContext<ActionableData | null>(null);

export function ActionableDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // The ONE canonical predicate. `useActionableCount` and `useInbox` used to
  // each replicate this; now they read it off the context.
  const approvalEnabled = Boolean(
    user &&
      (can(user.role, 'approvals.review_assigned') ||
        can(user.role, 'approvals.receive_handoff') ||
        can(user.role, 'room_management.review_group_queue')),
  );

  const approvals = useApprovals({ enabled: approvalEnabled });
  const notifications = useNotifications();

  const value = useMemo<ActionableData>(
    () => ({ approvals, notifications, approvalEnabled }),
    [approvals, notifications, approvalEnabled],
  );

  return (
    <ActionableDataContext.Provider value={value}>{children}</ActionableDataContext.Provider>
  );
}

export function useActionableData(): ActionableData {
  const value = useContext(ActionableDataContext);
  if (!value) {
    throw new Error('useActionableData must be used within ActionableDataProvider');
  }
  return value;
}
