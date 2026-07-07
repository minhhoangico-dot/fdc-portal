/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Boxes } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { formatVND } from '@/lib/utils';
import { KpiCard } from '@/ui/KpiCard';
import { StatusBadge } from '@/ui/StatusBadge';
import { WidgetCard } from '@/ui/WidgetCard';

/**
 * "Tồn kho" — Home "Hôm nay" widget (registry key `ton-kho`,
 * permission `inventory.view`). Latest total inventory value (summed across
 * the `inventory`/`pharmacy` module types from `fdc_inventory_daily_value`'s
 * most recent snapshot per type) + count of open (unacknowledged) anomalies
 * from `fdc_analytics_anomalies`.
 *
 * Self-contained: never throws. Loading -> skeleton. Fetch failure -> quiet
 * inline error text, no crash, no blank Home.
 */

type TonKhoState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; totalValue: number; anomalyCount: number };

const MODULE_TYPES = ['inventory', 'pharmacy'] as const;

function useTonKhoSummary(): TonKhoState {
  const [state, setState] = useState<TonKhoState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Latest snapshot row per module type (recent-first; first hit per
        // type is the latest since ordering is snapshot_date desc).
        const { data: valueRows, error: valueError } = await supabase
          .from('fdc_inventory_daily_value')
          .select('module_type, total_value, snapshot_date')
          .in('module_type', MODULE_TYPES)
          .order('snapshot_date', { ascending: false })
          .limit(60);

        if (valueError) throw valueError;

        const latestByModule = new Map<string, number>();
        for (const row of valueRows ?? []) {
          const moduleType = (row as any).module_type as string;
          if (!latestByModule.has(moduleType)) {
            latestByModule.set(moduleType, Number((row as any).total_value) || 0);
          }
        }
        const totalValue = Array.from(latestByModule.values()).reduce((sum, v) => sum + v, 0);

        const { count, error: anomalyError } = await supabase
          .from('fdc_analytics_anomalies')
          .select('id', { count: 'exact', head: true })
          .eq('is_acknowledged', false);

        if (anomalyError) throw anomalyError;

        if (!cancelled) {
          setState({ status: 'ready', totalValue, anomalyCount: count ?? 0 });
        }
      } catch (err) {
        console.error('[TonKho widget] fetchSummary error:', err);
        if (!cancelled) {
          setState({ status: 'error' });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function TonKhoSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3" aria-hidden="true">
      <div className="h-[74px] animate-pulse rounded-card bg-line/60" />
      <div className="h-[74px] animate-pulse rounded-card bg-line/60" />
    </div>
  );
}

export default function TonKho() {
  const state = useTonKhoSummary();

  return (
    <WidgetCard title="Tồn kho" actions={<Boxes className="h-4 w-4 text-ink-400" aria-hidden="true" />}>
      {state.status === 'loading' && <TonKhoSkeleton />}

      {state.status === 'error' && (
        <p className="text-[13px] text-ink-600">Không thể tải dữ liệu tồn kho lúc này.</p>
      )}

      {state.status === 'ready' && (
        <div className="grid grid-cols-2 gap-3">
          <KpiCard value={formatVND(state.totalValue)} label="Giá trị tồn kho" />
          <div className="rounded-card bg-paper p-4">
            <div className="font-[600] text-[22px] leading-tight text-ink-900 [font-variant-numeric:tabular-nums]">
              {state.anomalyCount}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[13px] text-ink-600">
              <span>Cảnh báo</span>
              {state.anomalyCount > 0 && <StatusBadge status="warn" label="Chưa xử lý" />}
            </div>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
