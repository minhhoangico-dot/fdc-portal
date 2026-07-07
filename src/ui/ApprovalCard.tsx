/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ComponentType, ReactNode } from 'react';
import { FileText } from 'lucide-react';

/**
 * ApprovalCard — the §5.2 primitive: request/intake card (type icon ·
 * number · type · urgency · title · requester · StatusBadge/PriorityBadge ·
 * amount · inline action slot). Pure presentational, tokens only. Used by
 * both `CuaToiLens` and `ChoToiLens`.
 *
 * Restraint (direction §5.3): this card NEVER renders a `SealMark` — lists
 * use badges only; the seal is reserved for the fully-approved request
 * detail/print surface.
 */

export interface ApprovalCardProps {
  /** Leading type icon (defaults to a generic document icon). */
  icon?: ComponentType<{ className?: string }>;
  /** Request number / room code shown before the type label. */
  number: string;
  /** Human type label (e.g. "Xuất vật tư", "Room material intake"). */
  typeLabel: string;
  title: string;
  requesterName?: string;
  requesterMeta?: string;
  /** Short formatted date/time shown at the end of the meta row. */
  createdAt?: string;
  /** StatusBadge/PriorityBadge chips row. */
  badges?: ReactNode;
  /** Extra content rendered below the badges row (e.g. room-management tags). */
  meta?: ReactNode;
  /** Pre-formatted amount string (e.g. via `formatVND`). */
  amount?: string;
  amountLabel?: string;
  /** Inline action slot (buttons) — rendered outside the clickable body. */
  actions?: ReactNode;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onClick?: () => void;
  /** Soft highlight for escalation/priority rows (warn tint, not danger). */
  highlighted?: boolean;
  className?: string;
}

export function ApprovalCard({
  icon: Icon = FileText,
  number,
  typeLabel,
  title,
  requesterName,
  requesterMeta,
  createdAt,
  badges,
  meta,
  amount,
  amountLabel = 'Tổng tiền',
  actions,
  selectable = false,
  selected = false,
  onToggleSelect,
  onClick,
  highlighted = false,
  className = '',
}: ApprovalCardProps) {
  return (
    <div
      className={`relative flex flex-col gap-4 rounded-card border p-4 shadow-card transition-all sm:flex-row sm:items-center ${
        selected
          ? 'border-brand-500 ring-1 ring-brand-500'
          : highlighted
            ? 'border-warn-600/40 bg-warn-100/40'
            : 'border-line bg-card hover:border-brand-500/40'
      } ${className}`.trim()}
    >
      {selectable && (
        <div className="absolute left-4 top-4 shrink-0 sm:static">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.()}
            className="h-5 w-5 cursor-pointer rounded border-line text-brand-600 focus:ring-brand-500"
            aria-label="Chọn"
          />
        </div>
      )}

      <div
        className={`flex flex-1 items-start gap-4 min-w-0 ${selectable ? 'pl-8 sm:pl-0' : ''} ${
          onClick ? 'cursor-pointer' : ''
        }`}
        onClick={onClick}
      >
        <div className="hidden shrink-0 rounded-field bg-paper p-3 sm:block">
          <Icon className="h-6 w-6 text-ink-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-[13px] text-ink-600">
            <span className="font-medium">{number}</span>
            <span className="text-ink-400">•</span>
            <span>{typeLabel}</span>
          </div>
          <h3 className="mb-2 truncate text-[16px] font-[600] text-ink-900">{title}</h3>
          <div className="flex flex-wrap items-center gap-2">
            {requesterName && <span className="text-[14px] text-ink-600">{requesterName}</span>}
            {requesterMeta && <span className="text-[13px] text-ink-400">({requesterMeta})</span>}
            {badges}
            {createdAt && <span className="ml-1 text-[13px] text-ink-400">{createdAt}</span>}
          </div>
          {meta && <div className="mt-2">{meta}</div>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-3 sm:flex-col sm:items-end sm:justify-center sm:border-t-0 sm:pt-0">
        {amount && (
          <div className="text-left sm:text-right">
            <div className="text-[14px] font-[600] text-ink-900 [font-variant-numeric:tabular-nums]">{amount}</div>
            <div className="mt-1 text-[13px] text-ink-600">{amountLabel}</div>
          </div>
        )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export default ApprovalCard;
