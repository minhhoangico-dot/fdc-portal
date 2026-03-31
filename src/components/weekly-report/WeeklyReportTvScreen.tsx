/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { format, isSameWeek } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Settings,
  Tv,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { WEEKLY_REPORT_MANAGEMENT_PATH } from '@/lib/weekly-report';
import { InfectiousDiseaseCard } from '@/components/weekly-report/InfectiousDiseaseCard';
import { ServiceStatsCard } from '@/components/weekly-report/ServiceStatsCard';
import { TransferStatsCard } from '@/components/weekly-report/TransferStatsCard';
import { useWeeklyReportTv } from '@/viewmodels/useWeeklyReport';
import '@/app/weekly-report/weekly-report.css';

function parseDateParam(value: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

export function WeeklyReportTvScreen() {
  const [searchParams] = useSearchParams();
  const initialDate = React.useMemo(() => parseDateParam(searchParams.get('date')), [searchParams]);
  const { user } = useAuth();
  const { report, loading, error, selectedDate, setSelectedDate, moveWeek, refresh } = useWeeklyReportTv(initialDate);
  const [tvMode, setTvMode] = React.useState(false);

  if (!report && loading) {
    return (
      <div className="weekly-report-tv h-screen bg-slate-100">
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="text-slate-500">Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`weekly-report-tv h-screen overflow-hidden bg-slate-100 p-3 font-sans text-slate-900 ${tvMode ? 'tv-mode' : ''}`}>
      <div className="flex h-full flex-col overflow-hidden">
        <header
          className="mb-2 flex shrink-0 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm"
          style={{ height: 'var(--header-height)' }}
        >
          <div className="flex items-center gap-3">
            <h1 className="font-black tracking-tight text-slate-800" style={{ fontSize: 'var(--title-font)' }}>
              BÁO CÁO HOẠT ĐỘNG PHÒNG KHÁM
            </h1>
            <div className="flex items-center gap-1 rounded border border-blue-100 bg-blue-50 px-1 font-bold text-blue-600">
              <button type="button" className="h-6 w-6" onClick={() => moveWeek(-4)} title="Lùi 4 tuần">
                <ChevronsLeft className="mx-auto h-4 w-4" />
              </button>
              <button type="button" className="h-6 w-6" onClick={() => moveWeek(-1)} title="Tuần trước">
                <ChevronLeft className="mx-auto h-4 w-4" />
              </button>
              <span className="mx-1 font-black" style={{ fontSize: 'var(--base-font)' }}>
                {report ? `Tuần ${report.meta.week_number}` : '...'}
              </span>
              <button type="button" className="h-6 w-6" onClick={() => moveWeek(1)} title="Tuần sau">
                <ChevronRight className="mx-auto h-4 w-4" />
              </button>
              <button type="button" className="h-6 w-6" onClick={() => moveWeek(4)} title="Tới 4 tuần">
                <ChevronsRight className="mx-auto h-4 w-4" />
              </button>
            </div>

            {report && (
              <span className="text-slate-500" style={{ fontSize: 'var(--base-font)' }}>
                ({format(new Date(report.meta.week_start), 'dd/MM', { locale: vi })} - {format(new Date(report.meta.week_end), 'dd/MM/yyyy', { locale: vi })})
              </span>
            )}

            {!isSameWeek(selectedDate, new Date(), { weekStartsOn: 1 }) && (
              <button
                type="button"
                className="text-blue-600 underline"
                style={{ fontSize: 'var(--base-font)' }}
                onClick={() => setSelectedDate(new Date())}
              >
                (Tuần này)
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className={`flex h-7 w-7 items-center justify-center rounded ${tvMode ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700'}`}
              onClick={() => setTvMode((value) => !value)}
              title="Chế độ TV"
            >
              <Tv className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-700"
              onClick={() => void refresh()}
              title="Làm mới"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {user?.role === 'super_admin' && (
              <Link
                to={WEEKLY_REPORT_MANAGEMENT_PATH}
                className="flex h-7 w-7 items-center justify-center rounded text-slate-500"
                title="Cài đặt"
              >
                <Settings className="h-4 w-4" />
              </Link>
            )}
          </div>
        </header>

        {error && (
          <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <main className="grid min-h-0 flex-1 grid-cols-12 gap-3">
          <div className="col-span-12 min-h-0 lg:col-span-3">
            <ServiceStatsCard
              title="Khám Bệnh"
              data={report?.data.examination}
              isLoading={loading}
              startDate={report ? new Date(report.meta.week_start) : undefined}
              endDate={report ? new Date(report.meta.week_end) : undefined}
            />
          </div>

          <div className="col-span-12 flex min-h-0 flex-col gap-3 lg:col-span-3">
            <div className="min-h-0 flex-1">
              <ServiceStatsCard
                title="Xét Nghiệm"
                data={report?.data.laboratory}
                isLoading={loading}
                startDate={report ? new Date(report.meta.week_start) : undefined}
                endDate={report ? new Date(report.meta.week_end) : undefined}
              />
            </div>
            <div className="min-h-0 flex-1">
              <ServiceStatsCard
                title="Chẩn Đoán Hình Ảnh"
                data={report?.data.imaging?.filter((item) => item.name !== 'CDHA khac')}
                isLoading={loading}
                startDate={report ? new Date(report.meta.week_start) : undefined}
                endDate={report ? new Date(report.meta.week_end) : undefined}
              />
            </div>
          </div>

          <div className="col-span-12 flex min-h-0 flex-col gap-3 lg:col-span-3">
            <div className="min-h-0 flex-1">
              <ServiceStatsCard
                title="Chuyên Khoa"
                data={report?.data.specialist}
                isLoading={loading}
                startDate={report ? new Date(report.meta.week_start) : undefined}
                endDate={report ? new Date(report.meta.week_end) : undefined}
              />
            </div>
            <div>
              <TransferStatsCard
                data={report?.data.transfer}
                isLoading={loading}
                startDate={report ? new Date(report.meta.week_start) : undefined}
                endDate={report ? new Date(report.meta.week_end) : undefined}
              />
            </div>
          </div>

          <div className="col-span-12 min-h-0 lg:col-span-3">
            <InfectiousDiseaseCard
              data={report?.data.infectious}
              isLoading={loading}
              startDate={report ? new Date(report.meta.week_start) : undefined}
              endDate={report ? new Date(report.meta.week_end) : undefined}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
