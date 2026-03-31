import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoleCatalog } from '@/contexts/RoleCatalogContext';
import { useRequests } from '@/viewmodels/useRequests';
import { useApprovals } from '@/viewmodels/useApprovals';
import { useAuth } from '@/contexts/AuthContext';
import { REQUEST_TYPES, COST_CENTERS } from '@/lib/constants';
import { APPROVER_ROLES } from '@/lib/role-access';
import { formatVND, formatDate, formatTimeAgo, cn } from '@/lib/utils';
import { StatusBadge, PriorityBadge } from '@/components/shared/Badges';
import { ArrowLeft, CheckCircle, XCircle, ArrowRightCircle, MessageSquare, User, Clock, Paperclip, FileText as FileTextIcon, Image, Download, File as FileIcon } from 'lucide-react';
import { getLeaveDates, LEAVE_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/request-helpers';
import { supabase } from '@/lib/supabase';

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRequest } = useRequests();
  const { user } = useAuth();
  const { getRoleLabel } = useRoleCatalog();
  const approvalEnabled = Boolean(user && APPROVER_ROLES.includes(user.role));
  const {
    regularApprovals,
    kttEscalationCandidates,
    approveRequest,
    rejectRequest,
    escalateRequest,
    isLoading: isApprovalsLoading,
    canTakeAction,
    getDelegatedActorName,
  } = useApprovals({ enabled: approvalEnabled });

  const approvalRequests = [...kttEscalationCandidates, ...regularApprovals];
  const request = getRequest(id || '') || approvalRequests.find((item) => item.id === id);
  const pendingStep = request?.approvalSteps?.find((step) => step.status === 'pending');
  const leaveDates = useMemo(() => (request ? getLeaveDates(request) : null), [request]);
  const delegatedActorName = request ? getDelegatedActorName(request) : null;

  const [comment, setComment] = useState('');
  const [showConfirm, setShowConfirm] = useState<'approve' | 'reject' | 'escalate' | null>(null);
  const [actionError, setActionError] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string | null>>({});

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
    return (
      <div className="text-center py-12 text-gray-500">
        Đang tải thông tin đề nghị...
      </div>
    );
  }

  if (!request || !user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Không tìm thấy đề nghị</h2>
        <button onClick={() => navigate('/requests')} className="mt-4 text-indigo-600 hover:underline">Quay lại danh sách</button>
      </div>
    );
  }

  const isCurrentApprover = canTakeAction(request);

  const handleAction = async (action: 'approve' | 'reject' | 'escalate') => {
    if ((action === 'reject' || action === 'escalate') && !comment.trim()) {
      setActionError('Vui lòng nhập lý do/ghi chú.');
      return;
    }

    setActionError('');
    setIsSubmittingAction(true);

    try {
      if (action === 'approve') {
        await approveRequest(request.id, comment);
      } else if (action === 'reject') {
        await rejectRequest(request.id, comment);
      } else {
        await escalateRequest(request.id, comment);
      }

      setShowConfirm(null);
      setComment('');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 md:pb-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2">
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

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 text-sm">
              <div>
                <dt className="text-gray-500 mb-1">Người tạo</dt>
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
                <dt className="text-gray-500 mb-1">Khoa/Phòng</dt>
                <dd className="font-medium text-gray-900">{request.department}</dd>
              </div>
              {request.totalAmount != null && (
                <div>
                  <dt className="text-gray-500 mb-1">Tổng tiền</dt>
                  <dd className="font-bold text-indigo-700 text-lg">{formatVND(request.totalAmount)}</dd>
                </div>
              )}
              {request.costCenter && (
                <div>
                  <dt className="text-gray-500 mb-1">Trung tâm chi phí</dt>
                  <dd className="font-medium text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm bg-slate-50 border border-slate-200">
                      {COST_CENTERS[request.costCenter as keyof typeof COST_CENTERS] || request.costCenter}
                    </span>
                  </dd>
                </div>
              )}
              {request.metadata?.beneficiary && (
                <div>
                  <dt className="text-gray-500 mb-1">Thụ hưởng</dt>
                  <dd className="font-medium text-gray-900">{request.metadata.beneficiary}</dd>
                </div>
              )}
              {request.metadata?.method && (
                <div>
                  <dt className="text-gray-500 mb-1">Hình thức</dt>
                  <dd className="font-medium text-gray-900">
                    {PAYMENT_METHOD_LABELS[request.metadata.method] || request.metadata.method}
                  </dd>
                </div>
              )}
              {request.metadata?.expectedDate && (
                <div>
                  <dt className="text-gray-500 mb-1">Ngày hoàn ứng dự kiến</dt>
                  <dd className="font-medium text-gray-900">{request.metadata.expectedDate}</dd>
                </div>
              )}
              {leaveDates && (
                <div>
                  <dt className="text-gray-500 mb-1">Thời gian nghỉ</dt>
                  <dd className="font-medium text-gray-900">{leaveDates.startDate} đến {leaveDates.endDate}</dd>
                </div>
              )}
              {request.metadata?.leaveType && (
                <div>
                  <dt className="text-gray-500 mb-1">Loại nghỉ</dt>
                  <dd className="font-medium text-gray-900">
                    {LEAVE_TYPE_LABELS[request.metadata.leaveType] || request.metadata.leaveType}
                  </dd>
                </div>
              )}
              <div className="sm:col-span-2">
                <dt className="text-gray-500 mb-1">Mô tả chi tiết</dt>
                <dd className="font-medium text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-100">
                  {request.description || 'Không có mô tả'}
                </dd>
              </div>
              {request.metadata?.items && request.metadata.items.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-gray-500 mb-2">Danh sách vật tư</dt>
                  <dd className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Tên</th>
                          <th className="px-3 py-2 text-left font-medium">SL</th>
                          <th className="px-3 py-2 text-left font-medium">ĐVT</th>
                          {request.type === 'purchase' && (
                            <th className="px-3 py-2 text-left font-medium">Đơn giá</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {request.metadata.items.map((item, index) => (
                          <tr key={`${item.name}-${index}`} className="border-t border-gray-100">
                            <td className="px-3 py-2">{item.name}</td>
                            <td className="px-3 py-2">{item.qty}</td>
                            <td className="px-3 py-2">{item.unit || '-'}</td>
                            {request.type === 'purchase' && (
                              <td className="px-3 py-2">{item.price != null ? formatVND(item.price) : '-'}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {request.attachments && request.attachments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-gray-500" />
                Tệp đính kèm ({request.attachments.length})
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
                        "flex items-center gap-3 p-3 rounded-lg border border-gray-100 transition-colors group",
                        attachmentUrl ? "hover:bg-gray-50" : "opacity-60 pointer-events-none",
                      )}
                    >
                      <AttachmentIcon className="w-5 h-5 shrink-0 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600">{attachment.fileName}</p>
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
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Tiến trình phê duyệt</h3>

            <div className="space-y-6">
              <div className="relative flex gap-4">
                <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-indigo-200"></div>
                <div className="relative z-10 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 ring-4 ring-white">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Tạo đề nghị</p>
                  <p className="text-xs text-gray-500 mt-0.5">{request.requesterName} • {formatDate(request.createdAt)}</p>
                </div>
              </div>

              {request.approvalSteps.map((step, index) => {
                const isLast = index === request.approvalSteps.length - 1;

                let icon = <Clock className="w-4 h-4" />;
                let bgColor = "bg-gray-100 text-gray-400";
                let lineColor = "bg-gray-200";

                if (step.status === 'approved') {
                  icon = <CheckCircle className="w-4 h-4" />;
                  bgColor = "bg-emerald-100 text-emerald-600";
                  lineColor = "bg-emerald-200";
                } else if (step.status === 'rejected') {
                  icon = <XCircle className="w-4 h-4" />;
                  bgColor = "bg-red-100 text-red-600";
                } else if (step.status === 'forwarded') {
                  icon = <ArrowRightCircle className="w-4 h-4" />;
                  bgColor = "bg-purple-100 text-purple-600";
                  lineColor = "bg-purple-200";
                } else if (step.status === 'pending') {
                  bgColor = "bg-amber-100 text-amber-600 ring-amber-50";
                }

                return (
                  <div key={step.id} className="relative flex gap-4">
                    {!isLast && <div className={cn("absolute left-4 top-8 bottom-[-24px] w-px", lineColor)}></div>}
                    <div className={cn("relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white", bgColor)}>
                      {icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {getRoleLabel(step.approverRole)}
                      </p>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {step.approverName ? step.approverName : 'Chờ duyệt'}
                        {step.actedAt && ` • ${formatDate(step.actedAt)}`}
                      </div>
                      {step.comment && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-700 flex gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <p>{step.comment}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {isCurrentApprover && (
        <div className="fixed bottom-0 inset-x-0 md:left-[var(--sidebar-width)] bg-white border-t border-gray-200 p-4 shadow-lg z-30 pb-safe">
          <div className="max-w-4xl mx-auto space-y-3">
            {delegatedActorName && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Bạn đang xử lý theo ủy quyền của {delegatedActorName}.
              </p>
            )}

            {!showConfirm ? (
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setActionError('');
                    setShowConfirm('reject');
                  }}
                  className="px-6 py-2.5 rounded-lg font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  Từ chối
                </button>
                {user.role === 'accountant' && ['payment', 'advance', 'purchase'].includes(request.type) && (
                  <button
                    onClick={() => {
                      setActionError('');
                      setShowConfirm('escalate');
                    }}
                    className="px-6 py-2.5 rounded-lg font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                  >
                    Chuyển CT HĐQT
                  </button>
                )}
                <button
                  onClick={() => {
                    setActionError('');
                    setShowConfirm('approve');
                  }}
                  className="px-6 py-2.5 rounded-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" /> Phê duyệt
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                <h4 className="font-medium text-gray-900">
                  {showConfirm === 'approve' ? 'Xác nhận phê duyệt' : showConfirm === 'reject' ? 'Lý do từ chối' : 'Ghi chú chuyển cấp'}
                </h4>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder={showConfirm === 'approve' ? "Ghi chú (không bắt buộc)..." : "Nhập lý do (bắt buộc)..."}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  rows={2}
                  autoFocus
                />
                {actionError && (
                  <p className="text-sm text-rose-600">{actionError}</p>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setActionError('');
                      setShowConfirm(null);
                    }}
                    disabled={isSubmittingAction}
                    className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => handleAction(showConfirm)}
                    disabled={isSubmittingAction}
                    className={cn(
                      "px-6 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                      showConfirm === 'approve' ? "bg-emerald-600 hover:bg-emerald-700" :
                        showConfirm === 'reject' ? "bg-red-600 hover:bg-red-700" :
                          "bg-purple-600 hover:bg-purple-700",
                    )}
                  >
                    {isSubmittingAction ? 'Đang xử lý...' : 'Xác nhận'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
