/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BRIDGE_HEALTH_ROW_ID, isBridgeHeartbeatStale } from '@/lib/bridge';
import { formatTimeAgo } from '@/lib/utils';
import { WidgetCard, StatusBadge, KpiCard, EmptyState } from '@/ui';
import type { StatusKind } from '@/ui';

/**
 * Home "Hôm nay" widget — registry key `bridge-health`, gated by `admin.view`
 * (direction §4.3). Self-contained: owns its own fetch, never throws — a
 * failure here degrades to a quiet empty state, never a blank Home.
 */

interface SyncHealthRow {
  bridge_status: string | null;
  his_connected: boolean | null;
  misa_connected: boolean | null;
  last_heartbeat: string | null;
  queue_depth: number | null;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; row: SyncHealthRow | null };

/** Co-located data hook: single read of the bridge heartbeat row. No realtime
 * subscription here — this is a lightweight Home tile, not the TopBar dot
 * (see `useBridgeHeartbeat` for the subscribed variant). */
function useBridgeHealthWidgetData(): LoadState {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('fdc_sync_health')
          .select('bridge_status, his_connected, misa_connected, last_heartbeat, queue_depth')
          .eq('id', BRIDGE_HEALTH_ROW_ID)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          setState({ kind: 'error' });
          return;
        }

        setState({ kind: 'ready', row: (data as SyncHealthRow | null) ?? null });
      } catch {
        if (!cancelled) setState({ kind: 'error' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden="true">
      <div className="h-6 w-24 rounded-field bg-line" />
      <div className="h-12 w-full rounded-field bg-line" />
    </div>
  );
}

export default function BridgeHealth() {
  const state = useBridgeHealthWidgetData();

  if (state.kind === 'loading') {
    return (
      <WidgetCard title="Tình trạng đồng bộ">
        <LoadingSkeleton />
      </WidgetCard>
    );
  }

  if (state.kind === 'error' || !state.row) {
    return (
      <WidgetCard title="Tình trạng đồng bộ">
        <EmptyState
          title="Chưa có dữ liệu đồng bộ"
          description="Không thể đọc tình trạng bridge lúc này."
        />
      </WidgetCard>
    );
  }

  const { row } = state;
  const stale = isBridgeHeartbeatStale(row.last_heartbeat);
  const hisConnected = !stale && !!row.his_connected;
  const misaConnected = !stale && !!row.misa_connected;

  const overallStatus: StatusKind = stale ? 'danger' : hisConnected && misaConnected ? 'ok' : 'warn';
  const overallLabel = stale ? 'Mất kết nối' : hisConnected && misaConnected ? 'Bình thường' : 'Cảnh báo';

  return (
    <WidgetCard
      title="Tình trạng đồng bộ"
      actions={<StatusBadge status={overallStatus} label={overallLabel} />}
    >
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          value={row.queue_depth ?? 0}
          label="Hàng đợi"
        />
        <div className="rounded-card bg-paper p-3">
          <div className="flex flex-col gap-1.5 text-[13px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-600">HIS</span>
              <StatusBadge status={hisConnected ? 'ok' : 'neutral'} label={hisConnected ? 'Kết nối' : 'Ngắt'} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-600">MISA</span>
              <StatusBadge status={misaConnected ? 'ok' : 'neutral'} label={misaConnected ? 'Kết nối' : 'Ngắt'} />
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[13px] text-ink-600">
        {row.last_heartbeat
          ? `Cập nhật ${formatTimeAgo(row.last_heartbeat)}`
          : 'Chưa ghi nhận nhịp đồng bộ'}
      </p>
    </WidgetCard>
  );
}
