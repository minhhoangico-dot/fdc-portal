/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { supabase } from '@/lib/supabase';
import type { SupplyItemHistoryEntry, SupplyItemSuggestion } from '@/types/roomManagement';

interface SupplyItemHistoryRow {
  id: string;
  room_id: string;
  item_name: string;
  unit: string;
  last_qty: number | null;
  use_count: number;
  last_used_at: string;
}

function mapRow(row: SupplyItemHistoryRow): SupplyItemHistoryEntry {
  return {
    id: row.id,
    roomId: row.room_id,
    itemName: row.item_name,
    unit: row.unit,
    lastQty: row.last_qty,
    useCount: row.use_count,
    lastUsedAt: row.last_used_at,
  };
}

function toSuggestion(
  entry: SupplyItemHistoryEntry,
  source: 'room' | 'global',
): SupplyItemSuggestion {
  return {
    itemName: entry.itemName,
    unit: entry.unit,
    lastQty: entry.lastQty,
    useCount: entry.useCount,
    source,
  };
}

export function useSupplyItemHistory(roomId: string | null) {
  const [roomItems, setRoomItems] = React.useState<SupplyItemHistoryEntry[]>([]);
  const [globalItems, setGlobalItems] = React.useState<SupplyItemHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!roomId) {
      setRoomItems([]);
      setGlobalItems([]);
      return;
    }

    setIsLoading(true);

    try {
      const [roomResult, globalResult] = await Promise.all([
        supabase
          .from('fdc_supply_item_history')
          .select('*')
          .eq('room_id', roomId)
          .order('use_count', { ascending: false }),
        supabase
          .from('fdc_supply_item_history')
          .select('*')
          .neq('room_id', roomId)
          .order('use_count', { ascending: false })
          .limit(50),
      ]);

      setRoomItems(
        ((roomResult.data as SupplyItemHistoryRow[] | null) ?? []).map(mapRow),
      );
      setGlobalItems(
        ((globalResult.data as SupplyItemHistoryRow[] | null) ?? []).map(mapRow),
      );
    } catch {
      // Table may not exist yet — degrade gracefully
      setRoomItems([]);
      setGlobalItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const topItems = React.useMemo<SupplyItemSuggestion[]>(
    () => roomItems.slice(0, 5).map((entry) => toSuggestion(entry, 'room')),
    [roomItems],
  );

  const suggestions = React.useCallback(
    (query: string): SupplyItemSuggestion[] => {
      const q = query.trim().toLowerCase();
      if (!q) return [];

      const roomMatches = roomItems
        .filter((entry) => entry.itemName.toLowerCase().includes(q))
        .map((entry) => toSuggestion(entry, 'room'));

      const roomKeys = new Set(
        roomMatches.map((s) => `${s.itemName.toLowerCase()}|${s.unit.toLowerCase()}`),
      );

      const globalMatches = globalItems
        .filter((entry) => {
          const key = `${entry.itemName.toLowerCase()}|${entry.unit.toLowerCase()}`;
          return entry.itemName.toLowerCase().includes(q) && !roomKeys.has(key);
        })
        .map((entry) => toSuggestion(entry, 'global'));

      return [...roomMatches, ...globalMatches].slice(0, 15);
    },
    [roomItems, globalItems],
  );

  const upsertHistory = React.useCallback(
    async (items: Array<{ itemName: string; unit: string; quantity: number }>) => {
      if (!roomId || items.length === 0) return;

      try {
        await supabase.from('fdc_supply_item_history').upsert(
          items.map((item) => ({
            room_id: roomId,
            item_name: item.itemName.trim(),
            unit: item.unit.trim(),
            last_qty: item.quantity,
            use_count: 1,
            last_used_at: new Date().toISOString(),
          })),
          { onConflict: 'room_id,item_name,unit' },
        );

        await refresh();
      } catch {
        // Silent failure — history is non-critical
      }
    },
    [roomId, refresh],
  );

  return { isLoading, topItems, suggestions, upsertHistory, refresh };
}
