/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildWeeklyReportDetailsUrl } from '@/lib/weekly-report';
import { WeeklyReportStatItem } from '@/types/weeklyReport';

export function ServiceStatsCard({
  title,
  data,
  isLoading,
  startDate,
  endDate,
}: {
  title: string;
  data?: WeeklyReportStatItem[];
  isLoading?: boolean;
  startDate?: Date;
  endDate?: Date;
}) {
  if (isLoading || !data) {
    return (
      <div className="h-full rounded-xl border border-slate-200 bg-white shadow-md">
        <div className="border-b px-4 py-3">
          <h3 className="font-bold uppercase text-slate-700" style={{ fontSize: 'var(--card-title)' }}>
            {title}
          </h3>
        </div>
        <div className="space-y-3 p-4">
          <div className="h-6 w-full animate-pulse rounded bg-slate-200" />
          <div className="h-6 w-5/6 animate-pulse rounded bg-slate-200" />
          <div className="h-6 w-4/6 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  const totalCurrent = data.reduce((acc, item) => acc + item.current, 0);
  const totalPrevious = data.reduce((acc, item) => acc + item.previous, 0);
  const diffPercent = totalPrevious > 0 ? ((totalCurrent - totalPrevious) / totalPrevious) * 100 : 0;

  const openDetails = (item: WeeklyReportStatItem) => {
    if (!startDate || !endDate) return;
    window.location.assign(
      buildWeeklyReportDetailsUrl({
        key: item.key,
        title: item.name,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        from: 'tv',
      }),
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
      <div className="relative overflow-hidden rounded-t-xl border-b bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-white shadow-sm">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-32 -mr-8 skew-x-12 bg-white/5" />
        <div className="relative z-10 flex h-8 items-center justify-between gap-3">
          <h3
            className="min-w-0 flex-1 truncate font-bold uppercase tracking-wider opacity-95 drop-shadow-sm"
            style={{ fontSize: '15px' }}
            title={title}
          >
            {title}
          </h3>

          <div className="flex shrink-0 items-center gap-4">
            <div className="flex items-baseline gap-1">
              <span className="font-black leading-none tracking-tight drop-shadow-sm" style={{ fontSize: 'var(--kpi-font)' }}>
                {totalCurrent.toLocaleString('vi-VN')}
              </span>
              <span className="hidden -translate-y-[2px] text-[11px] font-medium uppercase text-white/80 sm:inline-block">
                lượt
              </span>
            </div>

            <div
              className={cn(
                'flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold shadow-sm backdrop-blur-sm',
                diffPercent > 0
                  ? 'border-white/20 bg-white/10 text-white'
                  : diffPercent < 0
                    ? 'border-white/10 bg-white/5 text-white/90'
                    : 'border-white/10 bg-white/5 text-white/80',
              )}
            >
              {diffPercent > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : diffPercent < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              <span className="tabular-nums">{Math.abs(diffPercent).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="weekly-report-scrollbar flex-1 overflow-auto">
        <table className="min-w-full">
          <thead className="sticky top-0 bg-white/95 backdrop-blur">
            <tr className="border-b border-slate-100">
              <th
                className="pl-2 text-left font-bold text-slate-600"
                style={{ fontSize: 'var(--table-font)', height: 'var(--row-height)' }}
              >
                Loại Dịch vụ
              </th>
              <th
                className="text-right font-bold text-slate-600"
                style={{ fontSize: 'var(--table-font)', height: 'var(--row-height)' }}
              >
                Tuần này
              </th>
              <th
                className="pr-4 text-right font-bold text-slate-600"
                style={{ fontSize: 'var(--table-font)', height: 'var(--row-height)' }}
              >
                Trước
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => {
              const diff = item.current - item.previous;
              return (
                <tr
                  key={item.key}
                  className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50/50"
                  onClick={() => openDetails(item)}
                >
                  <td
                    className="whitespace-normal py-2 pl-2 font-medium text-slate-700 group-hover:text-blue-700"
                    style={{ fontSize: 'var(--table-font)', minHeight: 'var(--row-height)' }}
                    title={item.name}
                  >
                    {item.name}
                  </td>
                  <td
                    className="py-2 text-right font-black text-slate-900 group-hover:text-blue-900"
                    style={{ fontSize: 'var(--table-font)' }}
                  >
                    {item.current.toLocaleString('vi-VN')}
                  </td>
                  <td
                    className="flex items-center justify-end gap-1.5 py-2 pr-4 text-slate-500"
                    style={{ fontSize: 'var(--table-font)' }}
                  >
                    {item.previous.toLocaleString('vi-VN')}
                    {diff !== 0 && (
                      <span className={cn('text-lg font-bold', diff > 0 ? 'text-green-500' : 'text-red-400')}>
                        {diff > 0 ? '▲' : '▼'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

