/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FlaskConical,
  RefreshCw,
} from 'lucide-react';
import {
  buildLabDashboardSummaryModel,
  getAbnormalSeverityLabel,
  getReagentStatusLabel,
} from '@/lib/labDashboardDisplayModel';
import { cn, formatTimeAgo } from '@/lib/utils';
import type {
  LabDashboardDetailSelection,
  LabDashboardPayload,
  LabDashboardSectionKey,
} from '@/types/labDashboard';
import '@/app/lab-dashboard/lab-dashboard.css';

const SECTION_LABELS: Record<LabDashboardSectionKey, string> = {
  queue: 'Hàng chờ',
  tat: 'TAT',
  abnormal: 'Kết quả bất thường',
  reagents: 'Tồn kho khoa xét nghiệm',
};

const QUEUE_ICONS = {
  waiting: Clock3,
  processing: FlaskConical,
  done: CheckCircle2,
} as const;

type LabDashboardDisplayMode = 'preview' | 'tv';

interface LabDashboardDisplayProps {
  payload: LabDashboardPayload | null;
  loading: boolean;
  refreshing?: boolean;
  error?: string | null;
  mode?: LabDashboardDisplayMode;
  onRetry?: () => void;
  onOpenDetail?: (selection: LabDashboardDetailSelection) => void;
}

function formatClockDate(date: Date): string {
  const label = format(date, 'EEEE, dd/MM/yyyy', { locale: vi });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function LabDashboardDisplay({
  payload,
  loading,
  refreshing = false,
  error,
  mode = 'tv',
  onRetry,
  onOpenDetail,
}: LabDashboardDisplayProps) {
  const [now, setNow] = React.useState(() => new Date());
  const canDrillDown = mode === 'tv' && Boolean(onOpenDetail);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const openDetail = React.useCallback(
    (selection: LabDashboardDetailSelection) => {
      if (canDrillDown && onOpenDetail) {
        onOpenDetail(selection);
      }
    },
    [canDrillDown, onOpenDetail],
  );

  if (!payload && loading) {
    return (
      <div className={cn('lab-dashboard-screen', `lab-dashboard-screen--${mode}`, 'lab-dashboard-state')}>
        <div className="lab-dashboard-state__spinner" />
        <div className="lab-dashboard-state__title">Đang tải dashboard xét nghiệm</div>
        <div className="lab-dashboard-state__description">Kết nối dữ liệu live từ HIS và tồn kho thuốc khoa xét nghiệm.</div>
      </div>
    );
  }

  if (!payload && error) {
    return (
      <div className={cn('lab-dashboard-screen', `lab-dashboard-screen--${mode}`, 'lab-dashboard-state')}>
        <AlertTriangle className="lab-dashboard-state__icon" />
        <div className="lab-dashboard-state__title">Không thể tải dashboard xét nghiệm</div>
        <div className="lab-dashboard-state__description">{error}</div>
        {onRetry && (
          <button type="button" className="lab-dashboard-state__button" onClick={onRetry}>
            Thử lại
          </button>
        )}
      </div>
    );
  }

  if (!payload) {
    return null;
  }

  const sectionErrorKeys = Object.keys(payload.meta.sectionErrors || {}) as LabDashboardSectionKey[];
  const summaryModel = buildLabDashboardSummaryModel(payload);
  const reagentGroups = summaryModel.shouldLoopReagentChips
    ? [
        summaryModel.loopedReagentChips.slice(0, summaryModel.reagentChips.length),
        summaryModel.loopedReagentChips.slice(summaryModel.reagentChips.length),
      ]
    : [summaryModel.reagentChips];

  return (
    <div className={cn('lab-dashboard-screen', `lab-dashboard-screen--${mode}`)}>
      <header className="lab-dashboard-header">
        <div className="lab-dashboard-header__left">
          <div className="lab-dashboard-header__logo">XN</div>
          <div>
            <div className="lab-dashboard-header__eyebrow">Phòng khám Gia Đình • Khoa Xét nghiệm</div>
            <div className="lab-dashboard-header__title">
              Dashboard <span>Xét nghiệm</span>
            </div>
            <div className="lab-dashboard-header__meta">
              Cập nhật {formatTimeAgo(payload.meta.generatedAt)}
              {payload.meta.sectionFreshness.reagents.dataDate ? ` • Tồn kho ngày ${payload.meta.sectionFreshness.reagents.dataDate}` : ''}
            </div>
          </div>
        </div>

        <div className="lab-dashboard-header__right">
          <div className="lab-dashboard-live">
            <span className="lab-dashboard-live__dot" />
            <span className="lab-dashboard-live__label">{refreshing ? 'ĐANG LÀM MỚI' : 'TRỰC TIẾP'}</span>
            {refreshing && <RefreshCw className="lab-dashboard-live__spinner" />}
          </div>
          <div className="lab-dashboard-clock">
            <div className="lab-dashboard-clock__time">{format(now, 'HH:mm:ss')}</div>
            <div className="lab-dashboard-clock__date">{formatClockDate(now)}</div>
          </div>
        </div>
      </header>

      <main className="lab-dashboard-main">
        {(sectionErrorKeys.length > 0 || (error && payload)) && (
          <div className="lab-dashboard-banners">
            {sectionErrorKeys.length > 0 && (
              <div className="lab-dashboard-banner lab-dashboard-banner--warning">
                Một số phần dữ liệu đang tạm thời không sẵn sàng: {sectionErrorKeys.map((key) => SECTION_LABELS[key]).join(' • ')}
              </div>
            )}
            {error && payload && (
              <div className="lab-dashboard-banner lab-dashboard-banner--danger">
                Không thể làm mới tạm thời. Đang hiển thị dữ liệu gần nhất.
              </div>
            )}
          </div>
        )}

        <section className="lab-dashboard-status-row">
          {summaryModel.queueCards.map((card) => {
            const Icon = QUEUE_ICONS[card.key];
            const content = (
              <>
                <div className="lab-dashboard-status-card__icon">
                  <Icon size={18} />
                </div>
                <div className="lab-dashboard-status-card__label">{card.label}</div>
                <div className="lab-dashboard-status-card__value">{card.value.toLocaleString('vi-VN')}</div>
                <div className="lab-dashboard-status-card__sub">{card.subLabel}</div>
              </>
            );

            if (!canDrillDown) {
              return (
                <article key={card.key} className={cn('lab-dashboard-status-card', `lab-dashboard-status-card--${card.key}`)}>
                  {content}
                </article>
              );
            }

            return (
              <button
                key={card.key}
                type="button"
                className={cn(
                  'lab-dashboard-status-card',
                  `lab-dashboard-status-card--${card.key}`,
                  'lab-dashboard-clickable-card',
                )}
                onClick={() => openDetail({ section: 'queue', focus: card.focus })}
              >
                {content}
              </button>
            );
          })}
        </section>

        <article className="lab-dashboard-card">
          <div className="lab-dashboard-card__header">
            <div className="lab-dashboard-card__label">
              <span className="lab-dashboard-card__dot lab-dashboard-card__dot--blue" />
              Thời gian trả kết quả (TAT)
            </div>
          </div>
          <div className="lab-dashboard-tat-grid">
            {summaryModel.tatCards.map((item) => {
              const content = (
                <>
                  <div className="lab-dashboard-tat-card__label">{item.label}</div>
                  <div className={cn('lab-dashboard-tat-card__value', `lab-dashboard-tat-card__value--${item.tone}`)}>
                    {item.value.toLocaleString('vi-VN')}
                    <span className="lab-dashboard-tat-card__unit">phút</span>
                  </div>
                  <div className="lab-dashboard-tat-card__bar">
                    <div
                      className={cn('lab-dashboard-tat-card__bar-fill', `lab-dashboard-tat-card__bar-fill--${item.tone}`)}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </>
              );

              if (!canDrillDown) {
                return (
                  <div key={item.key} className="lab-dashboard-tat-card">
                    {content}
                  </div>
                );
              }

              return (
                <button
                  key={item.key}
                  type="button"
                  className="lab-dashboard-tat-card lab-dashboard-clickable-card"
                  onClick={() => openDetail({ section: 'tat', focus: item.focus })}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </article>

        <article className="lab-dashboard-card">
          <div className="lab-dashboard-card__header">
            <div className="lab-dashboard-card__label">
              <span className="lab-dashboard-card__dot lab-dashboard-card__dot--violet" />
              TAT theo nhóm xét nghiệm
            </div>
          </div>

          {summaryModel.typeRows.length > 0 ? (
            <div className="lab-dashboard-type-list">
              {summaryModel.typeRows.map((item) => {
                const content = (
                  <>
                    <div className="lab-dashboard-type-row__name">{item.name}</div>
                    <div className="lab-dashboard-type-row__bar">
                      <div
                        className={cn('lab-dashboard-type-row__bar-fill', `lab-dashboard-type-row__bar-fill--${item.tone}`)}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <div className={cn('lab-dashboard-type-row__value', `lab-dashboard-type-row__value--${item.tone}`)}>
                      {item.displayValue}
                    </div>
                  </>
                );

                if (!canDrillDown) {
                  return (
                    <div key={item.key} className="lab-dashboard-type-row">
                      {content}
                    </div>
                  );
                }

                return (
                  <button
                    key={item.key}
                    type="button"
                    className="lab-dashboard-type-row lab-dashboard-clickable-row"
                    onClick={() => openDetail({ section: 'tat', focus: item.focus })}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="lab-dashboard-empty">Chưa có đủ dữ liệu để tính TAT theo nhóm xét nghiệm.</div>
          )}
        </article>

        <article className="lab-dashboard-card">
          <div className="lab-dashboard-card__header">
            <div className="lab-dashboard-card__label">
              <span className="lab-dashboard-card__dot lab-dashboard-card__dot--red" />
              Kết quả ngoài khoảng tham chiếu
            </div>
          </div>

          <div className="lab-dashboard-abnormal">
            <div className="lab-dashboard-abnormal__summary">
              {canDrillDown ? (
                <>
                  <button
                    type="button"
                    className="lab-dashboard-abnormal__stat lab-dashboard-clickable-card"
                    onClick={() => openDetail({ section: 'abnormal', focus: 'all' })}
                  >
                    <div className="lab-dashboard-abnormal__stat-label">Bất thường</div>
                    <div className="lab-dashboard-abnormal__stat-value">{payload.abnormal.abnormalCount.toLocaleString('vi-VN')}</div>
                  </button>
                  <button
                    type="button"
                    className="lab-dashboard-abnormal__stat lab-dashboard-clickable-card"
                    onClick={() => openDetail({ section: 'abnormal', focus: 'all' })}
                  >
                    <div className="lab-dashboard-abnormal__stat-label">Tổng KQ hôm nay</div>
                    <div className="lab-dashboard-abnormal__stat-value lab-dashboard-abnormal__stat-value--neutral">
                      {payload.abnormal.totalResults.toLocaleString('vi-VN')}
                    </div>
                  </button>
                </>
              ) : (
                <>
                  <div className="lab-dashboard-abnormal__stat">
                    <div className="lab-dashboard-abnormal__stat-label">Bất thường</div>
                    <div className="lab-dashboard-abnormal__stat-value">{payload.abnormal.abnormalCount.toLocaleString('vi-VN')}</div>
                  </div>
                  <div className="lab-dashboard-abnormal__stat">
                    <div className="lab-dashboard-abnormal__stat-label">Tổng KQ hôm nay</div>
                    <div className="lab-dashboard-abnormal__stat-value lab-dashboard-abnormal__stat-value--neutral">
                      {payload.abnormal.totalResults.toLocaleString('vi-VN')}
                    </div>
                  </div>
                </>
              )}
            </div>

            {payload.abnormal.rows.length > 0 ? (
              <div className="lab-dashboard-abnormal__scroll">
                <div
                  className={cn(
                    'lab-dashboard-abnormal__scroll-content',
                    summaryModel.shouldLoopAbnormalRows && 'lab-dashboard-abnormal__scroll-content--loop',
                  )}
                >
                  <table className="lab-dashboard-abnormal__table">
                    <thead>
                      <tr>
                        <th>Mã BN</th>
                        <th>Mã XN</th>
                        <th>Xét nghiệm</th>
                        <th>Giá trị</th>
                        <th>Mức</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryModel.loopedAbnormalRows.map((row, index) => (
                        <tr key={`${row.patientCode}-${row.testCode}-${index}`}>
                          <td>{row.patientCode}</td>
                          <td className="lab-dashboard-abnormal__mono">{row.testCode}</td>
                          <td>{row.testName}</td>
                          <td className="lab-dashboard-abnormal__mono">{row.value}</td>
                          <td>
                            <span className={cn('lab-dashboard-badge', `lab-dashboard-badge--${row.severity}`)}>
                              {getAbnormalSeverityLabel(row.severity)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="lab-dashboard-empty">Chưa ghi nhận kết quả bất thường trong ngày.</div>
            )}
          </div>
        </article>

        <article className="lab-dashboard-card lab-dashboard-card--wide">
          <div className="lab-dashboard-card__header">
            <div className="lab-dashboard-card__label">
              <span className="lab-dashboard-card__dot lab-dashboard-card__dot--amber" />
              Tồn kho thuốc cho khoa xét nghiệm
            </div>
          </div>

          {summaryModel.reagentChips.length > 0 ? (
            <div className={cn(
              'lab-dashboard-reagents',
              summaryModel.reagentLayout === 'compact' && 'lab-dashboard-reagents--compact'
            )}>
              <div className="lab-dashboard-reagents__viewport">
                <div
                  className={cn(
                    'lab-dashboard-reagents__track',
                    summaryModel.shouldLoopReagentChips && 'lab-dashboard-reagents__track--loop'
                  )}
                >
                  {reagentGroups.map((group, groupIndex) => (
                    <div
                      key={`reagent-group-${groupIndex}`}
                      className="lab-dashboard-reagents__group"
                      aria-hidden={summaryModel.shouldLoopReagentChips && groupIndex === 1 ? true : undefined}
                    >
                      {group.map((reagent, reagentIndex) => {
                        const content = (
                          <>
                            <div className="lab-dashboard-reagent__name">{reagent.name}</div>
                            <div className="lab-dashboard-reagent__bar">
                              <div
                                className={cn(
                                  'lab-dashboard-reagent__bar-fill',
                                  `lab-dashboard-reagent__bar-fill--${getReagentStatusLabel(reagent.status)}`
                                )}
                                style={{ width: `${reagent.percentage}%` }}
                              />
                            </div>
                            <div
                              className={cn(
                                'lab-dashboard-reagent__value',
                                `lab-dashboard-reagent__value--${getReagentStatusLabel(reagent.status)}`
                              )}
                            >
                              {reagent.quantityLabel}
                            </div>
                          </>
                        );

                        if (!canDrillDown) {
                          return (
                            <div key={`${reagent.key}-${groupIndex}-${reagentIndex}`} className="lab-dashboard-reagent">
                              {content}
                            </div>
                          );
                        }

                        return (
                          <button
                            key={`${reagent.key}-${groupIndex}-${reagentIndex}`}
                            type="button"
                            className="lab-dashboard-reagent lab-dashboard-clickable-row"
                            onClick={() => openDetail({ section: "reagents", focus: reagent.focus })}
                          >
                            {content}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="lab-dashboard-empty">Chưa ghi nhận vật tư tồn dương tại Khoa Xét Nghiệm.</div>
          )}
        </article>
      </main>

      <div className="lab-dashboard-refresh-bar" />
      {mode === 'preview' && (
        <div className="lab-dashboard-footer">
          <Activity size={14} />
          <span>
            HIS ngày {payload.meta.asOfDate}
            {payload.meta.sectionFreshness.reagents.dataDate ? ` • Tồn kho ngày ${payload.meta.sectionFreshness.reagents.dataDate}` : ''}
          </span>
        </div>
      )}
    </div>
  );
}
