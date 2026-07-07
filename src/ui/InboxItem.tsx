/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import { formatTimeAgo } from '@/lib/utils';

/**
 * InboxItem — the compact "Cần xử lý" row (direction §4.4 / §5.2).
 *
 * Pure presentational: no supabase, no viewmodels. Layout is
 *   [type icon] · title · meta ("từ ai · bao lâu") · inline action slot.
 * The parent maps each `InboxItem` data record to an icon, title, fromName and
 * the appropriate inline action(s); this component only lays them out.
 */

export interface InboxItemProps {
  icon: ReactNode;
  title: string;
  /** "từ ai" — the originator; omitted from the meta line when empty. */
  fromName?: string;
  /** ISO timestamp; rendered as "bao lâu" via `formatTimeAgo`. */
  createdAt: string;
  /** Optional trailing content above the actions (e.g. type/amount badge). */
  detail?: ReactNode;
  /** Inline primary action(s). */
  action?: ReactNode;
  /** When set, the row body is a button (used by review/notification "Mở"). */
  onOpen?: () => void;
  className?: string;
}

export function InboxItem({
  icon,
  title,
  fromName,
  createdAt,
  detail,
  action,
  onOpen,
  className = '',
}: InboxItemProps) {
  const meta = [fromName?.trim(), formatTimeAgo(createdAt)].filter(Boolean).join(' · ');

  const body = (
    <div className="min-w-0 flex-1">
      <p className="truncate text-[14px] font-medium text-ink-900">{title}</p>
      <p className="mt-0.5 truncate text-[13px] text-ink-600">{meta}</p>
      {detail && <div className="mt-1.5 flex flex-wrap items-center gap-2">{detail}</div>}
    </div>
  );

  return (
    <div
      className={`flex items-start gap-3 rounded-field border border-line bg-card p-3 ${className}`.trim()}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-field bg-paper text-ink-600">
        {icon}
      </span>

      {onOpen ? (
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          {body}
        </button>
      ) : (
        body
      )}

      {action && <div className="flex shrink-0 items-center gap-1.5">{action}</div>}
    </div>
  );
}

export default InboxItem;
