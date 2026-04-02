/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Settings } from 'lucide-react';
import { ROOM_TYPE_META } from '@/lib/room-management/catalog';
import { cn } from '@/lib/utils';
import type { RoomCatalogEntry, RoomSummary } from '@/types/roomManagement';

interface RoomBlockProps {
  room: RoomCatalogEntry;
  summary: RoomSummary | undefined;
  selected: boolean;
  onSelect: (roomId: string) => void;
  onQuickSupply: (roomId: string) => void;
}

function getStatusDotClassName(summary: RoomSummary | undefined): string {
  if (!summary) return 'bg-emerald-400';
  if (summary.openMaintenanceCount > 0) return 'bg-red-500';
  if (summary.pendingSupplyCount > 0) return 'bg-amber-400';
  return 'bg-emerald-400';
}

export function RoomBlock({ room, summary, selected, onSelect, onQuickSupply }: RoomBlockProps) {
  const roomType = ROOM_TYPE_META[room.roomType];

  return (
    <button
      type="button"
      onClick={() => onSelect(room.id)}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 text-left transition-all hover:border-indigo-200 hover:shadow-sm',
        roomType.surfaceClassName,
        selected ? 'border-indigo-400 ring-2 ring-indigo-200 shadow-sm' : 'border-gray-200',
      )}
    >
      <span className={cn('h-2 w-2 shrink-0 rounded-full', getStatusDotClassName(summary))} />

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {room.code}
          </span>
          <span className="truncate text-sm font-medium text-gray-900">{room.name}</span>
        </span>
      </span>

      <span
        role="button"
        tabIndex={0}
        onClick={(event) => {
          event.stopPropagation();
          onQuickSupply(room.id);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.stopPropagation();
            event.preventDefault();
            onQuickSupply(room.id);
          }
        }}
        className="inline-flex shrink-0 items-center justify-center rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        title="Chi tiết phòng"
      >
        <Settings className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}
