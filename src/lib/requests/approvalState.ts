/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * approvalState — pure, testable predicates for the "fully approved" state.
 *
 * This is the SINGLE render gate for the con dấu đỏ (SealMark). It is used by
 * the request detail view and the print/export view so both agree on when a
 * request has completed its approval workflow. No supabase, no viewmodels.
 */

import type { Request } from '@/types/request';
import type { ApprovalStep } from '@/types/approval';

/**
 * A request is fully approved when:
 *  - its status is `approved` or `completed`, AND
 *  - it has at least one approval step, AND
 *  - no step is still `pending` and none is `rejected`.
 *
 * `forwarded` history steps are allowed (escalated-then-approved chains).
 */
export function isFullyApproved(request: Request | null | undefined): boolean {
  if (!request) return false;

  const statusOk = request.status === 'approved' || request.status === 'completed';
  if (!statusOk) return false;

  const steps = request.approvalSteps;
  if (!steps || steps.length === 0) return false;

  return steps.every((step) => step.status !== 'pending' && step.status !== 'rejected');
}

/**
 * The final approver = the highest-`stepOrder` `approved` step that has an
 * `actedAt` timestamp. Returns null when no such step exists (e.g. the request
 * is not fully approved). Callers resolve the display role label via the role
 * catalog; this helper stays pure over the request object only.
 */
export function getFinalApprover(request: Request | null | undefined): ApprovalStep | null {
  if (!request?.approvalSteps?.length) return null;

  const approvedActed = request.approvalSteps.filter(
    (step) => step.status === 'approved' && Boolean(step.actedAt),
  );
  if (approvedActed.length === 0) return null;

  return approvedActed.reduce((best, step) => (step.stepOrder > best.stepOrder ? step : best));
}
