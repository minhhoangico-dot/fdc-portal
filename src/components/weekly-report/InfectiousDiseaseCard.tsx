/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildWeeklyReportDetailsUrl } from '@/lib/weekly-report';
import { WeeklyReportInfectiousStat } from '@/types/weeklyReport';

const AGE_GROUPS = [
  { key: 'age_0_2', label: '0-2', color: 'bg-blue-500' },
  { key: 'age_3_12', label: '3-12', color: 'bg-green-500' },
  { key: 'age_13_18', label: '13-18', color: 'bg-amber-500' },
  { key: 'age_18_50', label: '18-50', color: 'bg-red-500' },
  { key: 'age_over_50', label: '>50', color: 'bg-purple-500' },
] as const;

export function InfectiousDiseaseCard({
  data,
  isLoading,
  startDate,
  endDate,
}: {
  data?: WeeklyReportInfectiousStat[];
  isLoading?: boolean;
  startDate?: Date;
  endDate?: Date;
}) {
  if (isLoading || !data) {
    return (
      <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-md">
        <div className="border-b px-4 py-3">
          <h3 className="font-bold uppercase text-slate-700" style={{ fontSize: 'var(--card-title)' }}>
            BỆNH TRUYỀN NHIỄM
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

  const filteredData = data
    .filter((item) => item.periods.current > 0 || item.periods.previous > 0)
    .sort((a, b) => b.periods.current - a.periods.current)
    .slice(0, 8);

  const totalCurrent = data.reduce((acc, item) => acc + item.periods.current, 0);
  const totalPrevious = data.reduce((acc, item) => acc + item.periods.previous, 0);
  const diffPercent = totalPrevious > 0 ? ((totalCurrent - totalPrevious) / totalPrevious) * 100 : 0;
  const maxCurrent = Math.max(...filteredData.map((item) => item.periods.current), 1);

  const ageAggregated = data.reduce(
    (acc, item) => ({
      age_0_2: acc.age_0_2 + item.age_groups.age_0_2,
      age_3_12: acc.age_3_12 + item.age_groups.age_3_12,
      age_13_18: acc.age_13_18 + item.age_groups.age_13_18,
      age_18_50: acc.age_18_50 + item.age_groups.age_18_50,
      age_over_50: acc.age_over_50 + item.age_groups.age_over_50,
    }),
    { age_0_2: 0, age_3_12: 0, age_13_18: 0, age_18_50: 0, age_over_50: 0 },
  );

  const openDisease = (item: WeeklyReportInfectiousStat) => {
    if (!startDate || !endDate) return;
    window.location.assign(
      buildWeeklyReportDetailsUrl({
        key: item.icd_code,
        type: 'infectious',
        title: item.disease_name,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        from: 'tv',
      }),
    );
  };

  const openAgeGroup = (groupKey: string, label: string) => {
    if (!startDate || !endDate) return;
    window.location.assign(
      buildWeeklyReportDetailsUrl({
        key: groupKey,
        type: 'age_group',
        title: `Bệnh truyền nhiễm - ${label} tuổi`,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        from: 'tv',
      }),
    );
  };

  const totalAge = Object.values(ageAggregated).reduce((sum, value) => sum + value, 0);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
      <div className="relative overflow-hidden rounded-t-xl border-b bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-white shadow-sm shrink-0">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-32 -mr-8 skew-x-12 bg-white/5" />
        <div className="relative z-10 flex h-8 items-center justify-between gap-3">
          <h3 className="min-w-0 flex-1 truncate font-bold uppercase tracking-wider opacity-95 drop-shadow-sm" style={{ fontSize: '15px' }}>
            BỆNH TRUYỀN NHIỄM
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

      <div className="weekly-report-scrollbar min-h-0 flex-1 overflow-auto">
        <table className="min-w-full">
          <thead className="sticky top-0 bg-white/95 backdrop-blur">
            <tr className="border-b border-slate-100">
              <th className="pl-2 text-left font-bold text-slate-600" style={{ fontSize: 'var(--table-font)', height: 'var(--row-height)' }}>
                Bệnh
              </th>
              <th className="w-[100px]" />
              <th className="w-[50px] text-right font-bold text-slate-600" style={{ fontSize: 'var(--table-font)' }}>
                Nay
              </th>
              <th className="w-[60px] pr-2 text-right font-bold text-slate-600" style={{ fontSize: 'var(--table-font)' }}>
                TB 4 tuần
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => {
              const diff = item.periods.current - item.periods.previous;
              const barWidth = (item.periods.current / maxCurrent) * 100;
              return (
                <tr
                  key={item.icd_code}
                  className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-orange-100"
                  style={{ height: 'var(--row-height)' }}
                  onClick={() => openDisease(item)}
                >
                  <td className="max-w-[120px] truncate pl-2 text-slate-700" style={{ fontSize: 'var(--table-font)' }} title={item.disease_name}>
                    {item.disease_name}
                  </td>
                  <td className="py-1">
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500" style={{ width: `${barWidth}%` }} />
                    </div>
                  </td>
                  <td className="text-right font-black text-slate-900" style={{ fontSize: 'var(--table-font)' }}>
                    {item.periods.current}
                  </td>
                  <td className="flex items-center justify-end gap-1 pr-2 text-slate-500" style={{ fontSize: 'var(--table-font)' }}>
                    {item.periods.previous}
                    {diff !== 0 && (
                      <span className={cn('text-sm font-bold', diff > 0 ? 'text-red-500' : 'text-green-500')}>
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

      <div className="shrink-0 border-t bg-gradient-to-r from-slate-100 to-slate-50 px-3 py-3">
        <p className="mb-2 font-bold text-slate-700" style={{ fontSize: 'var(--table-font)' }}>
          Phân bổ độ tuổi
        </p>
        <div className="grid grid-cols-5 gap-2">
          {AGE_GROUPS.map((group) => {
            const value = ageAggregated[group.key];
            const percent = totalAge > 0 ? (value / totalAge) * 100 : 0;
            const clickable = value > 0 && startDate && endDate;
            return (
              <div
                key={group.key}
                className={cn(
                  'flex flex-col items-center rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm',
                  clickable && 'cursor-pointer transition-colors hover:border-orange-300 hover:bg-slate-50',
                )}
                onClick={() => clickable && openAgeGroup(group.key, group.label)}
              >
                <span className={cn('mb-1 h-3 w-3 rounded-full', group.color)} />
                <span className="text-xs font-semibold text-slate-500">{group.label}</span>
                <span
                  className={cn(
                    'font-black',
                    clickable ? 'text-blue-600 underline' : 'text-slate-900',
                  )}
                  style={{ fontSize: 'var(--table-font)' }}
                >
                  {value}
                </span>
                {percent > 0 && <span className="text-xs text-slate-400">{percent.toFixed(0)}%</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

