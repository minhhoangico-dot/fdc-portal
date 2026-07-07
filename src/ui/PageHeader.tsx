/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';

/**
 * PageHeader — title + optional subtitle + right-aligned actions slot.
 *
 * Pure presentational: no supabase, no viewmodels.
 */

export interface PageHeaderProps {
  title: string;
  sub?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, sub, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`.trim()}>
      <div className="min-w-0">
        <h1 className="text-[22px] font-[700] leading-tight text-ink-900">{title}</h1>
        {sub && <p className="mt-1 text-[14px] text-ink-600">{sub}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export default PageHeader;
