/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  SUPPLY_PRIORITY_CLASSNAMES,
  SUPPLY_PRIORITY_LABELS,
  SUPPLY_STATUS_CLASSNAMES,
  SUPPLY_STATUS_LABELS,
} from '@/lib/room-management/catalog';
import { formatTimeAgo, cn } from '@/lib/utils';
import type {
  CreateSupplyRequestInput,
  RoomCatalogEntry,
  RoomSupplyRequest,
} from '@/types/roomManagement';

interface SupplyTabProps {
  room: RoomCatalogEntry;
  requests: RoomSupplyRequest[];
  onCreate: (input: CreateSupplyRequestInput) => void;
}

interface DraftItem {
  id: string;
  itemName: string;
  quantity: string;
  unit: string;
}

const FIELD_CLASSNAME =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100';

function createDraftItem(): DraftItem {
  return {
    id: Math.random().toString(36).slice(2, 9),
    itemName: '',
    quantity: '1',
    unit: '',
  };
}

export function SupplyTab({ room, requests, onCreate }: SupplyTabProps) {
  const [isFormOpen, setIsFormOpen] = React.useState(requests.length === 0);
  const [title, setTitle] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [priority, setPriority] = React.useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [items, setItems] = React.useState<DraftItem[]>([createDraftItem()]);
  const [error, setError] = React.useState<string | null>(null);

  const handleItemChange = (itemId: string, field: keyof DraftItem, value: string) => {
    setItems((draft) =>
      draft.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedItems = items
      .map((item) => ({
        itemName: item.itemName.trim(),
        quantity: Number(item.quantity),
        unit: item.unit.trim(),
      }))
      .filter((item) => item.itemName && item.quantity > 0 && item.unit);

    if (!title.trim() || !reason.trim() || normalizedItems.length === 0) {
      setError('Cần nhập tiêu đề, lý do và ít nhất một dòng vật tư hợp lệ.');
      return;
    }

    onCreate({
      roomId: room.id,
      title,
      reason,
      priority,
      items: normalizedItems,
    });

    setTitle('');
    setReason('');
    setPriority('medium');
    setItems([createDraftItem()]);
    setError(null);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Đề xuất vật tư theo phòng</h3>
            <p className="mt-1 text-sm text-gray-500">Tạo phiếu vật tư nội bộ và dùng ngay cho trang in tổng hợp.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen((value) => !value)}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              {isFormOpen ? 'Đóng biểu mẫu' : 'Tạo đề xuất'}
            </button>
            <Link
              to="/room-management/print/materials"
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Xem bản in
            </Link>
          </div>
        </div>

        {isFormOpen && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-gray-700">Tiêu đề đề xuất</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={FIELD_CLASSNAME}
                  placeholder="Ví dụ: Bổ sung vật tư cuối ca"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-gray-700">Mức độ ưu tiên</span>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as typeof priority)}
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
              <span className="mb-1.5 block font-medium text-gray-700">Lý do</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className={cn(FIELD_CLASSNAME, 'min-h-24 resize-y')}
                placeholder="Nêu bối cảnh sử dụng hoặc mức tồn kho hiện tại."
              />
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">Danh sách vật tư</h4>
                <button
                  type="button"
                  onClick={() => setItems((draft) => [...draft, createDraftItem()])}
                  className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-white"
                >
                  <Plus className="h-4 w-4" />
                  Thêm dòng
                </button>
              </div>

              {items.map((item, index) => (
                <div key={item.id} className="grid gap-2 rounded-2xl border border-gray-100 bg-white p-3 sm:grid-cols-[1.4fr_0.7fr_0.8fr_auto]">
                  <input
                    value={item.itemName}
                    onChange={(event) => handleItemChange(item.id, 'itemName', event.target.value)}
                    className={FIELD_CLASSNAME}
                    placeholder={`Vật tư ${index + 1}`}
                  />
                  <input
                    value={item.quantity}
                    onChange={(event) => handleItemChange(item.id, 'quantity', event.target.value)}
                    type="number"
                    min="1"
                    className={FIELD_CLASSNAME}
                    placeholder="Số lượng"
                  />
                  <input
                    value={item.unit}
                    onChange={(event) => handleItemChange(item.id, 'unit', event.target.value)}
                    className={FIELD_CLASSNAME}
                    placeholder="Đơn vị"
                  />
                  <button
                    type="button"
                    onClick={() => setItems((draft) => (draft.length > 1 ? draft.filter((candidate) => candidate.id !== item.id) : draft))}
                    className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2 text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

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
                Lưu đề xuất
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 space-y-3">
          {requests.length > 0 ? (
            requests.map((request) => (
              <article key={request.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{request.title}</h4>
                    <p className="mt-1 text-sm leading-6 text-gray-600">{request.reason}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={cn(
                        'rounded-full border px-2 py-1 text-xs font-medium',
                        SUPPLY_STATUS_CLASSNAMES[request.status],
                      )}
                    >
                      {SUPPLY_STATUS_LABELS[request.status]}
                    </span>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-1 text-xs font-medium',
                        SUPPLY_PRIORITY_CLASSNAMES[request.priority],
                      )}
                    >
                      {SUPPLY_PRIORITY_LABELS[request.priority]}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span>Người tạo: {request.requestedBy}</span>
                  <span>Cập nhật {formatTimeAgo(request.updatedAt)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {request.items.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700"
                    >
                      {item.itemName} · {item.quantity} {item.unit}
                    </span>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
              Chưa có đề xuất vật tư nào cho phòng này. Tạo biểu mẫu đầu tiên để kiểm tra luồng in tổng hợp.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
