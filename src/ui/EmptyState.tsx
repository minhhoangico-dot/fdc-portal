/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ComponentType, ReactNode } from 'react';
import { FileText } from 'lucide-react';

/**
 * EmptyState — tokenized replacement pattern for the legacy
 * `src/components/shared/EmptyState.tsx` (that file is untouched; existing
 * callers keep working). Used for "no data" and positive-empty moments,
 * e.g. Home "Hôm nay chưa có việc cần bạn xử lý ✓".
 *
 * Pure presentational: no supabase, no viewmodels.
 */

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = FileText,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-card p-12 text-center ${className}`.trim()}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-paper">
        <Icon className="h-6 w-6 text-ink-400" />
      </div>
      <h3 className="text-[14px] font-medium text-ink-900">{title}</h3>
      {description && <p className="mt-1 text-[13px] text-ink-600">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;
