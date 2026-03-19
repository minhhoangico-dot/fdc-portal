/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { addWeeks, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ArrowRight, ExternalLink, RefreshCw, Settings, Tv } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildWeeklyReportTvUrl } from '@/lib/weekly-report';
import { formatTimeAgo } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useWeeklyReportLauncher } from '@/viewmodels/useWeeklyReport';

export default function WeeklyReportPage() {
  const { user } = useAuth();
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

  return (
    <div className="max-w-6xl mx-auto pb-24 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo cáo giao ban</h1>
          <p className="text-sm text-gray-500">
            Trang vận hành module weekly clinic report. Màn hình TV được giữ full-screen riêng để không thay đổi kích thước hiển thị.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={() => void generateSnapshot()}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <ArrowRight className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
            {isGenerating ? 'Đang tạo snapshot...' : 'Tạo lại snapshot'}
          </button>
          <button
            type="button"
            onClick={openTv}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Tv className="w-4 h-4" />
            Mở màn hình TV
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Chọn tuần báo cáo</h2>
              <p className="text-sm text-gray-500">Dùng tuần bất kỳ để mở TV và tạo snapshot đúng kỳ.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveWeek(-1)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Tuần trước
              </button>
              <button
                type="button"
                onClick={() => moveWeek(1)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Tuần sau
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[200px_1fr]">
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              Ngày tham chiếu
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(event) => setDate(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-700">
                {report
                  ? `Tuần ${report.meta.week_number}, ${report.meta.year}`
                  : `Tuần ${format(selectedDate, 'II', { locale: vi })}`}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {report
                  ? `${format(new Date(report.meta.week_start), 'dd/MM/yyyy', { locale: vi })} - ${format(new Date(report.meta.week_end), 'dd/MM/yyyy', { locale: vi })}`
                  : `${format(selectedDate, 'dd/MM/yyyy', { locale: vi })} - ${format(addWeeks(selectedDate, 0), 'dd/MM/yyyy', { locale: vi })}`}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickStats.map((item) => (
                  <div key={item.label} className="rounded-lg border border-white bg-white px-3 py-2 shadow-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-400">{item.label}</div>
                    <div className="text-lg font-semibold text-slate-900">{item.value.toLocaleString('vi-VN')}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Trạng thái snapshot</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Nguồn dữ liệu</span>
                <span className="font-medium text-gray-900">
                  {report?.meta.source === 'snapshot' ? 'Snapshot đã lưu' : report ? 'Sinh trực tiếp / vừa tạo' : 'Đang tải'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Snapshot kỳ này</span>
                <span className="font-medium text-gray-900">
                  {status?.snapshot?.generated_at ? formatTimeAgo(status.snapshot.generated_at) : 'Chưa có'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Lần tạo gần nhất</span>
                <span className="font-medium text-gray-900">
                  {status?.latest_log?.started_at ? formatTimeAgo(status.latest_log.started_at) : 'Chưa có'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Trạng thái tác vụ</span>
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    status?.latest_log?.status === 'SUCCESS'
                      ? 'bg-emerald-100 text-emerald-700'
                      : status?.latest_log?.status === 'FAILED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {status?.latest_log?.status || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Điều khiển</h2>
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={openTv}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left hover:bg-gray-50"
              >
                <span>
                  <span className="block text-sm font-semibold text-gray-900">Mở màn hình TV</span>
                  <span className="block text-xs text-gray-500">Route full-screen riêng, không dùng AppShell.</span>
                </span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </button>

              {user?.role === 'super_admin' && (
                <Link
                  to="/admin?tab=weekly_report"
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left hover:bg-gray-50"
                >
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">Mở cấu hình quản trị</span>
                    <span className="block text-xs text-gray-500">ICD, service mapping, custom report, tạo snapshot.</span>
                  </span>
                  <Settings className="w-4 h-4 text-gray-400" />
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

