/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * StatusBadge — the single source of status→color across the portal.
 *
 * Pure presentational: no supabase, no viewmodels. Rectangular, radius-field,
 * 100-tint background + 600 text per status (direction doc §5.1/§5.2).
 */

export type StatusKind = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';

export interface StatusBadgeProps {
  status: StatusKind;
  label: string;
  className?: string;
}

const STATUS_CLASSES: Record<StatusKind, string> = {
  ok: 'bg-brand-100 text-brand-600',
  warn: 'bg-warn-100 text-warn-600',
  danger: 'bg-danger-600/10 text-danger-600',
  info: 'bg-info-100 text-info-600',
  neutral: 'bg-line text-ink-600',
};

export function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-field px-2 py-0.5 text-[13px] font-medium leading-5 ${STATUS_CLASSES[status]} ${className}`.trim()}
    >
      {label}
    </span>
  );
}

export default StatusBadge;
