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
import { PageHeader } from '@/ui/PageHeader';
import { KpiCard } from '@/ui/KpiCard';
import { WidgetCard } from '@/ui/WidgetCard';
import { StatusBadge } from '@/ui/StatusBadge';

/**
 * lab-dashboard/page.tsx — re-skin of the light launcher chrome onto
 * `ui/PageHeader` + `ui/KpiCard` + `ui/WidgetCard` + `ui/StatusBadge` +
 * brand tokens (Phase 4a §4 mapping row 1).
 *
 * PRESENTATION ONLY. Consumes `useLabDashboard` verbatim — same fields
 * (`payload`, `loading`, `refreshing`, `error`, `refresh`), zero re-derive.
 * `statCards` / `sectionErrors` / `countReagentAlerts` are the identical
 * pure presentation compute already in this file — reproduced verbatim.
 *
 * The dark `LabDashboardDisplay` preview box (mode="preview") is left
 * completely untouched — only the light chrome around it is reskinned.
 */

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
      <PageHeader
        title="Dashboard xét nghiệm"
        sub="Trang launcher cho màn hình khoa xét nghiệm. Preview dùng cùng payload với TV công khai để tránh phân nhánh dữ liệu hiển thị."
        actions={
          <>
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-2 rounded-field border border-line bg-card px-4 py-2 text-[14px] font-medium text-ink-700 hover:bg-paper"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Làm mới
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

      {payload && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <KpiCard
              key={card.label}
              label={card.label}
              value={card.value.toLocaleString('vi-VN')}
              delta={card.helper}
            />
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <WidgetCard
          title="Preview màn hình"
          actions={
            <button
              type="button"
              onClick={openTv}
              className="inline-flex items-center gap-2 self-start rounded-field border border-line px-3 py-2 text-[13px] font-medium text-ink-700 hover:bg-paper"
            >
              <ExternalLink className="h-4 w-4" />
              Mở tab mới
            </button>
          }
        >
          <p className="mb-4 -mt-2 text-[13px] text-ink-600">
            Route công khai: <span className="font-medium text-ink-900">/lab-dashboard/tv</span>
          </p>

          <div className="overflow-auto rounded-[28px] border border-ink-900 bg-[#0a0e14] shadow-2xl">
            <LabDashboardDisplay
              payload={payload}
              loading={loading}
              refreshing={refreshing}
              error={error}
              mode="preview"
              onRetry={() => void refresh()}
            />
          </div>
        </WidgetCard>

        <section className="space-y-4">
          <WidgetCard title="Tình trạng dữ liệu">
            <div className="space-y-3 text-[14px]">
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Lần cập nhật gần nhất</span>
                <span className="font-medium text-ink-900">
                  {payload ? formatTimeAgo(payload.meta.generatedAt) : 'Đang tải'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Ngày dữ liệu HIS</span>
                <span className="font-medium text-ink-900">{payload?.meta.asOfDate || '--'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Ngày snapshot tồn kho</span>
                <span className="font-medium text-ink-900">
                  {payload?.meta.sectionFreshness.reagents.dataDate || '--'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Lỗi từng phần</span>
                {sectionErrors.length > 0 ? (
                  <StatusBadge
                    status="danger"
                    label={sectionErrors.map((key) => SECTION_LABELS[key]).join(', ')}
                  />
                ) : (
                  <StatusBadge status="ok" label="Không có" />
                )}
              </div>
            </div>
          </WidgetCard>

          <WidgetCard title="Vận hành TV">
            <div className="space-y-3 text-[14px] text-ink-600">
              <p>
                TV public chạy ngoài <span className="font-medium text-ink-900">AppShell</span> để giữ layout full-screen và có thể mở qua slug trong bảng <span className="font-medium text-ink-900">fdc_tv_screens</span>.
              </p>
              <p>
                Seed mặc định dùng slug <span className="font-medium text-ink-900">xet-nghiem</span>, trỏ nội bộ đến <span className="font-medium text-ink-900">/lab-dashboard/tv</span>.
              </p>
              <p>
                V1 chỉ hiển thị <span className="font-medium text-ink-900">mã bệnh nhân</span>, không đưa tên bệnh nhân lên launcher hoặc màn hình TV.
              </p>
            </div>
          </WidgetCard>
        </section>
      </div>
    </div>
  );
}
