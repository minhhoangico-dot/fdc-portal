/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPrimaryNav } from '@/lib/navigation';
import { useActionableCount } from '@/viewmodels/useActionableCount';
import { useBridgeHeartbeat } from '@/viewmodels/useBridgeHeartbeat';

export interface HomeTodayHeader {
  /** Display name for the greeting ("Chào <tên>,"). */
  name: string;
  /** VN long date, e.g. "Thứ Ba, 8 tháng 7". */
  dateLabel: string;
  /** Sync-freshness dot state (bridge heartbeat). */
  sync: {
    /** Whether a heartbeat reading is available (else hide the dot). */
    available: boolean;
    /** True when the last heartbeat is stale. */
    isStale: boolean;
  };
  /** The "Cần xử lý · N" inbox strip: count + the role's inbox target path. */
  inbox: {
    count: number;
    path: string;
  };
}

/** Locale-correct VN long date ("Thứ Ba, 8 tháng 7") — capitalized by Intl. */
function formatVietnameseDate(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

/**
 * Header data for Home "Hôm nay" (direction §4.3): greeting name, VN date,
 * bridge sync dot, and the actionable-inbox count + destination. The inbox path
 * is resolved from the role's primary-nav inbox slot so the strip never points
 * at a module the role cannot reach (staff → /requests, others → /approvals).
 */
export function useHomeToday(): HomeTodayHeader | null {
  const { user } = useAuth();
  const heartbeat = useBridgeHeartbeat();
  const { total } = useActionableCount();

  const inboxPath = useMemo(() => {
    if (!user) return '/approvals';
    const inboxSlot = getPrimaryNav(user.role).find((item) => item.slot === 'inbox');
    return inboxSlot?.path ?? '/approvals';
  }, [user]);

  const dateLabel = useMemo(() => formatVietnameseDate(new Date()), []);

  if (!user) return null;

  return {
    name: user.name,
    dateLabel,
    sync: {
      available: heartbeat.available,
      isStale: heartbeat.isStale,
    },
    inbox: {
      count: total,
      path: inboxPath,
    },
  };
}
