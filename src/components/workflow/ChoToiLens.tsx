/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  FileText,
  Layers,
  List as ListIcon,
  Package,
  RefreshCw,
  User,
  Wrench,
} from 'lucide-react';
import { useApprovals } from '@/viewmodels/useApprovals';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { REQUEST_TYPES, PRIORITY } from '@/lib/constants';
import { requiresManualForwardChoice } from '@/lib/approvals/workqueue';
import { formatVND, cn } from '@/lib/utils';
import { ApprovalCard } from '@/ui/ApprovalCard';
import { StatusBadge, type StatusKind } from '@/ui/StatusBadge';
import { EmptyState } from '@/ui/EmptyState';
import { KpiCard } from '@/ui/KpiCard';
import type { Priority, Request, RequestType } from '@/types/request';

/**
 * ChoToiLens — "Chờ tôi": everything awaiting my review (direction §4.2).
 * Reuses `useApprovals` verbatim (regularApprovals, kttEscalationCandidates,
 * reviewerQueue, assignedHandoffs, all action fns, batchApprove,
 * consolidateMaterialIntakes, promoteMaintenanceIntake, updateHandoffStatus)
 * — this is `src/app/approvals/page.tsx`'s content re-presented on `ui/*`.
 * Behaviour identical: KTT escalation section, batch-approve bar, reviewer
 * consolidation, handoff actions. No new business logic.
 */

const TYPE_ICONS: Record<RequestType, typeof FileText> = {
  material_release: Package,
  purchase: Package,
  payment: FileText,
  advance: FileText,
  leave: FileText,
  other: Wrench,
};

const PRIORITY_BADGE: Record<Priority, { kind: StatusKind; label: string }> = {
  low: { kind: 'neutral', label: PRIORITY.low },
  normal: { kind: 'info', label: PRIORITY.normal },
  high: { kind: 'warn', label: PRIORITY.high },
  urgent: { kind: 'danger', label: PRIORITY.urgent },
};

const HANDOFF_STATUS_LABELS = {
  pending: 'Chờ tiếp nhận',
  received: 'Đang xử lý',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
} as const;

function getUrgencyBadge(createdAt: string): { kind: StatusKind; label: string } {
  const hoursWaiting = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);

  if (hoursWaiting > 48) {
    return { kind: 'danger', label: `Chờ ${Math.floor(hoursWaiting / 24)} ngày` };
  }
  if (hoursWaiting > 24) {
    return { kind: 'warn', label: `Chờ ${Math.floor(hoursWaiting / 24)} ngày` };
  }
  return { kind: 'neutral', label: `Chờ ${Math.floor(hoursWaiting)} giờ` };
}

export function ChoToiLens() {
  const navigate = useNavigate();
  const {
    regularApprovals,
    kttEscalationCandidates,
    reviewerQueue,
    assignedHandoffs,
    countsByType,
    isLoading,
    isRefreshing,
    refresh,
    approveRequest,
    batchApprove,
    consolidateMaterialIntakes,
    promoteMaintenanceIntake,
    updateHandoffStatus,
  } = useApprovals();

  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [selectedApprovalIds, setSelectedApprovalIds] = useState<Set<string>>(new Set());
  const [selectedReviewIds, setSelectedReviewIds] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; type: 'single' | 'batch'; id?: string } | null>(
    null,
  );
  const [reviewActionError, setReviewActionError] = useState('');
  const [isSubmittingReviewAction, setIsSubmittingReviewAction] = useState(false);

  const approvalQueue = [...kttEscalationCandidates, ...regularApprovals];
  const quickApproveEligible = approvalQueue.filter((request) => !requiresManualForwardChoice(request));
  const reviewerMaterialSelection = reviewerQueue.filter((intake) => selectedReviewIds.has(intake.id));
  const materialSelectionIsCompatible = useMemo(() => {
    if (reviewerMaterialSelection.length === 0) return false;
    const firstGroup = reviewerMaterialSelection[0].reviewGroup;
    return reviewerMaterialSelection.every(
      (intake) => intake.intakeType === 'material' && intake.reviewGroup === firstGroup,
    );
  }, [reviewerMaterialSelection]);

  const totalPending = approvalQueue.length + reviewerQueue.length + assignedHandoffs.length;

  const handleToggleApprovalSelect = (id: string) => {
    const next = new Set(selectedApprovalIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedApprovalIds(next);
  };

  const handleToggleReviewSelect = (id: string) => {
    const next = new Set(selectedReviewIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedReviewIds(next);
  };

  const handleSelectAllApprovals = () => {
    if (selectedApprovalIds.size === quickApproveEligible.length) {
      setSelectedApprovalIds(new Set());
      return;
    }

    setSelectedApprovalIds(new Set(quickApproveEligible.map((request) => request.id)));
  };

  const confirmApprove = async () => {
    if (confirmDialog?.type === 'single' && confirmDialog.id) {
      await approveRequest(confirmDialog.id);
    } else if (confirmDialog?.type === 'batch') {
      await batchApprove(Array.from(selectedApprovalIds));
      setSelectedApprovalIds(new Set());
    }

    setConfirmDialog(null);
  };

  const handleConsolidateMaterials = async () => {
    if (!materialSelectionIsCompatible) {
      setReviewActionError('Cần chọn các intake vật tư cùng một nhóm review để tổng hợp.');
      return;
    }

    setReviewActionError('');
    setIsSubmittingReviewAction(true);
    try {
      await consolidateMaterialIntakes(Array.from(selectedReviewIds));
      setSelectedReviewIds(new Set());
    } catch (error) {
      setReviewActionError(error instanceof Error ? error.message : 'Không thể tổng hợp vật tư.');
    } finally {
      setIsSubmittingReviewAction(false);
    }
  };

  const handlePromoteMaintenance = async (intakeId: string) => {
    setReviewActionError('');
    setIsSubmittingReviewAction(true);
    try {
      await promoteMaintenanceIntake(intakeId);
    } catch (error) {
      setReviewActionError(error instanceof Error ? error.message : 'Không thể tạo đề nghị bảo trì.');
    } finally {
      setIsSubmittingReviewAction(false);
    }
  };

  const renderApprovalCard = (request: Request, isEscalation = false) => {
    const urgency = getUrgencyBadge(request.createdAt);
    const priorityBadge = PRIORITY_BADGE[request.priority];
    const isSelected = selectedApprovalIds.has(request.id);
    const needsDetail = requiresManualForwardChoice(request);
    const roomCode =
      request.metadata?.originModule === 'room_management' ? request.metadata.roomCode : undefined;

    return (
      <ApprovalCard
        key={request.id}
        icon={TYPE_ICONS[request.type] || FileText}
        number={request.requestNumber}
        typeLabel={REQUEST_TYPES[request.type]}
        title={request.title}
        requesterName={request.requesterName}
        requesterMeta={request.requesterDept}
        onClick={() => navigate(`/requests/${request.id}`)}
        selectable={!needsDetail}
        selected={isSelected}
        onToggleSelect={() => handleToggleApprovalSelect(request.id)}
        highlighted={isEscalation}
        amount={
          typeof request.totalAmount === 'number' && request.totalAmount > 0
            ? formatVND(request.totalAmount)
            : undefined
        }
        badges={
          <>
            <StatusBadge status={urgency.kind} label={urgency.label} />
            <StatusBadge status={priorityBadge.kind} label={priorityBadge.label} />
            {roomCode ? <StatusBadge status="info" label={roomCode} /> : null}
          </>
        }
        actions={
          needsDetail ? (
            <button
              onClick={() => navigate(`/requests/${request.id}`)}
              className="flex items-center gap-1.5 rounded-field bg-brand-100 px-3 py-1.5 text-[13px] font-medium text-brand-600 transition-colors hover:bg-brand-100/70"
            >
              Xem và chuyển xử lý
            </button>
          ) : (
            <button
              onClick={() => setConfirmDialog({ isOpen: true, type: 'single', id: request.id })}
              className="flex items-center gap-1.5 rounded-field bg-brand-100 px-3 py-1.5 text-[13px] font-medium text-brand-600 transition-colors hover:bg-brand-100/70"
            >
              <Check className="h-4 w-4" />
              Duyệt
            </button>
          )
        }
      />
    );
  };

  const renderReviewerCard = (intake: (typeof reviewerQueue)[number]) => {
    const isSelected = selectedReviewIds.has(intake.id);
    const urgency = getUrgencyBadge(intake.createdAt);
    const priorityBadge = PRIORITY_BADGE[intake.priority];
    const isMaterial = intake.intakeType === 'material';

    return (
      <ApprovalCard
        key={intake.id}
        icon={isMaterial ? Package : Wrench}
        number={intake.roomCode}
        typeLabel={isMaterial ? 'Room material intake' : 'Room maintenance intake'}
        title={intake.title}
        selectable={isMaterial}
        selected={isSelected}
        onToggleSelect={() => handleToggleReviewSelect(intake.id)}
        badges={
          <>
            <StatusBadge status={urgency.kind} label={urgency.label} />
            <StatusBadge status={priorityBadge.kind} label={priorityBadge.label} />
          </>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[14px] text-ink-600">
            <span>{intake.roomName}</span>
            <span>•</span>
            <span>{intake.requesterName}</span>
            {isMaterial && intake.items.length > 0 ? (
              <span className="text-[13px] text-ink-600">{intake.items.length} dòng vật tư</span>
            ) : null}
          </div>
        }
        actions={
          !isMaterial ? (
            <button
              onClick={() => void handlePromoteMaintenance(intake.id)}
              disabled={isSubmittingReviewAction}
              className="rounded-field bg-brand-100 px-3 py-1.5 text-[13px] font-medium text-brand-600 transition-colors hover:bg-brand-100/70 disabled:opacity-50"
            >
              Tạo đề nghị bảo trì
            </button>
          ) : undefined
        }
      />
    );
  };

  return (
    <div className="relative space-y-6 pb-24 md:pb-0">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-[600] text-ink-900">Việc chờ bạn xử lý</h2>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="rounded-full p-2 text-ink-400 transition-colors hover:bg-paper disabled:opacity-50"
          aria-label="Làm mới"
        >
          <RefreshCw className={cn('h-5 w-5', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard value={totalPending} label="Tổng công việc" />
        <KpiCard value={approvalQueue.length} label="Chờ phê duyệt" />
        <KpiCard value={reviewerQueue.length} label="Reviewer queue" />
        <KpiCard value={assignedHandoffs.length} label="Handoff đang mở" />
      </div>

      <div className="flex flex-col items-start justify-between gap-4 rounded-card bg-card p-3 shadow-card sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectAllApprovals}
            className="px-2 py-1 text-[13px] font-medium text-brand-600 hover:text-brand-700"
          >
            {selectedApprovalIds.size === quickApproveEligible.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </button>
          <span className="text-line">|</span>
          <span className="text-[13px] text-ink-600">Lớp công việc hợp nhất</span>
        </div>

        <div className="flex items-center rounded-field bg-paper p-1">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'rounded-field p-1.5 transition-colors',
              viewMode === 'list' ? 'bg-card text-ink-900 shadow-card' : 'text-ink-400 hover:text-ink-600',
            )}
            aria-label="Xem dạng danh sách"
          >
            <ListIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            className={cn(
              'rounded-field p-1.5 transition-colors',
              viewMode === 'grouped' ? 'bg-card text-ink-900 shadow-card' : 'text-ink-400 hover:text-ink-600',
            )}
            aria-label="Xem theo nhóm"
          >
            <Layers className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4 rounded-card bg-card p-6 shadow-card">
          <div className="h-5 w-48 animate-pulse rounded bg-line" />
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-card bg-paper" />
            <div className="h-24 animate-pulse rounded-card bg-paper" />
            <div className="h-24 animate-pulse rounded-card bg-paper" />
          </div>
        </div>
      ) : totalPending === 0 ? (
        <EmptyState
          title="Không có công việc cần xử lý"
          description="Tất cả đề nghị, reviewer queue, và handoff hiện tại đều đã được xử lý."
        />
      ) : (
        <div className="space-y-8">
          {kttEscalationCandidates.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-warn-600/30 pb-2">
                <AlertTriangle className="h-5 w-5 text-warn-600" />
                <h3 className="text-[16px] font-[600] text-ink-900">Cần xem xét chuyển cấp (CT HĐQT)</h3>
                <StatusBadge status="warn" label={String(kttEscalationCandidates.length)} />
              </div>
              <div className="space-y-3">
                {kttEscalationCandidates.map((request) => renderApprovalCard(request, true))}
              </div>
            </section>
          ) : null}

          {approvalQueue.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-line pb-2">
                <h3 className="text-[16px] font-[600] text-ink-900">Hàng chờ phê duyệt</h3>
                <StatusBadge status="neutral" label={String(approvalQueue.length)} />
              </div>

              {viewMode === 'list' ? (
                <div className="space-y-3">{regularApprovals.map((request) => renderApprovalCard(request))}</div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(countsByType).map(([type, count]) => {
                    const requestsOfType = regularApprovals.filter((request) => request.type === type);
                    if (requestsOfType.length === 0) return null;

                    return (
                      <div key={type} className="space-y-3">
                        <h4 className="text-[13px] font-medium uppercase tracking-wider text-ink-600">
                          {REQUEST_TYPES[type as RequestType]} ({count})
                        </h4>
                        {requestsOfType.map((request) => renderApprovalCard(request))}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          {reviewerQueue.length > 0 ? (
            <section className="space-y-4">
              <div className="flex flex-col gap-3 border-b border-info-600/30 pb-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-info-600" />
                  <h3 className="text-[16px] font-[600] text-ink-900">Reviewer queue</h3>
                  <StatusBadge status="info" label={String(reviewerQueue.length)} />
                </div>
                <button
                  onClick={() => void handleConsolidateMaterials()}
                  disabled={!materialSelectionIsCompatible || isSubmittingReviewAction}
                  className="rounded-field bg-info-100 px-3 py-1.5 text-[13px] font-medium text-info-600 transition-colors hover:bg-info-100/70 disabled:opacity-50"
                >
                  Tổng hợp vật tư đã chọn
                </button>
              </div>
              {reviewActionError ? <p className="text-[13px] text-danger-600">{reviewActionError}</p> : null}
              <div className="space-y-3">{reviewerQueue.map((intake) => renderReviewerCard(intake))}</div>
            </section>
          ) : null}

          {assignedHandoffs.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-ok-600/30 pb-2">
                <User className="h-5 w-5 text-ok-600" />
                <h3 className="text-[16px] font-[600] text-ink-900">Công việc được chuyển xử lý</h3>
                <StatusBadge status="ok" label={String(assignedHandoffs.length)} />
              </div>
              <div className="space-y-3">
                {assignedHandoffs.map((handoff) => (
                  <div key={handoff.id} className="rounded-card bg-card p-4 shadow-card">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="text-[14px] font-[600] text-ink-900">
                            {handoff.assigneeName || 'Người xử lý'}
                          </span>
                          <span className="text-[13px] text-ink-600">{HANDOFF_STATUS_LABELS[handoff.status]}</span>
                        </div>
                        <div className="text-[14px] text-ink-600">Đề nghị liên kết: {handoff.requestId}</div>
                        {handoff.note ? <div className="mt-1 text-[14px] text-ink-600">{handoff.note}</div> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        {handoff.status === 'pending' ? (
                          <button
                            onClick={() => void updateHandoffStatus(handoff.id, 'received')}
                            className="rounded-field bg-info-100 px-3 py-1.5 text-[13px] font-medium text-info-600 transition-colors hover:bg-info-100/70"
                          >
                            Tiếp nhận
                          </button>
                        ) : null}
                        {handoff.status === 'received' ? (
                          <button
                            onClick={() => void updateHandoffStatus(handoff.id, 'completed')}
                            className="rounded-field bg-brand-100 px-3 py-1.5 text-[13px] font-medium text-brand-600 transition-colors hover:bg-brand-100/70"
                          >
                            Hoàn thành
                          </button>
                        ) : null}
                        <button
                          onClick={() => navigate(`/requests/${handoff.requestId}`)}
                          className="rounded-field bg-paper px-3 py-1.5 text-[13px] font-medium text-ink-600 transition-colors hover:bg-line"
                        >
                          Mở đề nghị
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      {selectedApprovalIds.size > 0 ? (
        <div className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full bg-ink-900 px-6 py-3 text-paper shadow-card md:bottom-8">
          <span className="font-medium">Đã chọn {selectedApprovalIds.size}</span>
          <div className="h-4 w-px bg-ink-600" />
          <button
            onClick={() => setConfirmDialog({ isOpen: true, type: 'batch' })}
            className="flex items-center gap-2 font-semibold text-brand-500 transition-colors hover:text-brand-100"
          >
            <Check className="h-5 w-5" />
            Duyệt hàng loạt
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={confirmDialog?.isOpen || false}
        title={confirmDialog?.type === 'batch' ? 'Duyệt hàng loạt' : 'Xác nhận phê duyệt'}
        message={
          confirmDialog?.type === 'batch'
            ? `Bạn có chắc chắn muốn duyệt ${selectedApprovalIds.size} đề nghị đã chọn?`
            : 'Bạn có chắc chắn muốn phê duyệt đề nghị này?'
        }
        confirmText="Đồng ý duyệt"
        onConfirm={confirmApprove}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}

export default ChoToiLens;
