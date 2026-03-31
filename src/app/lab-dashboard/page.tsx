/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ExternalLink, RefreshCw, Tv } from 'lucide-react';
import { LabDashboardDisplay } from '@/components/lab-dashboard/LabDashboardDisplay';
import { formatTimeAgo } from '@/lib/utils';
import { LabDashboardSectionKey } from '@/types/labDashboard';
import { useLabDashboard } from '@/viewmodels/useLabDashboard';

const SECTION_LABELS: Record<LabDashboardSectionKey, string> = {
  queue: 'Hàng chờ',
  tat: 'TAT',
  abnormal: 'Bất thường',
  reagents: 'Kho hóa chất',
};

function countReagentAlerts(statuses: Array<'ok' | 'low' | 'critical'>): number {
  return statuses.filter((status) => status !== 'ok').length;
}

export default function LabDashboardPage() {
  const { payload, loading, refreshing, error, refresh } = useLabDashboard();

  const openTv = React.useCallback(() => {
    window.open('/lab-dashboard/tv', '_blank', 'noopener,noreferrer');
  }, []);

  const sectionErrors = Object.keys(payload?.meta.sectionErrors || {}) as LabDashboardSectionKey[];
  const statCards = payload
    ? [
        {
          label: 'Mẫu đang chờ',
          value: payload.queue.waitingForSample + payload.queue.processing,
          helper: 'Chờ lấy mẫu hoặc đang chạy',
        },
        {
          label: 'TAT trung bình',
          value: payload.tat.averageMinutes,
          helper: 'Phút từ tiếp nhận đến trả kết quả',
        },
        {
          label: 'KQ bất thường',
          value: payload.abnormal.abnormalCount,
          helper: `${payload.abnormal.totalResults} kết quả trong ngày`,
        },
        {
          label: 'Cảnh báo hóa chất',
          value: countReagentAlerts(payload.reagents.map((item) => item.status)),
          helper: 'Nhóm hóa chất ở mức low hoặc critical',
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard xét nghiệm</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-500">
            Trang launcher cho màn hình khoa xét nghiệm. Preview dùng cùng payload với TV công khai để tránh phân nhánh dữ liệu hiển thị.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={openTv}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Tv className="h-4 w-4" />
            Mở màn hình TV
          </button>
        </div>
      </div>

      {payload && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-medium text-gray-500">{card.label}</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{card.value.toLocaleString('vi-VN')}</div>
              <div className="mt-2 text-xs text-gray-500">{card.helper}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Preview màn hình</h2>
              <p className="text-sm text-gray-500">
                Route công khai: <span className="font-medium text-gray-700">/lab-dashboard/tv</span>
              </p>
            </div>
            <button
              type="button"
              onClick={openTv}
              className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="h-4 w-4" />
              Mở tab mới
            </button>
          </div>

          <div className="overflow-auto rounded-[28px] border border-slate-900 bg-[#0a0e14] shadow-2xl">
            <LabDashboardDisplay
              payload={payload}
              loading={loading}
              refreshing={refreshing}
              error={error}
              mode="preview"
              onRetry={() => void refresh()}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Tình trạng dữ liệu</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Lần cập nhật gần nhất</span>
                <span className="font-medium text-gray-900">
                  {payload ? formatTimeAgo(payload.meta.generatedAt) : 'Đang tải'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Ngày dữ liệu HIS</span>
                <span className="font-medium text-gray-900">{payload?.meta.asOfDate || '--'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Ngày snapshot tồn kho</span>
                <span className="font-medium text-gray-900">
                  {payload?.meta.sectionFreshness.reagents.dataDate || '--'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Lỗi từng phần</span>
                <span className="font-medium text-gray-900">
                  {sectionErrors.length > 0 ? sectionErrors.map((key) => SECTION_LABELS[key]).join(', ') : 'Không có'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Vận hành TV</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <p>
                TV public chạy ngoài <span className="font-medium text-gray-900">AppShell</span> để giữ layout full-screen và có thể mở qua slug trong bảng <span className="font-medium text-gray-900">fdc_tv_screens</span>.
              </p>
              <p>
                Seed mặc định dùng slug <span className="font-medium text-gray-900">xet-nghiem</span>, trỏ nội bộ đến <span className="font-medium text-gray-900">/lab-dashboard/tv</span>.
              </p>
              <p>
                V1 chỉ hiển thị <span className="font-medium text-gray-900">mã bệnh nhân</span>, không đưa tên bệnh nhân lên launcher hoặc màn hình TV.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
