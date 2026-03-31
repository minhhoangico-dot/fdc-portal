/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROOM_FLOORS, SUPPLY_STATUS_LABELS } from '@/lib/room-management/catalog';
import type { PrintFilters, PrintableSupplyFloorGroup } from '@/types/roomManagement';

interface MaterialsPrintPreviewProps {
  groups: PrintableSupplyFloorGroup[];
  filters: PrintFilters;
  onFiltersChange: (next: PrintFilters) => void;
}

export function MaterialsPrintPreview({
  groups,
  filters,
  onFiltersChange,
}: MaterialsPrintPreviewProps) {
  const hasData = groups.some((group) => group.rooms.length > 0);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-indigo-600">Room Management</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">In tổng hợp vật tư</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Gom các đề xuất vật tư nội bộ theo tầng và theo phòng để in nhanh cho điều phối vận hành.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/room-management"
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Quay lại sơ đồ phòng
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              <Printer className="h-4 w-4" />
              In bản tổng hợp
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm print:hidden">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-gray-700">Lọc theo tầng</span>
            <select
              value={filters.floor}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  floor: event.target.value === 'all' ? 'all' : Number(event.target.value) as 1 | 2 | 3,
                })
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">Tất cả các tầng</option>
              {ROOM_FLOORS.map((floor) => (
                <option key={floor.id} value={floor.floor}>
                  {floor.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-gray-700">Lọc theo trạng thái</span>
            <select
              value={filters.status}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  status: event.target.value as PrintFilters['status'],
                })
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(SUPPLY_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm print:rounded-none print:border-none print:p-0 print:shadow-none">
        {hasData ? (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.floor} className="space-y-3">
                <header className="border-b border-gray-200 pb-3">
                  <h2 className="text-xl font-semibold text-gray-900">{group.label}</h2>
                  <p className="mt-1 text-sm text-gray-500">{group.rooms.length} phòng có đề xuất vật tư.</p>
                </header>

                <div className="space-y-4">
                  {group.rooms.map((room) => (
                    <article key={room.roomId} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 print:break-inside-avoid">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{room.roomCode}</p>
                          <h3 className="mt-1 text-lg font-semibold text-gray-900">{room.roomName}</h3>
                        </div>
                        <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
                          {room.requestCount} đề xuất
                        </span>
                      </div>

                      <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left font-medium text-gray-500">Vật tư</th>
                              <th className="px-4 py-3 text-left font-medium text-gray-500">Số lượng</th>
                              <th className="px-4 py-3 text-left font-medium text-gray-500">Đơn vị</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {room.items.map((item) => (
                              <tr key={`${room.roomId}-${item.itemName}-${item.unit}`}>
                                <td className="px-4 py-3 text-gray-900">{item.itemName}</td>
                                <td className="px-4 py-3 text-gray-700">{item.quantity}</td>
                                <td className="px-4 py-3 text-gray-700">{item.unit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
            Không có dữ liệu vật tư phù hợp với bộ lọc hiện tại.
          </div>
        )}
      </section>
    </div>
  );
}
