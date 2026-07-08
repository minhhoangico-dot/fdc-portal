/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { addWeeks, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ArrowRight, RefreshCw, Tv } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WeeklyReportTab } from '@/app/admin/WeeklyReportTab';
import { buildWeeklyReportTvUrl } from '@/lib/weekly-report';
import { formatTimeAgo } from '@/lib/utils';
import { useWeeklyReportLauncher } from '@/viewmodels/useWeeklyReport';
import { PageHeader } from '@/ui/PageHeader';
import { KpiCard } from '@/ui/KpiCard';
import { WidgetCard } from '@/ui/WidgetCard';
import { StatusBadge } from '@/ui/StatusBadge';
import type { StatusKind } from '@/ui/StatusBadge';

/**
 * WeeklyReportManagementWorkspace — re-skin of the launcher chrome onto
 * `ui/PageHeader` + `ui/KpiCard` + `ui/WidgetCard` + `ui/StatusBadge` +
 * brand tokens (Phase 4a §4 mapping row 2).
 *
 * PRESENTATION ONLY. Consumes `useWeeklyReportLauncher` verbatim — same
 * fields (`selectedDate`, `report`, `status`, `isLoading`, `isGenerating`,
 * `error`, `refresh`, `generateSnapshot`, `moveWeek`, `setDate`), zero
 * re-derive. `quickStats` is the identical pure presentation compute already
 * in this file — reproduced verbatim. `<WeeklyReportTab/>` keeps its
 * no-prop mount (owned by a different wave).
 */

const TASK_STATUS_MAP: Record<string, { status: StatusKind; label: string }> = {
  SUCCESS: { status: 'ok', label: 'SUCCESS' },
  FAILED: { status: 'danger', label: 'FAILED' },
};

export function WeeklyReportManagementWorkspace() {
  const {
    selectedDate,
    report,
    status,
    isLoading,
    isGenerating,
    error,
    refresh,
    generateSnapshot,
    moveWeek,
    setDate,
  } = useWeeklyReportLauncher();

  const openTv = () => {
    window.open(buildWeeklyReportTvUrl(selectedDate), '_blank', 'noopener,noreferrer');
  };

  const quickStats = report
    ? [
        { label: 'Khám bệnh', value: report.data.examination.reduce((sum, item) => sum + item.current, 0) },
        { label: 'Xét nghiệm', value: report.data.laboratory.reduce((sum, item) => sum + item.current, 0) },
        { label: 'CĐHA', value: report.data.imaging.reduce((sum, item) => sum + item.current, 0) },
        { label: 'Chuyên khoa', value: report.data.specialist.reduce((sum, item) => sum + item.current, 0) },
        { label: 'Truyền nhiễm', value: report.data.infectious.reduce((sum, item) => sum + item.periods.current, 0) },
        { label: 'Chuyển viện', value: report.data.transfer.reduce((sum, item) => sum + item.current, 0) },
      ]
    : [];

  const taskStatus = status?.latest_log?.status
    ? (TASK_STATUS_MAP[status.latest_log.status] ?? { status: 'warn' as StatusKind, label: status.latest_log.status })
    : { status: 'neutral' as StatusKind, label: 'N/A' };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Báo cáo giao ban"
        sub="Quản trị báo cáo giao ban từ Quản lý TV, gồm cả vận hành snapshot và cấu hình dữ liệu cho màn hình TV."
        actions={
          <>
            <button
              type="button"
              onClick={refresh}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-field border border-line bg-card px-4 py-2 text-[14px] font-medium text-ink-700 hover:bg-paper disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
            <button
              type="button"
              onClick={() => void generateSnapshot()}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 rounded-field bg-brand-600 px-4 py-2 text-[14px] font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <ArrowRight className={`h-4 w-4 ${isGenerating ? 'animate-pulse' : ''}`} />
              {isGenerating ? 'Đang tạo snapshot...' : 'Tạo lại snapshot'}
            </button>
            <button
              type="button"
              onClick={openTv}
              className="inline-flex items-center gap-2 rounded-field bg-ink-900 px-4 py-2 text-[14px] font-medium text-white hover:bg-ink-900/90"
            >
              <Tv className="h-4 w-4" />
              Mở màn hình TV
            </button>
          </>
        }
      />

      <div className="flex items-center gap-2 text-[14px] text-ink-600">
        <Link to="/tv-management" className="hover:text-ink-900 hover:underline">
          Quản lý TV
        </Link>
        <span>/</span>
        <span>Báo cáo giao ban</span>
      </div>

      {error && (
        <div className="rounded-field border border-danger-600/20 bg-danger-600/10 px-4 py-3 text-[14px] text-danger-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <WidgetCard
          title="Chọn tuần báo cáo"
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveWeek(-1)}
                className="rounded-field border border-line px-3 py-2 text-[13px] font-medium text-ink-700 hover:bg-paper"
              >
                Tuần trước
              </button>
              <button
                type="button"
                onClick={() => moveWeek(1)}
                className="rounded-field border border-line px-3 py-2 text-[13px] font-medium text-ink-700 hover:bg-paper"
              >
                Tuần sau
              </button>
            </div>
          }
        >
          <p className="-mt-2 mb-4 text-[13px] text-ink-600">
            Dùng tuần bất kỳ để tạo snapshot đúng kỳ và mở màn hình TV tương ứng.
          </p>

          <div className="grid gap-4 md:grid-cols-[200px_1fr]">
            <label className="flex flex-col gap-2 text-[14px] font-medium text-ink-700">
              Ngày tham chiếu
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(event) => setDate(event.target.value)}
                className="rounded-field border border-line px-3 py-2 text-[14px] text-ink-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              />
            </label>

            <div className="rounded-card bg-paper p-4">
              <div className="text-[14px] font-medium text-ink-700">
                {report
                  ? `Tuần ${report.meta.week_number}, ${report.meta.year}`
                  : `Tuần ${format(selectedDate, 'II', { locale: vi })}`}
              </div>
              <div className="mt-1 text-[14px] text-ink-600">
                {report
                  ? `${format(new Date(report.meta.week_start), 'dd/MM/yyyy', { locale: vi })} - ${format(new Date(report.meta.week_end), 'dd/MM/yyyy', { locale: vi })}`
                  : `${format(selectedDate, 'dd/MM/yyyy', { locale: vi })} - ${format(addWeeks(selectedDate, 0), 'dd/MM/yyyy', { locale: vi })}`}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {quickStats.map((item) => (
                  <KpiCard key={item.label} label={item.label} value={item.value.toLocaleString('vi-VN')} />
                ))}
              </div>
            </div>
          </div>
        </WidgetCard>

        <section className="space-y-4">
          <WidgetCard title="Trạng thái snapshot">
            <div className="space-y-3 text-[14px]">
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Nguồn dữ liệu</span>
                <span className="font-medium text-ink-900">
                  {report?.meta.source === 'snapshot' ? 'Snapshot đã lưu' : report ? 'Sinh trực tiếp / vừa tạo' : 'Đang tải'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Snapshot kỳ này</span>
                <span className="font-medium text-ink-900">
                  {status?.snapshot?.generated_at ? formatTimeAgo(status.snapshot.generated_at) : 'Chưa có'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Lần tạo gần nhất</span>
                <span className="font-medium text-ink-900">
                  {status?.latest_log?.started_at ? formatTimeAgo(status.latest_log.started_at) : 'Chưa có'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Trạng thái tác vụ</span>
                <StatusBadge status={taskStatus.status} label={taskStatus.label} />
              </div>
            </div>
          </WidgetCard>
        </section>
      </div>

      <WeeklyReportTab />
    </div>
  );
}
