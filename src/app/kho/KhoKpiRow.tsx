/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertTriangle, Clock, DollarSign, Package } from 'lucide-react';

import { formatVND } from '@/lib/utils';
import { KpiCard } from '@/ui/KpiCard';

/**
 * KhoKpiRow — Thuốc (pharmacy) overview KPI strip, re-skinned from
 * PharmacyKpiGrid onto ui/KpiCard (direction §5.2 / phase3-kho spec §5).
 *
 * Pure presentational: renders the `stats` it is given, no supabase, no
 * viewmodel access. Click handlers are forwarded verbatim from the shell —
 * this component does not decide navigation, only reports the click.
 */

export interface KhoKpiRowStats {
  totalItems: number;
  activeAnomaliesCount: number;
  nearExpiryCount: number;
  estimatedValue: number;
}

export interface KhoKpiRowProps {
  stats: KhoKpiRowStats;
  onShowAllItems: () => void;
  onShowAnomalies: () => void;
  onShowNearExpiry: () => void;
  onShowValuation: () => void;
}

const TILE_BUTTON_CLASS =
  'rounded-card text-left transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600';

export function KhoKpiRow({
  stats,
  onShowAllItems,
  onShowAnomalies,
  onShowNearExpiry,
  onShowValuation,
}: KhoKpiRowProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <button type="button" onClick={onShowAllItems} className={TILE_BUTTON_CLASS}>
        <KpiCard
          icon={<Package className="h-5 w-5" />}
          value={stats.totalItems}
          label="Tổng mã thuốc"
        />
      </button>

      <button type="button" onClick={onShowAnomalies} className={TILE_BUTTON_CLASS}>
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          value={
            <span className={stats.activeAnomaliesCount > 0 ? 'text-danger-600' : 'text-brand-600'}>
              {stats.activeAnomaliesCount}
            </span>
          }
          label="Bất thường"
        />
      </button>

      <button type="button" onClick={onShowNearExpiry} className={TILE_BUTTON_CLASS}>
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          value={
            <span className={stats.nearExpiryCount > 0 ? 'text-warn-600' : 'text-brand-600'}>
              {stats.nearExpiryCount}
            </span>
          }
          label="Sắp hết hạn"
        />
      </button>

      <button type="button" onClick={onShowValuation} className={TILE_BUTTON_CLASS}>
        <KpiCard
          icon={<DollarSign className="h-5 w-5" />}
          value={formatVND(stats.estimatedValue)}
          label="Giá trị tồn kho"
        />
      </button>
    </div>
  );
}

export default KhoKpiRow;
