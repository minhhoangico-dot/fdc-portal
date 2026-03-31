/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Building2, ClipboardList, ExternalLink, Layers3, Wrench } from 'lucide-react';

const FLOOR_PLANS = [
  {
    key: 'floor-1',
    label: 'Tầng 1',
    title: 'Sơ đồ tầng 1',
    src: '/fdc-tang1-floorplan.html',
    summary: 'Khu tiếp đón, khám bệnh và các phòng chức năng chính.',
  },
  {
    key: 'floor-2',
    label: 'Tầng 2',
    title: 'Sơ đồ tầng 2',
    src: '/fdc-tang2-floorplan.html',
    summary: 'Không gian chuyên môn và các phòng làm việc hỗ trợ.',
  },
  {
    key: 'floor-3',
    label: 'Tầng 3',
    title: 'Sơ đồ tầng 3',
    src: '/fdc-tang3-floorplan.html',
    summary: 'Tầng kỹ thuật và các khu vực vận hành bổ sung.',
  },
] as const;

const NEXT_SURFACES = [
  {
    title: 'Hàng chờ bảo trì',
    description: 'Theo dõi sự cố, bảo trì và phân công xử lý theo từng phòng.',
    icon: Wrench,
  },
  {
    title: 'Yêu cầu vật tư',
    description: 'Khởi tạo phiếu vật tư theo phòng và giữ room context xuyên suốt approval flow.',
    icon: ClipboardList,
  },
  {
    title: 'Tổng hợp in',
    description: 'Gộp nhu cầu vật tư theo tầng -> phòng -> vật tư để in một sheet vận hành.',
    icon: Layers3,
  },
] as const;

export default function RoomManagementPage() {
  const [activeFloorKey, setActiveFloorKey] = React.useState<(typeof FLOOR_PLANS)[number]['key']>(
    FLOOR_PLANS[0].key,
  );

  const activeFloor =
    FLOOR_PLANS.find((floor) => floor.key === activeFloorKey) ?? FLOOR_PLANS[0];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-600">
                  Room Management
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                  Quản lý phòng
                </h1>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-gray-600">
                Đây là điểm vào đầu tiên cho module quản lý phòng theo hướng floorplan-first.
                Trang này đưa sơ đồ tầng đã duyệt vào portal để nhân sự có thể truy cập trực
                tiếp từ sidebar thay vì phải mở bản mock riêng.
              </p>
            </div>
          </div>

          <a
            href={activeFloor.src}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" />
            Mở sơ đồ hiện tại
          </a>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{activeFloor.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{activeFloor.summary}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {FLOOR_PLANS.map((floor) => (
              <button
                key={floor.key}
                type="button"
                onClick={() => setActiveFloorKey(floor.key)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  floor.key === activeFloor.key
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                {floor.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
          <iframe
            key={activeFloor.key}
            title={activeFloor.title}
            src={activeFloor.src}
            className="h-[720px] w-full bg-white"
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {NEXT_SURFACES.map((surface) => {
          const Icon = surface.icon;

          return (
            <article
              key={surface.title}
              className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">{surface.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{surface.description}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}
