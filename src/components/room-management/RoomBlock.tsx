/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertTriangle, Package } from 'lucide-react';
import { ROOM_TYPE_META } from '@/lib/room-management/catalog';
import { cn } from '@/lib/utils';
import type { RoomCatalogEntry, RoomSummary } from '@/types/roomManagement';

interface RoomBlockProps {
  room: RoomCatalogEntry;
  summary: RoomSummary;
  selected: boolean;
  onSelect: (roomId: string) => void;
}

export function RoomBlock({ room, summary, selected, onSelect }: RoomBlockProps) {
  const roomType = ROOM_TYPE_META[room.roomType];

  return (
    <button
      type="button"
      onClick={() => onSelect(room.id)}
      className={cn(
        'w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md',
        roomType.surfaceClassName,
        selected ? 'border-indigo-400 ring-2 ring-indigo-200 shadow-md' : 'border-gray-200',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{room.code}</p>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900">{room.name}</h3>
        </div>
        <span className={cn('rounded-full border px-2 py-1 text-[11px] font-medium', roomType.badgeClassName)}>
          {roomType.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          {summary.openMaintenanceCount} sự cố mở
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-1 font-medium text-sky-700">
          <Package className="h-3.5 w-3.5" />
          {summary.pendingSupplyCount} đề xuất chờ
        </span>
      </div>
    </button>
  );
}
