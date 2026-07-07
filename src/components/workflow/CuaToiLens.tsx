/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CreditCard, DollarSign, FileText, Package, Search, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/viewmodels/useRequests';
import { can } from '@/lib/permissions/access';
import { formatDate, formatVND } from '@/lib/utils';
import { PRIORITY, REQUEST_STATUS, REQUEST_TYPES } from '@/lib/constants';
import { ApprovalCard } from '@/ui/ApprovalCard';
import { StatusBadge, type StatusKind } from '@/ui/StatusBadge';
import { EmptyState } from '@/ui/EmptyState';
import { TabBar, type TabBarItem } from '@/ui/TabBar';
import type { Priority, Request, RequestStatus, RequestType } from '@/types/request';

/**
 * CuaToiLens — "Của tôi": my-requests browser (direction §4.2). Reuses
 * `useRequests` verbatim (search/status/sort/filter behaviour unchanged),
 * re-presented on `ui/StatusBadge` + `ui/ApprovalCard` instead of the
 * legacy ad-hoc Tailwind in `src/app/requests/page.tsx`. No new business
 * logic — pure re-presentation.
 */

const TYPE_ICONS: Record<RequestType, ComponentType<{ className?: string }>> = {
  material_release: Package,
  purchase: DollarSign,
  payment: CreditCard,
  advance: DollarSign,
  leave: Calendar,
  other: FileText,
};

const STATUS_BADGE: Record<RequestStatus, { kind: StatusKind; label: string }> = {
  draft: { kind: 'neutral', label: REQUEST_STATUS.draft },
  pending: { kind: 'warn', label: REQUEST_STATUS.pending },
  approved: { kind: 'ok', label: REQUEST_STATUS.approved },
  rejected: { kind: 'danger', label: REQUEST_STATUS.rejected },
  escalated: { kind: 'info', label: REQUEST_STATUS.escalated },
  completed: { kind: 'ok', label: REQUEST_STATUS.completed },
  cancelled: { kind: 'neutral', label: REQUEST_STATUS.cancelled },
};

const PRIORITY_BADGE: Record<Priority, { kind: StatusKind; label: string }> = {
  low: { kind: 'neutral', label: PRIORITY.low },
  normal: { kind: 'info', label: PRIORITY.normal },
  high: { kind: 'warn', label: PRIORITY.high },
  urgent: { kind: 'danger', label: PRIORITY.urgent },
};

const STATUS_TABS: TabBarItem<RequestStatus | 'all'>[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'rejected', label: 'Từ chối' },
  { key: 'draft', label: 'Nháp' },
];

export function CuaToiLens() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { requests, searchQuery, setSearchQuery, statusFilter, setStatusFilter, sortBy, setSortBy } =
    useRequests();

  const sectionTitle = !user
    ? 'Danh sách đề nghị'
    : can(user.role, 'requests.view_all')
      ? 'Danh sách đề nghị'
      : can(user.role, 'requests.view_assigned')
        ? 'Đề nghị liên quan'
        : 'Đề nghị của tôi';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-[600] text-ink-900">{sectionTitle}</h2>
        <span className="text-[13px] text-ink-600">{requests.length} đề nghị</span>
      </div>

      <div className="space-y-4 rounded-card bg-card p-4 shadow-card">
        <TabBar<RequestStatus | 'all'> tabs={STATUS_TABS} activeKey={statusFilter} onChange={setStatusFilter} />

        <div className="flex flex-col gap-3 border-t border-line pt-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề hoặc mã đề nghị..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-field border border-line bg-card py-2 pl-10 pr-4 text-[14px] text-ink-900 outline-none transition-colors focus:border-brand-500"
            />
          </div>
          <div className="flex items-center gap-2 sm:w-48">
            <SlidersHorizontal className="h-5 w-5 shrink-0 text-ink-400" />
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
              className="w-full appearance-none rounded-field border border-line bg-card py-2 pl-3 pr-8 text-[14px] text-ink-900 outline-none focus:border-brand-500"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="priority">Ưu tiên cao</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {requests.length > 0 ? (
          requests.map((request) => (
            <RequestRow key={request.id} request={request} onOpen={() => navigate(`/requests/${request.id}`)} />
          ))
        ) : (
          <EmptyState
            title="Không tìm thấy đề nghị nào"
            description="Thử thay đổi bộ lọc hoặc tìm kiếm với từ khoá khác."
          />
        )}
      </div>
    </div>
  );
}

interface RequestRowProps {
  request: Request;
  onOpen: () => void;
}

function RequestRow({ request, onOpen }: RequestRowProps) {
  const statusBadge = STATUS_BADGE[request.status];
  const priorityBadge = PRIORITY_BADGE[request.priority];
  const isRoomManagement = request.metadata?.originModule === 'room_management';

  return (
    <ApprovalCard
      icon={TYPE_ICONS[request.type] || FileText}
      number={request.requestNumber}
      typeLabel={REQUEST_TYPES[request.type]}
      title={request.title}
      createdAt={formatDate(request.createdAt)}
      onClick={onOpen}
      amount={
        typeof request.totalAmount === 'number' && request.totalAmount > 0
          ? formatVND(request.totalAmount)
          : undefined
      }
      badges={
        <>
          <StatusBadge status={statusBadge.kind} label={statusBadge.label} />
          <StatusBadge status={priorityBadge.kind} label={priorityBadge.label} />
        </>
      }
      meta={
        isRoomManagement ? (
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="info" label="Room Management" />
            {request.metadata?.roomCode ? (
              <StatusBadge status="neutral" label={request.metadata.roomCode} />
            ) : null}
            {request.metadata?.sourceIntakeIds?.length ? (
              <span className="text-[13px] text-ink-600">
                {request.metadata.sourceIntakeIds.length} intake liên kết
              </span>
            ) : null}
          </div>
        ) : undefined
      }
    />
  );
}

export default CuaToiLens;
