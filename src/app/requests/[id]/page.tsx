/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRightCircle,
  CheckCircle,
  Clock,
  Download,
  File as FileIcon,
  FileText as FileTextIcon,
  Image,
  MessageSquare,
  Paperclip,
  User,
  XCircle,
} from 'lucide-react';
import { useRoleCatalog } from '@/contexts/RoleCatalogContext';
import { useRequests } from '@/viewmodels/useRequests';
import { useApprovals } from '@/viewmodels/useApprovals';
import { useAuth } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/access';
import { REQUEST_TYPES, COST_CENTERS } from '@/lib/constants';
import { getLeaveDates, LEAVE_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/request-helpers';
import { supabase } from '@/lib/supabase';
import { StatusBadge, PriorityBadge } from '@/components/shared/Badges';
import { requiresManualForwardChoice } from '@/lib/approvals/workqueue';
import { formatDate, formatTimeAgo, formatVND, cn } from '@/lib/utils';

const HANDOFF_STATUS_STYLES = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  received: 'border-sky-200 bg-sky-50 text-sky-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
} as const;

const HANDOFF_STATUS_LABELS = {
  pending: 'Cho tiep nhan',
  received: 'Da tiep nhan',
  completed: 'Hoan thanh',
  cancelled: 'Da huy',
} as const;

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRequest } = useRequests();
  const { user } = useAuth();
  const { getRoleLabel } = useRoleCatalog();
  const approvalEnabled = Boolean(
    user &&
      (can(user.role, 'approvals.review_assigned') ||
        can(user.role, 'approvals.receive_handoff') ||
        can(user.role, 'approvals.forward_manual')),
  );
  const {
    regularApprovals,
    kttEscalationCandidates,
    approveRequest,
    rejectRequest,
    escalateRequest,
    handoffTargets,
    isLoading: isApprovalsLoading,
    canTakeAction,
    getDelegatedActorName,
  } = useApprovals({ enabled: approvalEnabled });

  const approvalRequests = [...kttEscalationCandidates, ...regularApprovals];
  const request = getRequest(id || '') || approvalRequests.find((item) => item.id === id);
  const pendingStep = request?.approvalSteps?.find((step) => step.status === 'pending');
  const leaveDates = useMemo(() => (request ? getLeaveDates(request) : null), [request]);
  const delegatedActorName = request ? getDelegatedActorName(request) : null;
  const requiresManualForward = Boolean(
    request &&
      user &&
      can(user.role, 'approvals.forward_manual') &&
      requiresManualForwardChoice(request),
  );

  const [comment, setComment] = useState('');
  const [showConfirm, setShowConfirm] = useState<'approve' | 'reject' | 'escalate' | null>(null);
  const [actionError, setActionError] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string | null>>({});
  const [selectedHandoffTargetId, setSelectedHandoffTargetId] = useState('');

  const selectedHandoffTarget = handoffTargets.find((target) => target.id === selectedHandoffTargetId);

  useEffect(() => {
    if (!request?.attachments?.length) {
      setAttachmentUrls({});
      return;
    }

    let isMounted = true;

    supabase.storage
      .from('request-attachments')
      .createSignedUrls(
        request.attachments.map((attachment) => attachment.storagePath),
        3600,
      )
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to create signed URLs for attachments:', error);
          return;
        }

        if (!isMounted || !data) return;

        const nextUrls: Record<string, string | null> = {};
        request.attachments.forEach((attachment) => {
          const match = data.find((item) => item.path === attachment.storagePath);
          nextUrls[attachment.id] = match?.signedUrl || null;
        });
        setAttachmentUrls(nextUrls);
      });

    return () => {
      isMounted = false;
    };
  }, [request?.id, request?.attachments]);

  if (!request && approvalEnabled && isApprovalsLoading) {
    return <div className="py-12 text-center text-gray-500">Dang tai thong tin de nghi...</div>;
  }

  if (!request || !user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Khong tim thay de nghi</h2>
        <button
          onClick={() => navigate('/requests')}
          className="mt-4 text-indigo-600 hover:underline"
        >
          Quay lai danh sach
        </button>
      </div>
    );
  }

  const isCurrentApprover = canTakeAction(request);

  const handleAction = async (action: 'approve' | 'reject' | 'escalate') => {
    if ((action === 'reject' || action === 'escalate') && !comment.trim()) {
      setActionError('Vui long nhap ly do/ghi chu.');
      return;
    }

    if (action === 'approve' && requiresManualForward && !selectedHandoffTarget) {
      setActionError('Vui long chon nguoi duoc chuyen xu ly.');
      return;
    }

    setActionError('');
    setIsSubmittingAction(true);

    try {
      if (action === 'approve') {
        await approveRequest(request.id, comment, selectedHandoffTarget
          ? {
              handoffAssigneeId: selectedHandoffTarget.id,
              handoffAssigneeRole: selectedHandoffTarget.role,
            }
          : undefined);
      } else if (action === 'reject') {
        await rejectRequest(request.id, comment);
      } else {
        await escalateRequest(request.id, comment);
      }

      setShowConfirm(null);
      setComment('');
      setSelectedHandoffTargetId('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Khong the xu ly yeu cau nay.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 md:pb-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-500">{request.requestNumber}</span>
            <span className="text-sm text-gray-400">•</span>
            <span className="text-sm text-gray-500">{REQUEST_TYPES[request.type]}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-gray-100">
              <StatusBadge status={request.status} className="text-sm px-3 py-1" />
              <PriorityBadge priority={request.priority} className="text-sm px-3 py-1" />
              <span className="text-sm text-gray-500 flex items-center gap-1 ml-auto">
                <Clock className="w-4 h-4" /> {formatTimeAgo(request.createdAt)}
              </span>
            </div>

            {request.metadata?.originModule === 'room_management' && (
              <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center rounded-full border border-indigo-200 bg-white px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    Room Management
                  </span>
                  {request.metadata.workflowKind ? (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {request.metadata.workflowKind === 'room_material' ? 'Material workflow' : 'Maintenance workflow'}
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500 mb-1">Phong</div>
                    <div className="font-medium text-gray-900">
                      {[request.metadata.roomCode, request.metadata.roomName].filter(Boolean).join(' - ') || 'Khong ro'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Tang</div>
                    <div className="font-medium text-gray-900">{request.metadata.floor || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">So intake lien ket</div>
                    <div className="font-medium text-gray-900">{request.metadata.sourceIntakeIds?.length || 0}</div>
                  </div>
                </div>
              </div>
            )}

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 text-sm">
              <div>
                <dt className="text-gray-500 mb-1">Nguoi tao</dt>
                <dd className="flex items-center gap-2">
                  {request.requesterAvatar ? (
                    <img src={request.requesterAvatar} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-3 h-3 text-gray-400" />
                    </div>
                  )}
                  <span className="font-medium text-gray-900">{request.requesterName}</span>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-1">Khoa/Phong</dt>
                <dd className="font-medium text-gray-900">{request.department}</dd>
              </div>
              {request.totalAmount != null ? (
                <div>
                  <dt className="text-gray-500 mb-1">Tong tien</dt>
                  <dd className="font-bold text-indigo-700 text-lg">{formatVND(request.totalAmount)}</dd>
                </div>
              ) : null}
              {request.costCenter ? (
                <div>
                  <dt className="text-gray-500 mb-1">Trung tam chi phi</dt>
                  <dd className="font-medium text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm bg-slate-50 border border-slate-200">
                      {COST_CENTERS[request.costCenter as keyof typeof COST_CENTERS] || request.costCenter}
                    </span>
                  </dd>
                </div>
              ) : null}
              {request.metadata?.beneficiary ? (
                <div>
                  <dt className="text-gray-500 mb-1">Thu huong</dt>
                  <dd className="font-medium text-gray-900">{request.metadata.beneficiary}</dd>
                </div>
              ) : null}
              {request.metadata?.method ? (
                <div>
                  <dt className="text-gray-500 mb-1">Hinh thuc</dt>
                  <dd className="font-medium text-gray-900">
                    {PAYMENT_METHOD_LABELS[request.metadata.method] || request.metadata.method}
                  </dd>
                </div>
              ) : null}
              {request.metadata?.expectedDate ? (
                <div>
                  <dt className="text-gray-500 mb-1">Ngay hoan ung du kien</dt>
                  <dd className="font-medium text-gray-900">{request.metadata.expectedDate}</dd>
                </div>
              ) : null}
              {leaveDates ? (
                <div>
                  <dt className="text-gray-500 mb-1">Thoi gian nghi</dt>
                  <dd className="font-medium text-gray-900">
                    {leaveDates.startDate} den {leaveDates.endDate}
                  </dd>
                </div>
              ) : null}
              {request.metadata?.leaveType ? (
                <div>
                  <dt className="text-gray-500 mb-1">Loai nghi</dt>
                  <dd className="font-medium text-gray-900">
                    {LEAVE_TYPE_LABELS[request.metadata.leaveType] || request.metadata.leaveType}
                  </dd>
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <dt className="text-gray-500 mb-1">Mo ta chi tiet</dt>
                <dd className="font-medium text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-100">
                  {request.description || 'Khong co mo ta'}
                </dd>
              </div>
              {request.metadata?.items && request.metadata.items.length > 0 ? (
                <div className="sm:col-span-2">
                  <dt className="text-gray-500 mb-2">Danh sach vat tu</dt>
                  <dd className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Ten</th>
                          <th className="px-3 py-2 text-left font-medium">SL</th>
                          <th className="px-3 py-2 text-left font-medium">DVT</th>
                          {request.type === 'purchase' ? (
                            <th className="px-3 py-2 text-left font-medium">Don gia</th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody>
                        {request.metadata.items.map((item, index) => (
                          <tr key={`${item.name}-${index}`} className="border-t border-gray-100">
                            <td className="px-3 py-2">{item.name}</td>
                            <td className="px-3 py-2">{item.qty}</td>
                            <td className="px-3 py-2">{item.unit || '-'}</td>
                            {request.type === 'purchase' ? (
                              <td className="px-3 py-2">
                                {item.price != null ? formatVND(item.price) : '-'}
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          {request.attachments && request.attachments.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-gray-500" />
                Tep dinh kem ({request.attachments.length})
              </h3>
              <div className="space-y-2">
                {request.attachments.map((attachment) => {
                  const isImage = attachment.mimeType.startsWith('image/');
                  const isPdf = attachment.mimeType === 'application/pdf';
                  const AttachmentIcon = isImage ? Image : isPdf ? FileTextIcon : FileIcon;
                  const attachmentUrl = attachmentUrls[attachment.id];

                  return (
                    <a
                      key={attachment.id}
                      href={attachmentUrl || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-disabled={!attachmentUrl}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border border-gray-100 transition-colors group',
                        attachmentUrl ? 'hover:bg-gray-50' : 'opacity-60 pointer-events-none',
                      )}
                    >
                      <AttachmentIcon className="w-5 h-5 shrink-0 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600">
                          {attachment.fileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {attachment.fileSize < 1024 * 1024
                            ? `${(attachment.fileSize / 1024).toFixed(1)} KB`
                            : `${(attachment.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                        </p>
                      </div>
                      <Download className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 shrink-0" />
                    </a>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Tien trinh phe duyet</h3>

            <div className="space-y-6">
              <div className="relative flex gap-4">
                <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-indigo-200"></div>
                <div className="relative z-10 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 ring-4 ring-white">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Tao de nghi</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {request.requesterName} • {formatDate(request.createdAt)}
                  </p>
                </div>
              </div>

              {request.approvalSteps.map((step, index) => {
                const isLast = index === request.approvalSteps.length - 1;

                let icon = <Clock className="w-4 h-4" />;
                let bgColor = 'bg-gray-100 text-gray-400';
                let lineColor = 'bg-gray-200';

                if (step.status === 'approved') {
                  icon = <CheckCircle className="w-4 h-4" />;
                  bgColor = 'bg-emerald-100 text-emerald-600';
                  lineColor = 'bg-emerald-200';
                } else if (step.status === 'rejected') {
                  icon = <XCircle className="w-4 h-4" />;
                  bgColor = 'bg-red-100 text-red-600';
                } else if (step.status === 'forwarded') {
                  icon = <ArrowRightCircle className="w-4 h-4" />;
                  bgColor = 'bg-purple-100 text-purple-600';
                  lineColor = 'bg-purple-200';
                } else if (step.status === 'pending') {
                  bgColor = 'bg-amber-100 text-amber-600 ring-amber-50';
                }

                return (
                  <div key={step.id} className="relative flex gap-4">
                    {!isLast ? (
                      <div className={cn('absolute left-4 top-8 bottom-[-24px] w-px', lineColor)}></div>
                    ) : null}
                    <div className={cn('relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white', bgColor)}>
                      {icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{getRoleLabel(step.approverRole)}</p>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {step.approverName || 'Cho duyet'}
                        {step.actedAt ? ` • ${formatDate(step.actedAt)}` : ''}
                      </div>
                      {step.comment ? (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-700 flex gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <p>{step.comment}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {request.handoffs && request.handoffs.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Chuyen xu ly tiep theo</h3>
              <div className="space-y-3">
                {request.handoffs.map((handoff) => (
                  <div key={handoff.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {handoff.assigneeName || 'Nguoi xu ly'}
                      </span>
                      <span className="text-xs text-gray-500">({getRoleLabel(handoff.assigneeRole)})</span>
                      <span
                        className={cn(
                          'ml-auto inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                          HANDOFF_STATUS_STYLES[handoff.status],
                        )}
                      >
                        {HANDOFF_STATUS_LABELS[handoff.status]}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Tao luc {formatDate(handoff.createdAt)}
                      {handoff.assignedByName ? ` • Chuyen boi ${handoff.assignedByName}` : ''}
                    </div>
                    {handoff.note ? (
                      <p className="mt-2 text-sm text-gray-700">{handoff.note}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {isCurrentApprover ? (
        <div className="fixed bottom-0 inset-x-0 md:left-[var(--sidebar-width)] bg-white border-t border-gray-200 p-4 shadow-lg z-30 pb-safe">
          <div className="max-w-5xl mx-auto space-y-3">
            {delegatedActorName ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Ban dang xu ly theo uy quyen cua {delegatedActorName}.
              </p>
            ) : null}

            {!showConfirm ? (
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setActionError('');
                    setShowConfirm('reject');
                  }}
                  className="px-6 py-2.5 rounded-lg font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  Tu choi
                </button>
                {user.role === 'accountant' && ['payment', 'advance', 'purchase'].includes(request.type) ? (
                  <button
                    onClick={() => {
                      setActionError('');
                      setShowConfirm('escalate');
                    }}
                    className="px-6 py-2.5 rounded-lg font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                  >
                    Chuyen CT HDQT
                  </button>
                ) : null}
                <button
                  onClick={() => {
                    setActionError('');
                    setShowConfirm('approve');
                  }}
                  className="px-6 py-2.5 rounded-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" /> Phe duyet
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                <h4 className="font-medium text-gray-900">
                  {showConfirm === 'approve'
                    ? 'Xac nhan phe duyet'
                    : showConfirm === 'reject'
                      ? 'Ly do tu choi'
                      : 'Ghi chu chuyen cap'}
                </h4>

                {showConfirm === 'approve' && requiresManualForward ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Nguoi duoc chuyen xu ly sau phe duyet
                    </label>
                    <select
                      value={selectedHandoffTargetId}
                      onChange={(event) => setSelectedHandoffTargetId(event.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="">Chon nguoi xu ly</option>
                      {handoffTargets.map((target) => (
                        <option key={target.id} value={target.id}>
                          {target.name} - {getRoleLabel(target.role)}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">
                      Room maintenance can duoc KTT phe duyet va chon nguoi xu ly cu the.
                    </p>
                  </div>
                ) : null}

                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={
                    showConfirm === 'approve'
                      ? 'Ghi chu (khong bat buoc)...'
                      : 'Nhap ly do (bat buoc)...'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  rows={2}
                  autoFocus
                />

                {actionError ? <p className="text-sm text-rose-600">{actionError}</p> : null}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setActionError('');
                      setShowConfirm(null);
                    }}
                    disabled={isSubmittingAction}
                    className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Huy
                  </button>
                  <button
                    onClick={() => handleAction(showConfirm)}
                    disabled={isSubmittingAction}
                    className={cn(
                      'px-6 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                      showConfirm === 'approve'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : showConfirm === 'reject'
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-purple-600 hover:bg-purple-700',
                    )}
                  >
                    {isSubmittingAction ? 'Dang xu ly...' : 'Xac nhan'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
