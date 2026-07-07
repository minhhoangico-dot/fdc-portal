/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * RequestPrintPage — clean document / export view of a single request, following
 * VN paperwork grammar: title block, body, then the con dấu đỏ (SealMark) at the
 * bottom-right. The seal renders ONLY when the request is fully approved
 * (isFullyApproved) — never on a pending/rejected document, never in a list.
 *
 * Works on screen and under `@media print`; the screen-only toolbar is hidden
 * when printing.
 */

import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useRoleCatalog } from '@/contexts/RoleCatalogContext';
import { useRequests } from '@/viewmodels/useRequests';
import { REQUEST_TYPES, COST_CENTERS } from '@/lib/constants';
import { getLeaveDates, LEAVE_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/request-helpers';
import { isFullyApproved, getFinalApprover } from '@/lib/requests/approvalState';
import { SealMark } from '@/ui/SealMark';
import { formatDate, formatVND } from '@/lib/utils';

const PRINT_STYLE = `
@media print {
  .print-hidden { display: none !important; }
  .print-sheet { box-shadow: none !important; border: none !important; margin: 0 !important; }
  @page { margin: 16mm; }
}
`;

export default function RequestPrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRequest, requests } = useRequests();
  const { getRoleLabel } = useRoleCatalog();

  const request = getRequest(id || '');

  if (!request) {
    // requests load asynchronously; distinguish "still loading" from "not found".
    if (requests.length === 0) {
      return <div className="py-12 text-center text-gray-500">Đang tải tài liệu...</div>;
    }
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Không tìm thấy đề nghị</h2>
        <button
          onClick={() => navigate('/requests')}
          className="mt-4 text-indigo-600 hover:underline"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const fullyApproved = isFullyApproved(request);
  const finalApprover = fullyApproved ? getFinalApprover(request) : null;
  const leaveDates = getLeaveDates(request);

  return (
    <div className="mx-auto max-w-3xl py-6">
      <style>{PRINT_STYLE}</style>

      {/* Screen-only toolbar */}
      <div className="print-hidden mb-4 flex items-center justify-between gap-4">
        <button
          onClick={() => navigate(`/requests/${request.id}`)}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Printer className="h-4 w-4" /> In tài liệu
        </button>
      </div>

      {/* The document sheet */}
      <div className="print-sheet rounded-xl border border-gray-200 bg-white p-8 shadow-sm sm:p-12">
        <header className="border-b border-gray-200 pb-6 text-center">
          <h1 className="text-xl font-bold uppercase tracking-wide text-gray-900">
            {REQUEST_TYPES[request.type]}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Số: {request.requestNumber}</p>
        </header>

        <section className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">{request.title}</h2>

          <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Người tạo</dt>
              <dd className="mt-0.5 font-medium text-gray-900">{request.requesterName || '-'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Khoa/Phòng</dt>
              <dd className="mt-0.5 font-medium text-gray-900">{request.department}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Ngày tạo</dt>
              <dd className="mt-0.5 font-medium text-gray-900">{formatDate(request.createdAt)}</dd>
            </div>
            {request.totalAmount != null ? (
              <div>
                <dt className="text-gray-500">Tổng tiền</dt>
                <dd className="mt-0.5 font-bold text-gray-900">{formatVND(request.totalAmount)}</dd>
              </div>
            ) : null}
            {request.costCenter ? (
              <div>
                <dt className="text-gray-500">Trung tâm chi phí</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {COST_CENTERS[request.costCenter as keyof typeof COST_CENTERS] || request.costCenter}
                </dd>
              </div>
            ) : null}
            {request.metadata?.beneficiary ? (
              <div>
                <dt className="text-gray-500">Thụ hưởng</dt>
                <dd className="mt-0.5 font-medium text-gray-900">{request.metadata.beneficiary}</dd>
              </div>
            ) : null}
            {request.metadata?.method ? (
              <div>
                <dt className="text-gray-500">Hình thức</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {PAYMENT_METHOD_LABELS[request.metadata.method] || request.metadata.method}
                </dd>
              </div>
            ) : null}
            {leaveDates ? (
              <div>
                <dt className="text-gray-500">Thời gian nghỉ</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {leaveDates.startDate} đến {leaveDates.endDate}
                </dd>
              </div>
            ) : null}
            {request.metadata?.leaveType ? (
              <div>
                <dt className="text-gray-500">Loại nghỉ</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {LEAVE_TYPE_LABELS[request.metadata.leaveType] || request.metadata.leaveType}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-6">
            <dt className="text-sm text-gray-500">Mô tả chi tiết</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-gray-900">
              {request.description || 'Không có mô tả'}
            </dd>
          </div>

          {request.metadata?.items && request.metadata.items.length > 0 ? (
            <div className="mt-6">
              <dt className="mb-2 text-sm text-gray-500">Danh sách vật tư</dt>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-y border-gray-300 text-left text-gray-600">
                    <th className="py-2 pr-3 font-medium">Tên</th>
                    <th className="py-2 pr-3 font-medium">SL</th>
                    <th className="py-2 pr-3 font-medium">ĐVT</th>
                    {request.type === 'purchase' ? (
                      <th className="py-2 font-medium">Đơn giá</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {request.metadata.items.map((item, index) => (
                    <tr key={`${item.name}-${index}`} className="border-b border-gray-200">
                      <td className="py-2 pr-3">{item.name}</td>
                      <td className="py-2 pr-3">{item.qty}</td>
                      <td className="py-2 pr-3">{item.unit || '-'}</td>
                      {request.type === 'purchase' ? (
                        <td className="py-2">{item.price != null ? formatVND(item.price) : '-'}</td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        {/* Approval trail summary */}
        {request.approvalSteps.length > 0 ? (
          <section className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900">Tiến trình phê duyệt</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {request.approvalSteps.map((step) => (
                <li key={step.id} className="flex flex-wrap items-baseline gap-x-2 text-gray-700">
                  <span className="font-medium text-gray-900">{getRoleLabel(step.approverRole)}</span>
                  <span className="text-gray-500">— {step.approverName || 'Chờ duyệt'}</span>
                  {step.actedAt ? (
                    <span className="text-gray-400">· {formatDate(step.actedAt)}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Con dấu đỏ — bottom-right, only when fully approved */}
        <div className="mt-10 flex min-h-[9rem] items-end justify-end">
          {fullyApproved && finalApprover ? (
            <SealMark
              approverName={finalApprover.approverName || getRoleLabel(finalApprover.approverRole)}
              roleLabel={finalApprover.approverName ? getRoleLabel(finalApprover.approverRole) : undefined}
              date={finalApprover.actedAt ? formatDate(finalApprover.actedAt) : formatDate(request.updatedAt)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
