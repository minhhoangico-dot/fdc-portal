/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export { StatusBadge } from './StatusBadge';
export type { StatusBadgeProps, StatusKind } from './StatusBadge';

export { KpiCard } from './KpiCard';
export type { KpiCardProps, KpiDeltaDirection } from './KpiCard';

export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';

export { TabBar } from './TabBar';
export type { TabBarItem, TabBarProps } from './TabBar';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { WidgetCard } from './WidgetCard';
export type { WidgetCardProps } from './WidgetCard';

// Phase 2 (Flow) primitives. Waves import these by direct path to avoid barrel
// contention; these exports are the canonical entry point for future callers.
export { ApprovalCard } from './ApprovalCard';
export type { ApprovalCardProps } from './ApprovalCard';

export { InboxItem } from './InboxItem';
export type { InboxItemProps } from './InboxItem';

export { SealMark } from './SealMark';
export type { SealMarkProps } from './SealMark';

// Phase 3 (Kho & Dược) shared presentation primitives. Waves import these by
// direct path to avoid barrel contention; these exports are the canonical entry
// point for future callers.
export { DataTable } from './DataTable';
export type { DataTableColumn, DataTableProps } from './DataTable';

export {
  ChartFrame,
  ValueTrendChart,
  TopMaterialsChart,
  CHART_BRAND,
  CHART_AXIS_TICK,
  CHART_GRID,
  CHART_TOOLTIP_STYLE,
} from './ChartFrame';
export type {
  ChartFrameProps,
  ValueTrendChartProps,
  TopMaterialsChartProps,
} from './ChartFrame';
