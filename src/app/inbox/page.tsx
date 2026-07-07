/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  Bell,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Inbox as InboxIcon,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/ui/PageHeader';
import { TabBar } from '@/ui/TabBar';
import { StatusBadge } from '@/ui/StatusBadge';
import { EmptyState } from '@/ui/EmptyState';
import { InboxItem } from '@/ui/InboxItem';
import { useInbox } from '@/viewmodels/useInbox';
import { formatVND } from '@/lib/utils';
import type { InboxCategory, InboxItem as InboxItemModel } from '@/lib/inbox/buildInbox';

/**
 * Inbox "Cần xử lý" (direction §4.4). Single list over `useInbox`, filter chips
 * Tất cả / Phê duyệt / Bàn giao / Thông báo, inline primary actions with
 * optimistic removal. The list length equals `useActionableCount().total` by
 * construction (pure `buildInbox` 1:1 map). Review rows are not acted inline —
 * their "Mở" opens the Chờ tôi lens where the multi-select consolidation UX lives.
 */

type ChipKey = 'all' | InboxCategory;

const CHIPS: { key: ChipKey; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'phe-duyet', label: 'Phê duyệt' },
  { key: 'ban-giao', label: 'Bàn giao' },
  { key: 'thong-bao', label: 'Thông báo' },
];

const HANDOFF_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ tiếp nhận',
  received: 'Đã tiếp nhận',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const INTAKE_TYPE_LABELS: Record<string, string> = {
  material: 'Vật tư',
  maintenance: 'Bảo trì',
};

function itemIcon(item: InboxItemModel) {
  switch (item.kind) {
    case 'approval':
      return <FileCheck2 className="h-4 w-4" />;
    case 'review':
      return <ClipboardList className="h-4 w-4" />;
    case 'handoff':
      return <ArrowLeftRight className="h-4 w-4" />;
    case 'notification':
      return <Bell className="h-4 w-4" />;
  }
}

export function InboxPage() {
  const navigate = useNavigate();
  const inbox = useInbox();
  const [activeChip, setActiveChip] = useState<ChipKey>('all');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [rejectingKey, setRejectingKey] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      activeChip === 'all'
        ? inbox.items
        : inbox.items.filter((item) => item.category === activeChip),
    [inbox.items, activeChip],
  );

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setBusyKey(key);
    setActionError(null);
    try {
      await fn();
    } catch {
      setActionError('Thao tác thất bại, vui lòng thử lại.');
    } finally {
      setBusyKey(null);
    }
  };

  const openReviewLens = () => navigate('/approvals');

  const openNotification = (item: InboxItemModel) => {
    if (item.kind !== 'notification') return;
    void inbox.markRead(item);
    if (item.linkTo) navigate(item.linkTo);
  };

  const renderAction = (item: InboxItemModel) => {
    const key = inbox.itemKey(item);
    const isBusy = busyKey === key;

    if (item.kind === 'approval') {
      if (rejectingKey === key) {
        return (
          <div className="flex flex-col items-end gap-1.5">
            <input
              type="text"
              value={rejectNote}
              onChange={(event) => setRejectNote(event.target.value)}
              placeholder="Lý do từ chối"
              className="w-40 rounded-field border border-line bg-card px-2 py-1 text-[13px] text-ink-900 outline-none focus:border-brand-500"
              autoFocus
            />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isBusy || rejectNote.trim().length === 0}
                onClick={() =>
                  runAction(key, async () => {
                    await inbox.reject(item, rejectNote.trim());
                    setRejectingKey(null);
                    setRejectNote('');
                  })
                }
                className="rounded-field bg-danger-600 px-2.5 py-1 text-[13px] font-medium text-white disabled:opacity-50"
              >
                Xác nhận
              </button>
              <button
                type="button"
                onClick={() => {
                  setRejectingKey(null);
                  setRejectNote('');
                }}
                className="rounded-field px-2.5 py-1 text-[13px] font-medium text-ink-600 hover:bg-paper"
              >
                Hủy
              </button>
            </div>
          </div>
        );
      }
      return (
        <>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => runAction(key, () => inbox.approve(item))}
            className="inline-flex items-center gap-1 rounded-field bg-brand-600 px-2.5 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Duyệt
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              setRejectingKey(key);
              setRejectNote('');
            }}
            className="inline-flex items-center gap-1 rounded-field px-2.5 py-1.5 text-[13px] font-medium text-danger-600 hover:bg-danger-600/10 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            Từ chối
          </button>
        </>
      );
    }

    if (item.kind === 'review') {
      return (
        <button
          type="button"
          onClick={openReviewLens}
          className="inline-flex items-center rounded-field border border-line px-2.5 py-1.5 text-[13px] font-medium text-brand-600 hover:bg-brand-50"
        >
          Mở
        </button>
      );
    }

    if (item.kind === 'handoff') {
      const next = item.status === 'received' ? 'completed' : 'received';
      const label = next === 'completed' ? 'Hoàn thành' : 'Tiếp nhận';
      const fn = next === 'completed' ? inbox.completeHandoff : inbox.receiveHandoff;
      return (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => runAction(key, () => fn(item))}
          className="inline-flex items-center rounded-field bg-brand-600 px-2.5 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
        >
          {label}
        </button>
      );
    }

    // notification
    return (
      <button
        type="button"
        onClick={() => openNotification(item)}
        className="inline-flex items-center rounded-field border border-line px-2.5 py-1.5 text-[13px] font-medium text-brand-600 hover:bg-brand-50"
      >
        Mở
      </button>
    );
  };

  const renderDetail = (item: InboxItemModel) => {
    if (item.kind === 'approval') {
      return (
        <>
          {item.requiresManualForward && (
            <StatusBadge status="warn" label="Cần chuyển tiếp" />
          )}
          {typeof item.amount === 'number' && item.amount > 0 && (
            <span className="text-[13px] text-ink-600 [font-variant-numeric:tabular-nums]">
              {formatVND(item.amount)}
            </span>
          )}
        </>
      );
    }
    if (item.kind === 'review') {
      return (
        <StatusBadge
          status="info"
          label={INTAKE_TYPE_LABELS[item.intakeType] ?? item.intakeType}
        />
      );
    }
    if (item.kind === 'handoff') {
      return (
        <StatusBadge
          status="neutral"
          label={HANDOFF_STATUS_LABELS[item.status] ?? item.status}
        />
      );
    }
    if (item.kind === 'notification' && item.body) {
      return <span className="text-[13px] text-ink-600 line-clamp-2">{item.body}</span>;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Cần xử lý" sub="Mọi việc đang chờ bạn — phê duyệt, bàn giao, thông báo." />

      <TabBar
        tabs={CHIPS}
        activeKey={activeChip}
        onChange={(key) => setActiveChip(key)}
      />

      {actionError && <p className="text-[13px] text-danger-600">{actionError}</p>}

      {inbox.isLoading && inbox.items.length === 0 ? (
        <div className="space-y-3" aria-hidden="true">
          {[0, 1, 2].map((row) => (
            <div key={row} className="animate-pulse rounded-field border border-line bg-card p-3">
              <div className="h-4 w-2/3 rounded bg-line" />
              <div className="mt-2 h-3 w-1/3 rounded bg-line" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="Không có việc cần xử lý"
          description="Hôm nay chưa có việc cần bạn xử lý ✓"
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <InboxItem
              key={inbox.itemKey(item)}
              icon={itemIcon(item)}
              title={item.title}
              fromName={item.kind === 'notification' ? undefined : item.fromName}
              createdAt={item.createdAt}
              detail={renderDetail(item)}
              action={renderAction(item)}
              onOpen={item.kind === 'notification' ? () => openNotification(item) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default InboxPage;
