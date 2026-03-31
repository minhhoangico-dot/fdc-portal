/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  MAINTENANCE_SEVERITY_CLASSNAMES,
  MAINTENANCE_SEVERITY_LABELS,
  MAINTENANCE_STATUS_CLASSNAMES,
  MAINTENANCE_STATUS_LABELS,
} from '@/lib/room-management/catalog';
import { formatTimeAgo, cn } from '@/lib/utils';
import type {
  CreateMaintenanceReportInput,
  RoomCatalogEntry,
  RoomMaintenanceReport,
} from '@/types/roomManagement';

interface MaintenanceTabProps {
  room: RoomCatalogEntry;
  reports: RoomMaintenanceReport[];
  onCreate: (input: CreateMaintenanceReportInput) => void;
}

const FIELD_CLASSNAME =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100';

export function MaintenanceTab({ room, reports, onCreate }: MaintenanceTabProps) {
  const [isFormOpen, setIsFormOpen] = React.useState(reports.length === 0);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [requestType, setRequestType] = React.useState<'incident' | 'repair' | 'inspection'>('incident');
  const [severity, setSeverity] = React.useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim() || !description.trim()) {
      setError('Cần nhập tiêu đề và mô tả sự cố.');
      return;
    }

    onCreate({
      roomId: room.id,
      title,
      description,
      requestType,
      severity,
    });

    setTitle('');
    setDescription('');
    setRequestType('incident');
    setSeverity('medium');
    setError(null);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Lịch sử sự cố của phòng</h3>
            <p className="mt-1 text-sm text-gray-500">Theo dõi báo cáo và trạng thái xử lý ngay trong phiên hiện tại.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen((value) => !value)}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              {isFormOpen ? 'Đóng biểu mẫu' : 'Báo sự cố'}
            </button>
            <Link
              to="/room-management/maintenance"
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Xem hàng chờ
            </Link>
          </div>
        </div>

        {isFormOpen && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-gray-700">Loại ghi nhận</span>
                <select
                  value={requestType}
                  onChange={(event) => setRequestType(event.target.value as typeof requestType)}
                  className={FIELD_CLASSNAME}
                >
                  <option value="incident">Sự cố</option>
                  <option value="repair">Bảo trì</option>
                  <option value="inspection">Kiểm tra định kỳ</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-gray-700">Mức độ ưu tiên</span>
                <select
                  value={severity}
                  onChange={(event) => setSeverity(event.target.value as typeof severity)}
                  className={FIELD_CLASSNAME}
                >
                  <option value="low">Thấp</option>
                  <option value="medium">Trung bình</option>
                  <option value="high">Cao</option>
                  <option value="urgent">Khẩn cấp</option>
                </select>
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-gray-700">Tiêu đề</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={FIELD_CLASSNAME}
                placeholder="Ví dụ: Điều hòa không mát"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-gray-700">Mô tả</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={cn(FIELD_CLASSNAME, 'min-h-28 resize-y')}
                placeholder="Mô tả rõ hiện trạng, thời điểm phát sinh và yêu cầu hỗ trợ."
              />
            </label>

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setError(null);
                }}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-white"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                Lưu báo cáo
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 space-y-3">
          {reports.length > 0 ? (
            reports.map((report) => (
              <article key={report.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{report.title}</h4>
                    <p className="mt-1 text-sm leading-6 text-gray-600">{report.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={cn(
                        'rounded-full border px-2 py-1 text-xs font-medium',
                        MAINTENANCE_STATUS_CLASSNAMES[report.status],
                      )}
                    >
                      {MAINTENANCE_STATUS_LABELS[report.status]}
                    </span>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-1 text-xs font-medium',
                        MAINTENANCE_SEVERITY_CLASSNAMES[report.severity],
                      )}
                    >
                      {MAINTENANCE_SEVERITY_LABELS[report.severity]}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>Người báo: {report.reportedBy}</span>
                  <span>Cập nhật {formatTimeAgo(report.updatedAt)}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
              Chưa có ghi nhận bảo trì nào cho phòng này. Sử dụng biểu mẫu phía trên để tạo báo cáo đầu tiên.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
