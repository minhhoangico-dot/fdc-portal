/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';

/**
 * WidgetCard — card + 16px pad + header row. The shell used by Home
 * "Hôm nay" widgets (direction §4.3) and reusable anywhere a titled card is
 * needed.
 *
 * Pure presentational: no supabase, no viewmodels.
 */

export interface WidgetCardProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function WidgetCard({ title, actions, children, className = '' }: WidgetCardProps) {
  return (
    <div className={`rounded-card bg-card p-4 shadow-card ${className}`.trim()}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h3 className="text-[16px] font-[600] text-ink-900">{title}</h3>}
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export default WidgetCard;
