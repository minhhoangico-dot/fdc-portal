/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  Layers,
  List as ListIcon,
  Package,
  RefreshCw,
  User,
  Wrench,
} from 'lucide-react';
import { useApprovals } from '@/viewmodels/useApprovals';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { PriorityBadge } from '@/components/shared/Badges';
import { REQUEST_TYPES } from '@/lib/constants';
import { requiresManualForwardChoice } from '@/lib/approvals/workqueue';
import { formatVND, cn } from '@/lib/utils';
import type { Request, RequestType } from '@/types/request';

const TYPE_ICONS: Record<RequestType, any> = {
  material_release: Package,
  purchase: Package,
  payment: FileText,
  advance: FileText,
  leave: FileText,
  other: Wrench,
};

const HANDOFF_STATUS_LABELS = {
  pending: 'Cho tiep nhan',
  received: 'Dang xu ly',
  completed: 'Hoan thanh',
  cancelled: 'Da huy',
} as const;

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const {
    regularApprovals,
    kttEscalationCandidates,
    reviewerQueue,
    assignedHandoffs,
    countsByType,
    countsByUrgency,
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
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; type: 'single' | 'batch'; id?: string } | null>(null);
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

  const totalPending =
    approvalQueue.length + reviewerQueue.length + assignedHandoffs.length;

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
      setReviewActionError('Can chon cac intake vat tu cung mot nhom review de tong hop.');
      return;
    }

    setReviewActionError('');
    setIsSubmittingReviewAction(true);
    try {
      await consolidateMaterialIntakes(Array.from(selectedReviewIds));
      setSelectedReviewIds(new Set());
    } catch (error) {
      setReviewActionError(error instanceof Error ? error.message : 'Khong the tong hop vat tu.');
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
      setReviewActionError(error instanceof Error ? error.message : 'Khong the tao de nghi bao tri.');
    } finally {
      setIsSubmittingReviewAction(false);
    }
  };

  const getUrgencyInfo = (createdAt: string) => {
    const now = Date.now();
    const createdTime = new Date(createdAt).getTime();
    const hoursWaiting = (now - createdTime) / (1000 * 60 * 60);

    if (hoursWaiting > 48) {
      return {
        text: `Cho ${Math.floor(hoursWaiting / 24)} ngay`,
        color: 'text-red-600 bg-red-50 border-red-200',
      };
    }
    if (hoursWaiting > 24) {
      return {
        text: `Cho ${Math.floor(hoursWaiting / 24)} ngay`,
        color: 'text-orange-600 bg-orange-50 border-orange-200',
      };
    }

    return {
      text: `Cho ${Math.floor(hoursWaiting)} gio`,
      color: 'text-gray-600 bg-gray-50 border-gray-200',
    };
  };

  const renderApprovalCard = (request: Request, isEscalation = false) => {
    const Icon = TYPE_ICONS[request.type] || FileText;
    const urgency = getUrgencyInfo(request.createdAt);
    const isSelected = selectedApprovalIds.has(request.id);
    const needsDetail = requiresManualForwardChoice(request);

    return (
      <div
        key={request.id}
        className={cn(
          'bg-white rounded-xl border p-4 transition-all flex flex-col sm:flex-row gap-4 sm:items-center relative',
          isSelected ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-indigo-300',
          isEscalation ? 'bg-orange-50/40 border-orange-200' : '',
        )}
      >
        {!needsDetail ? (
          <div className="absolute top-4 left-4 sm:static sm:flex-shrink-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleToggleApprovalSelect(request.id)}
              className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        ) : null}

        <div
          className={cn('flex items-start gap-4 flex-1 cursor-pointer', needsDetail ? '' : 'pl-8 sm:pl-0')}
          onClick={() => navigate(`/requests/${request.id}`)}
        >
          <div className="p-3 bg-gray-50 rounded-lg shrink-0 hidden sm:block">
            <Icon className="w-6 h-6 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-500">{request.requestNumber}</span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">{REQUEST_TYPES[request.type]}</span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full border', urgency.color)}>
                <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
                {urgency.text}
              </span>
            </div>
            <h3 className="text-base font-semibold text-gray-900 truncate mb-2">{request.title}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-700">{request.requesterName}</span>
              {request.requesterDept ? (
                <span className="text-xs text-gray-500">({request.requesterDept})</span>
              ) : null}
              <PriorityBadge priority={request.priority} />
              {request.metadata?.originModule === 'room_management' && request.metadata.roomCode ? (
                <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {request.metadata.roomCode}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-center pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 mt-3 sm:mt-0 gap-3">
          {request.totalAmount ? (
            <div className="text-left sm:text-right">
              <div className="text-sm font-semibold text-gray-900">{formatVND(request.totalAmount)}</div>
              <div className="text-xs text-gray-500 mt-1">Tong tien</div>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            {needsDetail ? (
              <button
                onClick={() => navigate(`/requests/${request.id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
              >
                Xem va chuyen xu ly
              </button>
            ) : (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setConfirmDialog({ isOpen: true, type: 'single', id: request.id });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
              >
                <Check className="w-4 h-4" />
                Duyet
              </button>
            )}
            <button
              onClick={() => navigate(`/requests/${request.id}`)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors sm:hidden"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderReviewerCard = (intake: (typeof reviewerQueue)[number]) => {
    const isSelected = selectedReviewIds.has(intake.id);
    const urgency = getUrgencyInfo(intake.createdAt);
    const isMaterial = intake.intakeType === 'material';

    return (
      <div
        key={intake.id}
        className={cn(
          'bg-white rounded-xl border p-4 transition-all flex flex-col sm:flex-row gap-4 sm:items-center relative',
          isSelected ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-indigo-300',
        )}
      >
        {isMaterial ? (
          <div className="absolute top-4 left-4 sm:static sm:flex-shrink-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleToggleReviewSelect(intake.id)}
              className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        ) : null}

        <div className={cn('flex items-start gap-4 flex-1', isMaterial ? 'pl-8 sm:pl-0' : '')}>
          <div className="p-3 bg-gray-50 rounded-lg shrink-0 hidden sm:block">
            {isMaterial ? <Package className="w-6 h-6 text-gray-500" /> : <Wrench className="w-6 h-6 text-gray-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-500">{intake.roomCode}</span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">
                {isMaterial ? 'Room material intake' : 'Room maintenance intake'}
              </span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full border', urgency.color)}>
                <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
                {urgency.text}
              </span>
            </div>
            <h3 className="text-base font-semibold text-gray-900 truncate mb-2">{intake.title}</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span>{intake.roomName}</span>
              <span>•</span>
              <span>{intake.requesterName}</span>
              <PriorityBadge priority={intake.priority} />
            </div>
            {isMaterial && intake.items.length > 0 ? (
              <div className="mt-2 text-xs text-gray-500">
                {intake.items.length} dong vat tu
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-end">
          {!isMaterial ? (
            <button
              onClick={() => void handlePromoteMaintenance(intake.id)}
              disabled={isSubmittingReviewAction}
              className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Tao de nghi bao tri
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 relative pb-24 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cong viec can xu ly</h1>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Tong cong viec</div>
          <div className="text-2xl font-bold text-gray-900">{totalPending}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Cho phe duyet</div>
          <div className="text-2xl font-bold text-indigo-600">{approvalQueue.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Reviewer queue</div>
          <div className="text-2xl font-bold text-sky-600">{reviewerQueue.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Handoff dang mo</div>
          <div className="text-2xl font-bold text-emerald-600">{assignedHandoffs.length}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectAllApprovals}
            className="text-sm text-indigo-600 font-medium hover:text-indigo-700 px-2 py-1"
          >
            {selectedApprovalIds.size === quickApproveEligible.length ? 'Bo chon tat ca' : 'Chon tat ca'}
          </button>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter className="w-4 h-4" />
            <span>Lop cong viec hop nhat</span>
          </div>
        </div>

        <div className="flex items-center bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <ListIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'grouped' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
          <div className="space-y-3">
            <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />
            <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />
            <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />
          </div>
        </div>
      ) : totalPending === 0 ? (
        <EmptyState
          title="Khong co cong viec can xu ly"
          description="Tat ca de nghi, reviewer queue, va handoff hien tai deu da duoc xu ly."
        />
      ) : (
        <div className="space-y-8">
          {kttEscalationCandidates.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-orange-200">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-900">Can xem xet chuyen cap (CT HDQT)</h2>
                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {kttEscalationCandidates.length}
                </span>
              </div>
              <div className="space-y-3">
                {kttEscalationCandidates.map((request) => renderApprovalCard(request, true))}
              </div>
            </section>
          ) : null}

          {approvalQueue.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Hang cho phe duyet</h2>
                <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {approvalQueue.length}
                </span>
              </div>

              {viewMode === 'list' ? (
                <div className="space-y-3">
                  {regularApprovals.map((request) => renderApprovalCard(request))}
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(countsByType).map(([type, count]) => {
                    const requests = regularApprovals.filter((request) => request.type === type);
                    if (requests.length === 0) return null;

                    return (
                      <div key={type} className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                          {REQUEST_TYPES[type as RequestType]} ({count})
                        </h3>
                        {requests.map((request) => renderApprovalCard(request))}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          {reviewerQueue.length > 0 ? (
            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-sky-200">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-sky-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Reviewer queue</h2>
                  <span className="bg-sky-100 text-sky-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {reviewerQueue.length}
                  </span>
                </div>
                <button
                  onClick={() => void handleConsolidateMaterials()}
                  disabled={!materialSelectionIsCompatible || isSubmittingReviewAction}
                  className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Tong hop vat tu da chon
                </button>
              </div>
              {reviewActionError ? (
                <p className="text-sm text-rose-600">{reviewActionError}</p>
              ) : null}
              <div className="space-y-3">
                {reviewerQueue.map((intake) => renderReviewerCard(intake))}
              </div>
            </section>
          ) : null}

          {assignedHandoffs.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-emerald-200">
                <User className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg font-semibold text-gray-900">Cong viec duoc chuyen xu ly</h2>
                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {assignedHandoffs.length}
                </span>
              </div>
              <div className="space-y-3">
                {assignedHandoffs.map((handoff) => (
                  <div key={handoff.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">
                            {handoff.assigneeName || 'Nguoi xu ly'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {HANDOFF_STATUS_LABELS[handoff.status]}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          De nghi lien ket: {handoff.requestId}
                        </div>
                        {handoff.note ? (
                          <div className="text-sm text-gray-500 mt-1">{handoff.note}</div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        {handoff.status === 'pending' ? (
                          <button
                            onClick={() => void updateHandoffStatus(handoff.id, 'received')}
                            className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-sm font-medium transition-colors"
                          >
                            Tiep nhan
                          </button>
                        ) : null}
                        {handoff.status === 'received' ? (
                          <button
                            onClick={() => void updateHandoffStatus(handoff.id, 'completed')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-medium transition-colors"
                          >
                            Hoan thanh
                          </button>
                        ) : null}
                        <button
                          onClick={() => navigate(`/requests/${handoff.requestId}`)}
                          className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors"
                        >
                          Mo de nghi
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
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-40 animate-in slide-in-from-bottom-10">
          <span className="font-medium">Da chon {selectedApprovalIds.size}</span>
          <div className="w-px h-4 bg-gray-700" />
          <button
            onClick={() => setConfirmDialog({ isOpen: true, type: 'batch' })}
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            <Check className="w-5 h-5" />
            Duyet hang loat
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={confirmDialog?.isOpen || false}
        title={confirmDialog?.type === 'batch' ? 'Duyet hang loat' : 'Xac nhan phe duyet'}
        message={
          confirmDialog?.type === 'batch'
            ? `Ban co chac chan muon duyet ${selectedApprovalIds.size} de nghi da chon?`
            : 'Ban co chac chan muon phe duyet de nghi nay?'
        }
        confirmText="Dong y duyet"
        onConfirm={confirmApprove}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}
