/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Inbox, XCircle } from 'lucide-react';
import { useApprovals } from '@/viewmodels/useApprovals';
import { WidgetCard } from '@/ui/WidgetCard';
import { StatusBadge } from '@/ui/StatusBadge';
import { EmptyState } from '@/ui/EmptyState';
import { REQUEST_TYPES } from '@/lib/constants';
import { formatTimeAgo, formatVND } from '@/lib/utils';
import type { Request } from '@/types/request';

/**
 * Home "Hôm nay" widget — "Chờ bạn duyệt" (registry key `cho-ban-duyet`,
 * gated by `approvals.review_assigned`; direction §4.3).
 *
 * Top-3 pending approval steps assigned to the current user, with inline
 * Duyệt/Từ chối reusing `useApprovals().approveRequest`/`rejectRequest` —
 * no duplicated approval logic. Self-contained: data fetching, loading
 * skeleton, and a quiet error state live here; it never throws so one
 * failing widget cannot blank the rest of Home.
 */

function requestTypeLabel(type: Request['type']) {
  return REQUEST_TYPES[type as keyof typeof REQUEST_TYPES] || type;
}

function ChoBanDuyetSkeleton() {
  return (
    <WidgetCard title="Chờ bạn duyệt">
      <div className="space-y-3" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <div key={row} className="animate-pulse rounded-field border border-line p-3">
            <div className="h-4 w-2/3 rounded bg-line" />
            <div className="mt-2 h-3 w-1/3 rounded bg-line" />
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

interface PendingRowProps {
  request: Request;
  onApprove: (id: string) => void;
  onReject: (id: string, note: string) => void;
  busyId: string | null;
}

function PendingRow({ request, onApprove, onReject, busyId }: PendingRowProps) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const isBusy = busyId === request.id;

  return (
    <div className="rounded-field border border-line p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            to={`/requests/${request.id}`}
            className="block truncate text-[14px] font-medium text-ink-900 hover:text-brand-600"
          >
            {request.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ink-600">
            <StatusBadge status="info" label={requestTypeLabel(request.type)} />
            <span>{formatTimeAgo(request.createdAt)}</span>
            {typeof request.totalAmount === 'number' && request.totalAmount > 0 && (
              <span className="[font-variant-numeric:tabular-nums]">{formatVND(request.totalAmount)}</span>
            )}
          </div>
        </div>
      </div>

      {rejecting ? (
        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Lý do từ chối"
            className="w-full rounded-field border border-line bg-card px-3 py-1.5 text-[13px] text-ink-900 outline-none focus:border-brand-500"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isBusy || note.trim().length === 0}
              onClick={() => onReject(request.id, note.trim())}
              className="rounded-field bg-danger-600 px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
            >
              Xác nhận từ chối
            </button>
            <button
              type="button"
              onClick={() => {
                setRejecting(false);
                setNote('');
              }}
              className="rounded-field px-3 py-1.5 text-[13px] font-medium text-ink-600 hover:bg-paper"
            >
              Hủy
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onApprove(request.id)}
            className="inline-flex items-center gap-1.5 rounded-field bg-brand-600 px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Duyệt
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setRejecting(true)}
            className="inline-flex items-center gap-1.5 rounded-field px-3 py-1.5 text-[13px] font-medium text-danger-600 hover:bg-danger-600/10 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            Từ chối
          </button>
        </div>
      )}
    </div>
  );
}

export function ChoBanDuyet() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  let approvals: ReturnType<typeof useApprovals> | null = null;
  let hookError = false;
  try {
    approvals = useApprovals();
  } catch {
    hookError = true;
  }

  const topThree = useMemo(() => {
    const list = approvals?.regularApprovals ?? [];
    return [...list]
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
      .slice(0, 3);
  }, [approvals?.regularApprovals]);

  if (hookError || !approvals) {
    return (
      <WidgetCard title="Chờ bạn duyệt">
        <p className="text-[13px] text-ink-400">Không thể tải danh sách chờ duyệt lúc này.</p>
      </WidgetCard>
    );
  }

  if (approvals.isLoading) {
    return <ChoBanDuyetSkeleton />;
  }

  const handleApprove = async (id: string) => {
    setBusyId(id);
    setActionError(null);
    try {
      await approvals!.approveRequest(id);
    } catch {
      setActionError('Duyệt đề nghị thất bại, vui lòng thử lại.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string, note: string) => {
    setBusyId(id);
    setActionError(null);
    try {
      await approvals!.rejectRequest(id, note);
    } catch {
      setActionError('Từ chối đề nghị thất bại, vui lòng thử lại.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <WidgetCard
      title="Chờ bạn duyệt"
      actions={
        approvals.regularApprovals.length > 0 ? (
          <Link to="/approvals" className="text-[13px] font-medium text-brand-600 hover:underline">
            Xem tất cả
          </Link>
        ) : undefined
      }
    >
      {topThree.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Không có đề nghị chờ bạn duyệt"
          description="Hôm nay chưa có việc cần bạn xử lý ✓"
        />
      ) : (
        <div className="space-y-3">
          {actionError && <p className="text-[13px] text-danger-600">{actionError}</p>}
          {topThree.map((request) => (
            <PendingRow
              key={request.id}
              request={request}
              onApprove={handleApprove}
              onReject={handleReject}
              busyId={busyId}
            />
          ))}
        </div>
      )}
    </WidgetCard>
  );
}

export default ChoBanDuyet;
