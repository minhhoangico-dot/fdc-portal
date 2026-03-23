/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { buildLabDashboardSourceDetails } from '@/lib/labDashboardSourceDetails';
import type { LabDashboardDetailSourceInfo } from '@/types/labDashboard';

interface LabDashboardSourcePanelProps {
  sources: LabDashboardDetailSourceInfo[];
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'HH:mm dd/MM', { locale: vi });
}

export function LabDashboardSourcePanel({ sources }: LabDashboardSourcePanelProps) {
  return (
    <section className="lab-dashboard-detail-sources">
      {sources.map((source) => {
        const details = buildLabDashboardSourceDetails(source);

        return (
          <article key={`${source.key}-${source.source}`} className="lab-dashboard-detail-source-card">
            <div className="lab-dashboard-detail-source-head">
              <div>
                <div className="lab-dashboard-detail-source-label">{source.label}</div>
                <div className="lab-dashboard-detail-source-system">{source.source.toUpperCase()}</div>
              </div>
              <div className="lab-dashboard-detail-source-meta">
                <span>Ngày dữ liệu: {source.dataDate || '—'}</span>
                <span>Payload: {formatDateTime(source.generatedAt)}</span>
              </div>
            </div>

            {details.error && <div className="lab-dashboard-detail-source-error">{details.error}</div>}

            {details.blocks.map((block) => {
              if (block.kind === 'summary') {
                return (
                  <section key={`${source.key}-summary`} className="lab-dashboard-source-summary">
                    <div className="lab-dashboard-source-summary__meta">
                      <div className="lab-dashboard-source-summary__item">
                        <span className="lab-dashboard-source-summary__label">Nguồn</span>
                        <strong>{source.source.toUpperCase()}</strong>
                      </div>
                      <div className="lab-dashboard-source-summary__item">
                        <span className="lab-dashboard-source-summary__label">Ngày dữ liệu</span>
                        <strong>{source.dataDate || '—'}</strong>
                      </div>
                      <div className="lab-dashboard-source-summary__item">
                        <span className="lab-dashboard-source-summary__label">Payload</span>
                        <strong>{formatDateTime(source.generatedAt)}</strong>
                      </div>
                      <div className="lab-dashboard-source-summary__item">
                        <span className="lab-dashboard-source-summary__label">Dòng đang hiển thị</span>
                        <strong>{block.displayedRowCount === null ? '—' : block.displayedRowCount}</strong>
                      </div>
                    </div>
                    <p className="lab-dashboard-source-summary__text">{block.summary}</p>
                  </section>
                );
              }

              if (block.kind === 'pipeline') {
                return (
                  <section key={`${source.key}-pipeline`} className="lab-dashboard-source-section">
                    <div className="lab-dashboard-source-section__title">Luồng lọc dữ liệu</div>
                    <div className="lab-dashboard-source-pipeline">
                      {block.steps.map((step) => (
                        <article key={step.key} className="lab-dashboard-source-pipeline__step">
                          <div className="lab-dashboard-source-pipeline__head">
                            <div className="lab-dashboard-source-pipeline__label">{step.label}</div>
                            <div className="lab-dashboard-source-pipeline__counts">
                              <strong>{step.inputCount}</strong>
                              <span>→</span>
                              <strong>{step.outputCount}</strong>
                            </div>
                          </div>
                          <p className="lab-dashboard-source-pipeline__rule">{step.ruleSummary}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                );
              }

              if (block.kind === 'focusReason') {
                return (
                  <section key={`${source.key}-focus`} className="lab-dashboard-source-focus">
                    <div className="lab-dashboard-source-section__title">Lý do giữ focus hiện tại</div>
                    <p>{block.reason}</p>
                  </section>
                );
              }

              if (block.kind === 'metricExplanation') {
                return (
                  <section key={`${source.key}-metric`} className="lab-dashboard-source-section">
                    <div className="lab-dashboard-source-section__title">Giải thích chỉ số</div>
                    <div className="lab-dashboard-source-list">
                      {block.items.map((item) => (
                        <article key={item.label} className="lab-dashboard-source-list__item">
                          <div className="lab-dashboard-source-list__title">{item.label}</div>
                          <p>{item.description}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                );
              }

              if (block.kind === 'datasets') {
                return (
                  <section key={`${source.key}-datasets`} className="lab-dashboard-source-section">
                    <div className="lab-dashboard-source-section__title">Tập dữ liệu tham gia</div>
                    <div className="lab-dashboard-source-list">
                      {block.items.map((item) => (
                        <article key={item.key} className="lab-dashboard-source-list__item">
                          <div className="lab-dashboard-source-list__title">{item.label}</div>
                          <p>{item.role}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                );
              }

              return (
                <section key={`${source.key}-legacy`} className="lab-dashboard-source-fallback">
                  <div className="lab-dashboard-source-section__title">Ghi chú cách tính</div>
                  <ul className="lab-dashboard-detail-source-list">
                    {block.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </article>
        );
      })}
    </section>
  );
}
