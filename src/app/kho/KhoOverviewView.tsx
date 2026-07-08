/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSearchParams } from 'react-router-dom';

import { formatCompact, formatVND } from '@/lib/utils';
import { ChartFrame, TopMaterialsChart, ValueTrendChart } from '@/ui/ChartFrame';
import { StatusBadge, type StatusKind } from '@/ui/StatusBadge';
import { WidgetCard } from '@/ui/WidgetCard';
import type {
  AnomalySeverity,
  InventoryAnomaly,
  InventoryFilterStatus,
  InventoryItem,
  SnapshotHistory,
  TopMaterial,
} from '@/types/inventory';

import OverviewTab from '@/app/inventory/OverviewTab';

import { KhoKpiRow, type KhoKpiRowStats } from './KhoKpiRow';
import type { KhoTabKey } from './khoTabs';

/**
 * KhoOverviewView — "Tổng quan" sub-tab body for the Kho & Dược workspace
 * (phase3-kho spec §5). Branches by the shape of the ACTIVE frozen viewmodel
 * (`usePharmacyInventory` / `useSupplyInventory`) forwarded by `KhoWorkspace`
 * as `vm` (enabled-dual-hook §4 — only one hook is ever enabled, no merge):
 *
 * - Thuốc: re-skin of PharmacyKpiGrid + PharmacyCharts + PharmacyAnomalyPreview
 *   onto ui/KpiCard (via KhoKpiRow) + ui/ChartFrame ValueTrendChart/TopMaterialsChart.
 * - Vật tư: the existing `OverviewTab` mounted VERBATIM (cost-per-visit /
 *   consumption analytics + useSupplyChart stay untouched this phase).
 *
 * Pure presentational: consumes the frozen viewmodel fields passed as props
 * by the shell, never fetches or transforms inventory data itself. KPI-tile
 * clicks navigate sub-tabs by writing the same `?tab=` URL param KhoWorkspace
 * reads (KhoWorkspace does not expose a navigation callback prop, so this
 * view participates in the same URL-is-source-of-truth contract directly)
 * and, where the legacy tile also changed a filter, call the frozen
 * `vm.setFilterStatus` setter — never a locally-invented filter.
 */

// Distinguishes the two vm shapes at runtime: only useSupplyInventory's
// return value exposes a top-level `inventory` field (spec §4: "supply
// additionally exposes raw inventory").
function isSupplyVm(vm: KhoOverviewVm): vm is KhoOverviewSupplyVm {
  return 'inventory' in vm;
}

interface KhoOverviewPharmacyVm {
  stats: KhoKpiRowStats;
  snapshotHistory: SnapshotHistory[];
  topMaterials: TopMaterial[];
  anomalies: InventoryAnomaly[];
  setFilterStatus: (status: InventoryFilterStatus) => void;
}

interface KhoOverviewSupplyVm {
  stats: { totalItems: number; activeAnomaliesCount: number; estimatedValue: number };
  inventory: InventoryItem[];
  anomalies: InventoryAnomaly[];
  snapshotHistory: SnapshotHistory[];
  isLoadingSnapshotHistory: boolean;
  topMaterials: TopMaterial[];
}

export type KhoOverviewVm = KhoOverviewPharmacyVm | KhoOverviewSupplyVm;

export interface KhoOverviewViewProps {
  /** The single ACTIVE viewmodel (pharmacy or supply) — enabled-dual-hook §4. */
  vm: KhoOverviewVm;
  warehouse: 'thuoc' | 'vat-tu';
}

const SEVERITY_LABELS: Record<AnomalySeverity, string> = {
  critical: 'Nghiêm trọng',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};

// Presentation-only collapse of the 4 anomaly severities onto the 4 tokened
// StatusBadge kinds (direction restraint: no invented 5th color). The exact
// severity is still legible from SEVERITY_LABELS text; KhoAnomaliesView owns
// the fuller 4-way solid map for the dedicated Bất thường tab.
const SEVERITY_STATUS: Record<AnomalySeverity, StatusKind> = {
  critical: 'danger',
  high: 'warn',
  medium: 'warn',
  low: 'info',
};

function PharmacyAnomalyPreviewSection({
  anomalies,
  onShowAll,
}: {
  anomalies: InventoryAnomaly[];
  onShowAll: () => void;
}) {
  const activeAnomalies = anomalies.filter((anomaly) => !anomaly.acknowledged);

  if (activeAnomalies.length === 0) {
    return null;
  }

  return (
    <WidgetCard
      title={`Cảnh báo cần xử lý (${activeAnomalies.length})`}
      actions={
        <button
          type="button"
          onClick={onShowAll}
          className="text-[13px] font-medium text-brand-600 hover:text-brand-700"
        >
          Xem tất cả →
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {activeAnomalies.slice(0, 6).map((anomaly) => (
          <div
            key={anomaly.id}
            className="rounded-field border border-line p-3 transition-colors hover:border-danger-600/40"
          >
            <div className="flex items-start gap-3">
              <StatusBadge
                status={SEVERITY_STATUS[anomaly.severity]}
                label={SEVERITY_LABELS[anomaly.severity] ?? anomaly.severity}
              />
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-[14px] font-[600] text-ink-900">
                  {anomaly.materialId}
                </h4>
                <p className="mt-1 line-clamp-2 text-[13px] text-ink-600">
                  {anomaly.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

function PharmacyOverviewBranch({ vm }: { vm: KhoOverviewPharmacyVm }) {
  const [, setSearchParams] = useSearchParams();

  const goToTab = (nextTab: KhoTabKey) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', nextTab);
        return next;
      },
      { replace: true },
    );
  };

  const onShowAllItems = () => {
    vm.setFilterStatus('all');
    goToTab('danh-sach');
  };

  const onShowAnomalies = () => goToTab('bat-thuong');

  const onShowNearExpiry = () => {
    vm.setFilterStatus('near_expiry');
    goToTab('danh-sach');
  };

  const onShowValuation = () => goToTab('gia-tri');

  return (
    <div className="space-y-6">
      <KhoKpiRow
        stats={vm.stats}
        onShowAllItems={onShowAllItems}
        onShowAnomalies={onShowAnomalies}
        onShowNearExpiry={onShowNearExpiry}
        onShowValuation={onShowValuation}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartFrame
          title="Biến động giá trị tồn kho (1 năm)"
          isEmpty={vm.snapshotHistory.length === 0}
          emptyLabel="Chưa có dữ liệu trong 1 năm gần nhất. Hệ thống sẽ bắt đầu thu thập sau 1-2 ngày."
        >
          {ValueTrendChart({
            data: vm.snapshotHistory,
            valueFormatter: formatVND,
            compactFormatter: formatCompact,
          })}
        </ChartFrame>

        <ChartFrame
          title="Top 10 thuốc giá trị tồn cao nhất"
          isEmpty={vm.topMaterials.length === 0}
        >
          {TopMaterialsChart({
            data: vm.topMaterials,
            valueFormatter: formatVND,
            compactFormatter: formatCompact,
          })}
        </ChartFrame>
      </div>

      <PharmacyAnomalyPreviewSection anomalies={vm.anomalies} onShowAll={onShowAnomalies} />
    </div>
  );
}

export function KhoOverviewView({ vm }: KhoOverviewViewProps) {
  if (isSupplyVm(vm)) {
    return (
      <OverviewTab
        stats={vm.stats}
        inventory={vm.inventory}
        anomalies={vm.anomalies}
        snapshotHistory={vm.snapshotHistory}
        isLoadingSnapshotHistory={vm.isLoadingSnapshotHistory}
        topMaterials={vm.topMaterials}
      />
    );
  }

  return <PharmacyOverviewBranch vm={vm} />;
}

export default KhoOverviewView;
