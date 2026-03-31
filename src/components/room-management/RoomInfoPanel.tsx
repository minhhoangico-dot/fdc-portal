/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Clock3, FileText } from 'lucide-react';
import { ROOM_TYPE_META } from '@/lib/room-management/catalog';
import { formatTimeAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { RoomActivityItem, RoomCatalogEntry, RoomSummary } from '@/types/roomManagement';

interface RoomInfoPanelProps {
  room: RoomCatalogEntry;
  summary: RoomSummary;
  activity: RoomActivityItem[];
}

export function RoomInfoPanel({ room, summary, activity }: RoomInfoPanelProps) {
  const roomType = ROOM_TYPE_META[room.roomType];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
            {room.code}
          </span>
          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
            Tầng {room.floor}
          </span>
          <span className={cn('rounded-full border px-3 py-1 text-xs font-medium', roomType.badgeClassName)}>
            {roomType.label}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-700">Sự cố đang mở</p>
            <p className="mt-2 text-2xl font-semibold text-amber-900">{summary.openMaintenanceCount}</p>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-sky-700">Đề xuất vật tư chờ</p>
            <p className="mt-2 text-2xl font-semibold text-sky-900">{summary.pendingSupplyCount}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Hoạt động gần nhất</h3>
        </div>

        {activity.length > 0 ? (
          <div className="mt-4 space-y-3">
            {activity.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.kind === 'maintenance' ? 'Bảo trì' : 'Vật tư'}
                  </p>
                </div>
                <span className="whitespace-nowrap text-xs font-medium text-gray-500">
                  {formatTimeAgo(item.createdAt)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
            Chưa có hoạt động nào được ghi nhận cho phòng này trong phiên hiện tại.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Ghi chú vận hành</h3>
        </div>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Drawer này dùng mock state nội bộ của Room Management. Các ghi nhận và đề xuất mới sẽ cập nhật
          ngay trên bản đồ, bảng sự cố và trang in tổng hợp, nhưng sẽ được xóa khi tải lại trang.
        </p>
      </section>
    </div>
  );
}
