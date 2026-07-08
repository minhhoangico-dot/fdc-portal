/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactElement, ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { SnapshotHistory, TopMaterial } from '@/types/inventory';

/**
 * ChartFrame — recharts chrome wrapper (Phase 3 shared primitive, direction
 * §5.2 / spec §3.2). Titled card + optional actions slot + fixed height +
 * ResponsiveContainer + loading skeleton + empty state. It does NOT compute
 * anything; it renders the data array it is handed.
 *
 * Pure presentational: no supabase, no viewmodels, no import from lib/utils.
 * The two presets take formatter PROPS so this file has zero intra-wave
 * dependency — callers pass `valueFormatter={formatVND}` /
 * `compactFormatter={formatCompact}` from `@/lib/utils`.
 *
 * One palette (brand viridian, not indigo), one tooltip — every chart reads
 * identically via the exported style constants below.
 */

/** Brand line/fill for every chart (was indigo #6366f1 → viridian). */
export const CHART_BRAND = 'var(--color-brand-600)';
/** Axis tick style — spread onto recharts `tick={...}`. */
export const CHART_AXIS_TICK = { fontSize: 11, fill: '#5C564E' } as const;
/** Cartesian grid style — spread onto `<CartesianGrid {...CHART_GRID} />`. */
export const CHART_GRID = { strokeDasharray: '3 3', stroke: '#EAE7E1' } as const;
/** Tooltip content style — one card for every chart. */
export const CHART_TOOLTIP_STYLE = {
  borderRadius: '8px',
  border: '1px solid #EAE7E1',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  fontSize: 12,
} as const;

export interface ChartFrameProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Fixed plot height in px (default 288). */
  height?: number;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyLabel?: ReactNode;
  /** A recharts chart element; ChartFrame wraps it in ResponsiveContainer. */
  children: ReactElement;
  className?: string;
}

export function ChartFrame({
  title,
  subtitle,
  actions,
  height = 288,
  isLoading = false,
  isEmpty = false,
  emptyLabel = 'Không có dữ liệu.',
  children,
  className = '',
}: ChartFrameProps) {
  return (
    <div className={`rounded-card bg-card p-4 shadow-card ${className}`.trim()}>
      {(title || subtitle || actions) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h3 className="text-[16px] font-[600] leading-tight text-ink-900">{title}</h3>
            )}
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-600">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div style={{ height }}>
        {isLoading ? (
          <div className="h-full w-full animate-pulse rounded-card bg-paper" />
        ) : isEmpty ? (
          <div className="flex h-full w-full items-center justify-center px-4 text-center text-[13px] text-ink-400">
            {emptyLabel}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/** Default x-axis date tick: ISO date → dd/MM (falls back to raw string). */
function defaultXFormat(value: string): string {
  try {
    return format(parseISO(value), 'dd/MM');
  } catch {
    return value;
  }
}

/** Tooltip label for an ISO date → dd/MM/yyyy (falls back to raw string). */
function tooltipDateLabel(value: unknown): string {
  try {
    return format(parseISO(String(value)), 'dd/MM/yyyy');
  } catch {
    return String(value);
  }
}

export interface ValueTrendChartProps {
  data: SnapshotHistory[];
  /** Tooltip series label (default "Giá trị tồn"). */
  valueLabel?: string;
  /** X-axis date tick formatter (default dd/MM). */
  xFormat?: (value: string) => string;
  /** Full VND formatter for the tooltip (pass `formatVND`). */
  valueFormatter: (value: number) => string;
  /** Compact formatter for the Y-axis ticks (pass `formatCompact`). */
  compactFormatter: (value: number) => string;
  /** Gradient id — override when two trend charts render simultaneously. */
  gradientId?: string;
}

/**
 * Value-trend area chart preset (date → totalValue). Returns the bare recharts
 * chart so callers wrap it in <ChartFrame>. Data keys match `SnapshotHistory`
 * (`date` / `totalValue`) verbatim.
 */
export function ValueTrendChart({
  data,
  valueLabel = 'Giá trị tồn',
  xFormat = defaultXFormat,
  valueFormatter,
  compactFormatter,
  gradientId = 'khoValueTrendGradient',
}: ValueTrendChartProps): ReactElement {
  return (
    <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={CHART_BRAND} stopOpacity={0.15} />
          <stop offset="95%" stopColor={CHART_BRAND} stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid {...CHART_GRID} vertical={false} />
      <XAxis
        dataKey="date"
        tickFormatter={xFormat}
        axisLine={false}
        tickLine={false}
        tick={CHART_AXIS_TICK}
        dy={10}
      />
      <YAxis
        axisLine={false}
        tickLine={false}
        tick={CHART_AXIS_TICK}
        tickFormatter={compactFormatter}
        domain={['dataMin * 0.95', 'dataMax * 1.05']}
      />
      <Tooltip
        contentStyle={CHART_TOOLTIP_STYLE}
        labelFormatter={tooltipDateLabel}
        formatter={(value: number) => [valueFormatter(value), valueLabel]}
      />
      <Area
        type="monotone"
        dataKey="totalValue"
        stroke={CHART_BRAND}
        strokeWidth={2}
        fill={`url(#${gradientId})`}
        isAnimationActive={false}
      />
    </AreaChart>
  );
}

export interface TopMaterialsChartProps {
  data: TopMaterial[];
  /** Tooltip series label (default "Giá trị"). */
  valueLabel?: string;
  /** Full VND formatter for the tooltip (pass `formatVND`). */
  valueFormatter: (value: number) => string;
  /** Compact formatter for the X-axis ticks (pass `formatCompact`). */
  compactFormatter: (value: number) => string;
}

/**
 * Top-10 horizontal bar preset (value → chartLabel). Returns the bare recharts
 * chart so callers wrap it in <ChartFrame>. Data keys match `TopMaterial`
 * (`value` / `chartLabel`) verbatim.
 */
export function TopMaterialsChart({
  data,
  valueLabel = 'Giá trị',
  valueFormatter,
  compactFormatter,
}: TopMaterialsChartProps): ReactElement {
  return (
    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 5, left: 10, bottom: 0 }}>
      <CartesianGrid {...CHART_GRID} horizontal={false} />
      <XAxis
        type="number"
        axisLine={false}
        tickLine={false}
        tick={CHART_AXIS_TICK}
        tickFormatter={compactFormatter}
      />
      <YAxis
        type="category"
        dataKey="chartLabel"
        width={140}
        axisLine={false}
        tickLine={false}
        tick={{ fontSize: 10, fill: '#201D1A' }}
      />
      <Tooltip
        cursor={{ fill: '#EAE7E1' }}
        contentStyle={CHART_TOOLTIP_STYLE}
        formatter={(value: number) => [valueFormatter(value), valueLabel]}
      />
      <Bar
        dataKey="value"
        fill={CHART_BRAND}
        radius={[0, 4, 4, 0]}
        barSize={16}
        isAnimationActive={false}
      />
    </BarChart>
  );
}

export default ChartFrame;
