/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, ChevronDown, Copy, Minus, Package, Plus, Send, Wrench } from 'lucide-react';
import { SupplyItemAutocomplete } from '@/components/shared/SupplyItemAutocomplete';
import {
  MAINTENANCE_SEVERITY_CLASSNAMES,
  MAINTENANCE_SEVERITY_LABELS,
  MAINTENANCE_STATUS_CLASSNAMES,
  MAINTENANCE_STATUS_LABELS,
  ROOM_TYPE_META,
  SUPPLY_PRIORITY_CLASSNAMES,
  SUPPLY_PRIORITY_LABELS,
  SUPPLY_STATUS_CLASSNAMES,
  SUPPLY_STATUS_LABELS,
} from '@/lib/room-management/catalog';
import { cn, formatTimeAgo } from '@/lib/utils';
import { useSupplyItemHistory } from '@/viewmodels/useSupplyItemHistory';
import type {
  CreateMaintenanceReportInput,
  CreateSupplyRequestInput,
  RoomCatalogEntry,
  RoomMaintenanceReport,
  RoomSummary,
  RoomSupplyRequest,
} from '@/types/roomManagement';

/* ─── Props ──────────────────────────────────────────────────────────── */

interface RoomDetailPanelProps {
  room: RoomCatalogEntry;
  summary: RoomSummary;
  supplyRequests: RoomSupplyRequest[];
  maintenanceReports: RoomMaintenanceReport[];
  onCreateSupply: (input: CreateSupplyRequestInput) => void;
  onCreateMaintenance: (input: CreateMaintenanceReportInput) => void;
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

interface DraftItem {
  id: string;
  itemName: string;
  quantity: string;
  unit: string;
}

const FIELD =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100';

const REASON_PRESETS = ['Bổ sung cuối ca', 'Hết tồn kho', 'Thay thế hư hỏng'] as const;

function newDraft(): DraftItem {
  return { id: Math.random().toString(36).slice(2, 9), itemName: '', quantity: '1', unit: '' };
}

/* ─── Component ──────────────────────────────────────────────────────── */

export function RoomDetailPanel({
  room,
  summary,
  supplyRequests,
  maintenanceReports,
  onCreateSupply,
  onCreateMaintenance,
}: RoomDetailPanelProps) {
  const { topItems, suggestions, upsertHistory } = useSupplyItemHistory(room.id);
  const meta = ROOM_TYPE_META[room.roomType];

  /* supply form state */
  const [items, setItems] = React.useState<DraftItem[]>([newDraft()]);
  const [priority, setPriority] = React.useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [reason, setReason] = React.useState('');
  const [showReason, setShowReason] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /* collapsible sections */
  const [showHistory, setShowHistory] = React.useState(true);
  const [showMaint, setShowMaint] = React.useState(false);
  const [showMaintForm, setShowMaintForm] = React.useState(false);

  /* maintenance form state */
  const [mTitle, setMTitle] = React.useState('');
  const [mDesc, setMDesc] = React.useState('');
  const [mType, setMType] = React.useState<'incident' | 'repair' | 'inspection'>('incident');
  const [mSeverity, setMSeverity] = React.useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  /* reset supply form on room change */
  const prevRoomId = React.useRef(room.id);
  React.useEffect(() => {
    if (prevRoomId.current !== room.id) {
      setItems([newDraft()]);
      setPriority('medium');
      setReason('');
      setShowReason(false);
      setError(null);
      prevRoomId.current = room.id;
    }
  }, [room.id]);

  const handleItemField = (id: string, field: keyof DraftItem, val: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: val } : i)));
  };

  const addChipItem = (s: { itemName: string; unit: string; lastQty: number | null }) => {
    setItems((prev) => {
      const filled = prev.filter((i) => i.itemName.trim());
      return [
        ...filled,
        { id: Math.random().toString(36).slice(2, 9), itemName: s.itemName, quantity: String(s.lastQty ?? 1), unit: s.unit },
      ];
    });
  };

  const fillFromClone = (req: RoomSupplyRequest) => {
    setItems(
      req.items.map((i) => ({
        id: Math.random().toString(36).slice(2, 9),
        itemName: i.itemName,
        quantity: String(i.quantity),
        unit: i.unit,
      })),
    );
    setReason(req.reason);
    if (req.reason) setShowReason(true);
    setPriority(req.priority);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitSupply = () => {
    const normalized = items
      .map((i) => ({ itemName: i.itemName.trim(), quantity: Number(i.quantity), unit: i.unit.trim() }))
      .filter((i) => i.itemName && i.quantity > 0 && i.unit);

    if (normalized.length === 0) {
      setError('Thêm ít nhất một vật tư hợp lệ.');
      return;
    }

    const today = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    onCreateSupply({
      roomId: room.id,
      title: `Đề xuất vật tư - ${room.name} - ${today}`,
      reason,
      priority,
      items: normalized,
    });
    void upsertHistory(normalized);
    setItems([newDraft()]);
    setReason('');
    setShowReason(false);
    setPriority('medium');
    setError(null);
  };

  const handleSubmitMaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mTitle.trim() || !mDesc.trim()) return;
    onCreateMaintenance({ roomId: room.id, title: mTitle, description: mDesc, requestType: mType, severity: mSeverity });
    setMTitle('');
    setMDesc('');
    setShowMaintForm(false);
  };

  const hasItems = items.some((i) => i.itemName.trim());

  return (
    <div className="space-y-4">
      {/* ── Room Header ────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{room.name}</h2>
              <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-semibold', meta.badgeClassName)}>
                {meta.label}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">{room.code} · Tầng {room.floor}</p>
          </div>
          <div className="flex gap-2 text-xs">
            {summary.openMaintenanceCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 font-medium text-red-700">
                <AlertTriangle className="h-3 w-3" />
                {summary.openMaintenanceCount} sự cố
              </span>
            )}
            {summary.pendingSupplyCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                <Package className="h-3 w-3" />
                {summary.pendingSupplyCount} chờ duyệt
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Supply Cart ────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <Package className="h-4 w-4 text-indigo-600" />
          Đề xuất vật tư
        </h3>

        {/* Quick-add chips */}
        {topItems.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-gray-400">Thường dùng:</span>
            {topItems.map((s) => (
              <button
                key={`${s.itemName}-${s.unit}`}
                type="button"
                onClick={() => addChipItem(s)}
                className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
              >
                {s.itemName} · {s.unit}
              </button>
            ))}
          </div>
        )}

        {/* Item rows */}
        <div className="mt-3 space-y-2">
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-[2]">
                <SupplyItemAutocomplete
                  value={item.itemName}
                  onChange={(v) => handleItemField(item.id, 'itemName', v)}
                  onSelect={(s) => {
                    handleItemField(item.id, 'itemName', s.itemName);
                    handleItemField(item.id, 'unit', s.unit);
                    if (s.lastQty != null) handleItemField(item.id, 'quantity', String(s.lastQty));
                  }}
                  suggestions={suggestions}
                  placeholder={idx === 0 ? 'Nhập tên vật tư...' : `Vật tư ${idx + 1}`}
                />
              </div>
              <input
                value={item.quantity}
                onChange={(e) => handleItemField(item.id, 'quantity', e.target.value)}
                type="number"
                min="1"
                className={cn(FIELD, 'w-16 text-center')}
                placeholder="SL"
              />
              <input
                value={item.unit}
                onChange={(e) => handleItemField(item.id, 'unit', e.target.value)}
                className={cn(FIELD, 'w-20')}
                placeholder="ĐVT"
              />
              <button
                type="button"
                onClick={() => setItems((d) => d.length > 1 ? d.filter((x) => x.id !== item.id) : d)}
                className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Actions row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setItems((d) => [...d, newDraft()])}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm dòng
          </button>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="low">Ưu tiên: Thấp</option>
            <option value="medium">Ưu tiên: Trung bình</option>
            <option value="high">Ưu tiên: Cao</option>
            <option value="urgent">Ưu tiên: Khẩn cấp</option>
          </select>

          <button
            type="button"
            onClick={() => setShowReason((v) => !v)}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            {showReason ? 'Ẩn lý do' : '+ Lý do'}
          </button>

          <div className="flex-1" />

          <button
            type="button"
            onClick={handleSubmitSupply}
            disabled={!hasItems}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
              hasItems
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'cursor-not-allowed bg-gray-100 text-gray-400',
            )}
          >
            <Send className="h-4 w-4" />
            Gửi đề xuất
          </button>
        </div>

        {/* Reason area (collapsible) */}
        {showReason && (
          <div className="mt-3">
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {REASON_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setReason(reason === p ? '' : p)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                    reason === p
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className={cn(FIELD, 'resize-y')}
              placeholder="Ghi chú bổ sung..."
            />
          </div>
        )}

        {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
      </div>

      {/* ── Recent Supply Requests ──────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-sm font-bold text-gray-900">
            Đề xuất gần đây {supplyRequests.length > 0 && <span className="font-normal text-gray-400">({supplyRequests.length})</span>}
          </span>
          <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', showHistory && 'rotate-180')} />
        </button>

        {showHistory && (
          <div className="border-t border-gray-100 px-4 pb-4">
            {supplyRequests.length > 0 ? (
              <div className="mt-3 space-y-3">
                {supplyRequests.map((req) => (
                  <div key={req.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{req.title}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {req.items.map((i) => (
                            <span key={i.id} className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-700">
                              {i.itemName} · {i.quantity} {i.unit}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', SUPPLY_STATUS_CLASSNAMES[req.status])}>
                          {SUPPLY_STATUS_LABELS[req.status]}
                        </span>
                        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', SUPPLY_PRIORITY_CLASSNAMES[req.priority])}>
                          {SUPPLY_PRIORITY_LABELS[req.priority]}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                      <span>{req.requestedBy} · {formatTimeAgo(req.updatedAt)}</span>
                      <button
                        type="button"
                        onClick={() => fillFromClone(req)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
                      >
                        <Copy className="h-3 w-3" />
                        Nhân bản
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-400">Chưa có đề xuất nào.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Maintenance Section ──────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => setShowMaint((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Wrench className="h-4 w-4 text-gray-400" />
            Sự cố / Bảo trì
            {maintenanceReports.length > 0 && (
              <span className="font-normal text-gray-400">({maintenanceReports.length})</span>
            )}
          </span>
          <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', showMaint && 'rotate-180')} />
        </button>

        {showMaint && (
          <div className="border-t border-gray-100 px-4 pb-4">
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMaintForm((v) => !v)}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                {showMaintForm ? 'Đóng' : '+ Báo sự cố'}
              </button>
            </div>

            {showMaintForm && (
              <form onSubmit={handleSubmitMaint} className="mt-3 space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <select value={mType} onChange={(e) => setMType(e.target.value as typeof mType)} className={FIELD}>
                    <option value="incident">Sự cố</option>
                    <option value="repair">Bảo trì</option>
                    <option value="inspection">Kiểm tra</option>
                  </select>
                  <select value={mSeverity} onChange={(e) => setMSeverity(e.target.value as typeof mSeverity)} className={FIELD}>
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                </div>
                <input value={mTitle} onChange={(e) => setMTitle(e.target.value)} className={FIELD} placeholder="Tiêu đề sự cố" />
                <textarea value={mDesc} onChange={(e) => setMDesc(e.target.value)} className={cn(FIELD, 'min-h-16 resize-y')} placeholder="Mô tả chi tiết..." />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowMaintForm(false)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-white">Hủy</button>
                  <button type="submit" disabled={!mTitle.trim() || !mDesc.trim()} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50">Lưu</button>
                </div>
              </form>
            )}

            {maintenanceReports.length > 0 ? (
              <div className="mt-3 space-y-2">
                {maintenanceReports.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{r.reportedBy} · {formatTimeAgo(r.updatedAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', MAINTENANCE_STATUS_CLASSNAMES[r.status])}>
                        {MAINTENANCE_STATUS_LABELS[r.status]}
                      </span>
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', MAINTENANCE_SEVERITY_CLASSNAMES[r.severity])}>
                        {MAINTENANCE_SEVERITY_LABELS[r.severity]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-400">Chưa có sự cố nào.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
