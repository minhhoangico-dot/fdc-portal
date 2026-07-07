/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { REQUEST_STATUS } from '@/lib/constants';
import { formatTimeAgo } from '@/lib/utils';
import { WidgetCard } from '@/ui/WidgetCard';
import { StatusBadge, type StatusKind } from '@/ui/StatusBadge';
import { EmptyState } from '@/ui/EmptyState';
import type { RequestStatus } from '@/types/request';

/**
 * Home "Hôm nay" widget: "Đề nghị của tôi" — the requester's own recent
 * requests as status chips (direction §4.3, registry key `de-nghi-cua-toi`,
 * gated by `requests.view_own`).
 *
 * Self-contained: owns its own fetch, never throws — loading skeleton +
 * quiet error state so one widget failing never blanks the Home grid.
 */

interface MyRequestRow {
  id: string;
  requestNumber: string;
  title: string;
  status: RequestStatus;
  createdAt: string;
}

const STATUS_KIND: Record<RequestStatus, StatusKind> = {
  draft: 'neutral',
  pending: 'warn',
  approved: 'ok',
  rejected: 'danger',
  escalated: 'warn',
  completed: 'ok',
  cancelled: 'neutral',
};

const RECENT_LIMIT = 5;

function useMyRecentRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MyRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!user) {
      setRequests([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErrored(false);

    (async () => {
      try {
        const { data, error } = await supabase
          .from('fdc_approval_requests')
          .select('id, request_number, title, status, created_at')
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false })
          .limit(RECENT_LIMIT);

        if (cancelled) return;

        if (error) {
          console.error('DeNghiCuaToi: failed to load my requests', error);
          setErrored(true);
          setRequests([]);
          return;
        }

        setRequests(
          (data ?? []).map((row) => ({
            id: row.id,
            requestNumber: row.request_number,
            title: row.title,
            status: row.status as RequestStatus,
            createdAt: row.created_at,
          })),
        );
      } catch (error) {
        if (cancelled) return;
        console.error('DeNghiCuaToi: unexpected error loading my requests', error);
        setErrored(true);
        setRequests([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { requests, loading, errored };
}

function RequestChip({ request }: { request: MyRequestRow }) {
  return (
    <Link
      to={`/requests/${request.id}`}
      className="flex items-center justify-between gap-3 rounded-field border border-line px-3 py-2 text-[13px] transition-colors hover:bg-paper"
    >
      <span className="min-w-0 truncate text-ink-900">{request.title}</span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="text-ink-400">{formatTimeAgo(request.createdAt)}</span>
        <StatusBadge status={STATUS_KIND[request.status]} label={REQUEST_STATUS[request.status]} />
      </span>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-9 animate-pulse rounded-field bg-paper" />
      ))}
    </div>
  );
}

export default function DeNghiCuaToi() {
  const { requests, loading, errored } = useMyRecentRequests();

  return (
    <WidgetCard
      title="Đề nghị của tôi"
      actions={
        <Link to="/requests" className="text-[13px] font-medium text-brand-600 hover:text-brand-700">
          Xem tất cả
        </Link>
      }
    >
      {loading ? (
        <LoadingSkeleton />
      ) : errored ? (
        <p className="text-[13px] text-ink-400">Không thể tải đề nghị lúc này.</p>
      ) : requests.length === 0 ? (
        <EmptyState title="Chưa có đề nghị nào" description="Đề nghị bạn tạo sẽ hiện ở đây." />
      ) : (
        <div className="flex flex-col gap-2">
          {requests.map((request) => (
            <RequestChip key={request.id} request={request} />
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
