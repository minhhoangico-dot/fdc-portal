/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/access';
import { PageHeader } from '@/ui/PageHeader';
import { TabBar, type TabBarItem } from '@/ui/TabBar';
import { CuaToiLens } from '@/components/workflow/CuaToiLens';
import { ChoToiLens } from '@/components/workflow/ChoToiLens';

export type WorkflowLens = 'cua-toi' | 'cho-toi';

export interface WorkflowWorkspaceProps {
  defaultLens?: WorkflowLens;
}

const LENS_TABS: TabBarItem<WorkflowLens>[] = [
  { key: 'cua-toi', label: 'Của tôi' },
  { key: 'cho-toi', label: 'Chờ tôi' },
];

/**
 * WorkflowWorkspace — "Phê duyệt & Đề nghị" (direction §4.2): the two-lens
 * shell over the single `fdc_approval_requests` object. "Của tôi" reuses
 * `useRequests`, "Chờ tôi" reuses `useApprovals` — both frozen, composed
 * only. Active lens is reflected in `?lens=` so `/requests` and `/approvals`
 * can both lens-preset render this component without new routes (§7).
 *
 * Lens presence is permission-driven, not hardcoded: the `approvalEnabled`
 * predicate mirrors `useActionableCount`'s exact check (any of
 * `approvals.review_assigned` / `approvals.receive_handoff` /
 * `room_management.review_group_queue`). Pure-staff roles see only
 * "Của tôi" — single-lens, no tab bar — which is also why this component is
 * safe to use as staff's `[Workspace]` slot (Đề nghị).
 */
export function WorkflowWorkspace({ defaultLens = 'cua-toi' }: WorkflowWorkspaceProps) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const approvalEnabled = Boolean(
    user &&
      (can(user.role, 'approvals.review_assigned') ||
        can(user.role, 'approvals.receive_handoff') ||
        can(user.role, 'room_management.review_group_queue')),
  );

  const requestedLens = searchParams.get('lens');
  const activeLens: WorkflowLens = useMemo(() => {
    if (!approvalEnabled) return 'cua-toi';
    if (requestedLens === 'cua-toi' || requestedLens === 'cho-toi') return requestedLens;
    return defaultLens;
  }, [approvalEnabled, defaultLens, requestedLens]);

  const handleChangeLens = (lens: WorkflowLens) => {
    const next = new URLSearchParams(searchParams);
    next.set('lens', lens);
    setSearchParams(next, { replace: true });
  };

  const showCreateCta = activeLens === 'cua-toi';

  return (
    <div className="relative space-y-6 pb-20 md:pb-0">
      <PageHeader
        title="Phê duyệt & Đề nghị"
        sub={
          approvalEnabled
            ? 'Một đối tượng, hai góc nhìn: đề nghị của bạn và việc chờ bạn duyệt.'
            : 'Theo dõi các đề nghị bạn đã tạo.'
        }
        actions={
          showCreateCta ? (
            <Link
              to="/requests/create"
              className="hidden items-center gap-2 rounded-field bg-brand-600 px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-brand-700 md:flex"
            >
              <Plus className="h-5 w-5" />
              Tạo đề nghị mới
            </Link>
          ) : undefined
        }
      />

      {approvalEnabled ? (
        <TabBar<WorkflowLens> tabs={LENS_TABS} activeKey={activeLens} onChange={handleChangeLens} />
      ) : null}

      {activeLens === 'cua-toi' ? <CuaToiLens /> : <ChoToiLens />}

      {showCreateCta ? (
        <Link
          to="/requests/create"
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-card transition-colors hover:bg-brand-700 md:hidden"
        >
          <Plus className="h-6 w-6" />
        </Link>
      ) : null}
    </div>
  );
}

export default WorkflowWorkspace;
