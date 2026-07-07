/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { subscribeToPostgresChanges } from '@/lib/supabase-realtime';
import { BRIDGE_HEALTH_ROW_ID, isBridgeHeartbeatStale } from '@/lib/bridge';

export interface BridgeHeartbeat {
  /** Whether a heartbeat reading was successfully obtained (else the dot hides). */
  available: boolean;
  /** ISO timestamp of the last bridge heartbeat, or null. */
  lastHeartbeat: string | null;
  /** True when the last heartbeat is older than the staleness window. */
  isStale: boolean;
}

/**
 * Lightweight read of the bridge heartbeat freshness from `fdc_sync_health` for
 * the TopBar sync dot. Reads the single health row, then subscribes for live
 * updates through the shared realtime helper. On any error (e.g. RLS), reports
 * `available: false` so the caller can simply omit the dot.
 */
export function useBridgeHeartbeat(): BridgeHeartbeat {
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);
  // Re-evaluate staleness on an interval so the dot goes stale without a DB event.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    const fetchHeartbeat = async () => {
      const { data, error } = await supabase
        .from('fdc_sync_health')
        .select('last_heartbeat')
        .eq('id', BRIDGE_HEALTH_ROW_ID)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setAvailable(false);
        setLastHeartbeat(null);
        return;
      }

      setAvailable(true);
      setLastHeartbeat(data.last_heartbeat ?? null);
    };

    void fetchHeartbeat();

    const unsubscribe = subscribeToPostgresChanges(
      supabase,
      'public:fdc_sync_health:heartbeat',
      [{ table: 'fdc_sync_health', filter: `id=eq.${BRIDGE_HEALTH_ROW_ID}` }],
      fetchHeartbeat,
    );

    const interval = window.setInterval(() => setNow(Date.now()), 60_000);

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(interval);
    };
  }, []);

  return {
    available,
    lastHeartbeat,
    isStale: isBridgeHeartbeatStale(lastHeartbeat, now),
  };
}
