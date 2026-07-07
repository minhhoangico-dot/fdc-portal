/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Inbox } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useHomeToday } from '@/viewmodels/useHomeToday';
import { getHomeWidgetsForRole, type HomeWidget } from '@/lib/home-widgets';
import { EmptyState, WidgetCard } from '@/ui';
import { cn } from '@/lib/utils';

/**
 * Home "Hôm nay" (direction §4.3) — the role-composed landing surface that
 * replaces the old role-hardcoded dashboard. Composition, top→bottom:
 *   1. Header  — greeting (34/600) + VN date + bridge sync dot
 *   2. Strip   — "Cần xử lý · N" inbox pull, brand-50, taps through to the inbox
 *   3. Widgets — permission-keyed registry grid (1 / md:2 / xl:3), each widget
 *                code-split, self-fetching, and isolated so one failure never
 *                blanks the rest of Home.
 * The whole surface performs the single orchestrated load stagger (60ms/step),
 * disabled under `prefers-reduced-motion`.
 */

/** md/xl column span for a widget. Literal class strings so Tailwind detects them. */
function spanClass(span: HomeWidget['span']): string {
  if (span === 3) return 'md:col-span-2 xl:col-span-3';
  if (span === 2) return 'md:col-span-2 xl:col-span-2';
  return '';
}

/** Per-element load-stagger style (skipped when reduced motion is preferred). */
function staggerStyle(step: number): React.CSSProperties {
  return { animationDelay: `${Math.min(step * 60, 300)}ms` };
}

function WidgetFallback() {
  return (
    <WidgetCard>
      <div className="animate-pulse space-y-3" aria-hidden="true">
        <div className="h-4 w-1/3 rounded bg-line" />
        <div className="h-16 w-full rounded-card bg-line/60" />
      </div>
    </WidgetCard>
  );
}

/**
 * Isolates a single widget: a crash or lazy-load failure degrades to a quiet
 * card instead of blanking the whole Home grid (Promise.allSettled semantics).
 */
class WidgetBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <WidgetCard>
          <p className="text-[13px] text-ink-400">Không thể tải mục này lúc này.</p>
        </WidgetCard>
      );
    }
    return this.props.children;
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const header = useHomeToday();

  if (!user || !header) return null;

  const widgets = getHomeWidgetsForRole(user.role);

  return (
    <div className="space-y-6">
      {/* 1. Header — greeting + VN date + sync dot */}
      <header className="fdc-home-enter" style={staggerStyle(0)}>
        <h1 className="text-[34px] font-[600] leading-tight text-ink-900">
          Chào {header.name},
        </h1>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-[14px] text-ink-600">{header.dateLabel}</p>
          {header.sync.available && (
            <span
              className={cn(
                'h-2 w-2 flex-shrink-0 rounded-full',
                header.sync.isStale ? 'bg-warn-600' : 'bg-brand-500',
              )}
              title={
                header.sync.isStale
                  ? 'Dữ liệu đồng bộ có thể chưa cập nhật'
                  : 'Đồng bộ dữ liệu đang hoạt động'
              }
              aria-label={
                header.sync.isStale ? 'Đồng bộ dữ liệu chậm' : 'Đồng bộ dữ liệu đang hoạt động'
              }
            />
          )}
        </div>
      </header>

      {/* 2. Inbox strip — "Cần xử lý · N" */}
      <Link
        to={header.inbox.path}
        className="fdc-home-enter flex items-center justify-between gap-4 rounded-card bg-brand-50 p-4 transition-colors hover:bg-brand-100"
        style={staggerStyle(1)}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-field bg-brand-100 text-brand-700">
            <Inbox className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-[16px] font-[600] text-brand-700">Cần xử lý</div>
            <div className="text-[13px] text-ink-600">
              {header.inbox.count > 0
                ? 'Việc đang chờ bạn hôm nay'
                : 'Bạn đã xử lý hết việc hôm nay'}
            </div>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <span className="text-[28px] font-[700] leading-none text-brand-700 [font-variant-numeric:tabular-nums]">
            {header.inbox.count}
          </span>
          <ChevronRight className="h-5 w-5 text-brand-600" />
        </div>
      </Link>

      {/* 3. Widget grid */}
      {widgets.length === 0 ? (
        <div className="fdc-home-enter" style={staggerStyle(2)}>
          <EmptyState title="Hôm nay chưa có việc cần bạn xử lý ✓" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {widgets.map((widget, index) => {
            const Widget = widget.Component;
            return (
              <div
                key={widget.key}
                className={cn('fdc-home-enter', spanClass(widget.span))}
                style={staggerStyle(index + 2)}
              >
                <WidgetBoundary>
                  <Suspense fallback={<WidgetFallback />}>
                    <Widget />
                  </Suspense>
                </WidgetBoundary>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
