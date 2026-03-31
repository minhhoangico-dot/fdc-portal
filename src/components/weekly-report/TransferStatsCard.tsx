/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildWeeklyReportDetailsUrl } from '@/lib/weekly-report';
import { WeeklyReportStatItem } from '@/types/weeklyReport';

export function TransferStatsCard({
  data,
  isLoading,
  startDate,
  endDate,
}: {
  data?: WeeklyReportStatItem[];
  isLoading?: boolean;
  startDate?: Date;
  endDate?: Date;
}) {
  const handleClick = () => {
    if (!startDate || !endDate) return;
    window.location.assign(
      buildWeeklyReportDetailsUrl({
        key: 'chuyen_vien',
        type: 'transfer',
        title: 'Chuyển viện',
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        from: 'tv',
      }),
    );
  };

  if (isLoading || !data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-md">
        <div className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2.5 text-white shadow-sm">
          <h3 className="font-bold uppercase tracking-wider opacity-95" style={{ fontSize: '15px' }}>
            CHUYỂN VIỆN
          </h3>
        </div>
      </div>
    );
  }

  const totalCurrent = data.reduce((sum, item) => sum + item.current, 0);
  const totalPrevious = data.reduce((sum, item) => sum + item.previous, 0);
  const diffValue = totalCurrent - totalPrevious;

  return (
    <div
      className="cursor-pointer rounded-xl border border-slate-200 bg-white shadow-md transition-shadow hover:shadow-lg"
      onClick={handleClick}
    >
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2.5 text-white shadow-sm">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-32 -mr-8 skew-x-12 bg-white/5" />
        <div className="relative z-10 flex h-8 items-center justify-between gap-3">
          <h3 className="min-w-0 flex-1 truncate font-bold uppercase tracking-wider opacity-95 drop-shadow-sm" style={{ fontSize: '15px' }}>
            CHUYỂN VIỆN
          </h3>
          <div className="flex shrink-0 items-center gap-4">
            <div className="flex items-baseline gap-1">
              <span className="font-black leading-none tracking-tight drop-shadow-sm" style={{ fontSize: 'var(--kpi-font)' }}>
                {totalCurrent.toLocaleString('vi-VN')}
              </span>
              <span className="hidden -translate-y-[2px] text-[11px] font-medium uppercase text-white/80 sm:inline-block">
                ca
              </span>
            </div>
            <div
              className={cn(
                'flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold shadow-sm backdrop-blur-sm',
                diffValue > 0
                  ? 'border-white/20 bg-white/10 text-white'
                  : diffValue < 0
                    ? 'border-white/10 bg-white/5 text-white/90'
                    : 'border-white/10 bg-white/5 text-white/80',
              )}
            >
              {diffValue > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : diffValue < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              <span className="tabular-nums">{Math.abs(diffValue)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

