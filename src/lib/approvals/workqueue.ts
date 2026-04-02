/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ApprovalStep } from '@/types/approval';
import type { Request, RequestHandoff } from '@/types/request';
import type { RoomWorkflowIntake } from '@/types/roomWorkflow';

export interface ApprovalQueueRequest extends Request {
  requiresManualForwardChoice: boolean;
}

export interface ApprovalWorkQueue {
  approvals: ApprovalQueueRequest[];
  reviewerIntakes: RoomWorkflowIntake[];
  handoffs: RequestHandoff[];
  totalCount: number;
}

interface BuildApprovalWorkQueueInput {
  approvals: Request[];
  reviewerIntakes: RoomWorkflowIntake[];
  handoffs: RequestHandoff[];
}

function getPendingStep(request: Request): ApprovalStep | undefined {
  return request.approvalSteps?.find((step) => step.status === 'pending');
}

export function requiresManualForwardChoice(request: Request): boolean {
  const pendingStep = getPendingStep(request);

  return Boolean(
    request.metadata?.workflowKind === 'room_maintenance' &&
      pendingStep?.approverRole === 'super_admin' &&
      (request.status === 'pending' || request.status === 'escalated'),
  );
}

export function buildApprovalWorkQueue(input: BuildApprovalWorkQueueInput): ApprovalWorkQueue {
  const approvals = input.approvals.map((request) => ({
    ...request,
    requiresManualForwardChoice: requiresManualForwardChoice(request),
  }));

  return {
    approvals,
    reviewerIntakes: input.reviewerIntakes,
    handoffs: input.handoffs,
    totalCount: approvals.length + input.reviewerIntakes.length + input.handoffs.length,
  };
}
