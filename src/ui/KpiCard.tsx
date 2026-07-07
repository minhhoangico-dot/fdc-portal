/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';

/**
 * KpiCard — value + label tile for dashboards and home widgets.
 *
 * Pure presentational: no supabase, no viewmodels. Value uses tabular-nums
 * per direction §5.1 (financial figures must not jitter). No gradients —
 * shadow-card only.
 */

export type KpiDeltaDirection = 'up' | 'down' | 'flat';

export interface KpiCardProps {
  value: ReactNode;
  label: string;
  delta?: string;
  deltaDirection?: KpiDeltaDirection;
  icon?: ReactNode;
  className?: string;
}

const DELTA_CLASSES: Record<KpiDeltaDirection, string> = {
  up: 'text-ok-600',
  down: 'text-danger-600',
  flat: 'text-ink-400',
};

export function KpiCard({
  value,
  label,
  delta,
  deltaDirection = 'flat',
  icon,
  className = '',
}: KpiCardProps) {
  return (
    <div
      className={`rounded-card bg-card p-4 shadow-card ${className}`.trim()}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-[600] text-[22px] leading-tight text-ink-900 [font-variant-numeric:tabular-nums]">
            {value}
          </div>
          <div className="mt-1 text-[13px] text-ink-600">{label}</div>
        </div>
        {icon && <div className="shrink-0 text-brand-600">{icon}</div>}
      </div>
      {delta && (
        <div className={`mt-2 text-[13px] font-medium ${DELTA_CLASSES[deltaDirection]}`}>
          {delta}
        </div>
      )}
    </div>
  );
}

export default KpiCard;
