/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildApprovalWorkQueue,
  requiresManualForwardChoice,
} from '@/lib/approvals/workqueue';
import { can } from '@/lib/permissions/access';
import { ActiveDelegation, findActiveDelegation, resolveEffectiveApproverId } from '@/lib/delegations';
import { aggregateRoomIntakeItems, buildMaterialConsolidationPayload, mapRoomIntakeToWorkflowIntake } from '@/lib/room-management/workflow';
import { mapRequestRecord } from '@/lib/request-helpers';
import { supabase } from '@/lib/supabase';
import type { ApprovalStep } from '@/types/approval';
import type { Request, RequestHandoff } from '@/types/request';
import type {
  MaterialConsolidationInput,
  RoomReviewerRole,
  RoomReviewGroup,
  RoomWorkflowIntake,
  RoomWorkflowMetadata,
} from '@/types/roomWorkflow';
import type { Role } from '@/types/user';

interface UseApprovalsOptions {
  enabled?: boolean;
}

interface RoomIntakeRow {
  id: string;
  room_key: string | null;
  room_code: string | null;
  room_name: string | null;
  floor: number | null;
  intake_type: 'material' | 'maintenance';
  title: string;
  description: string | null;
  priority: string | null;
  review_group: RoomReviewGroup | null;
  reviewer_role: RoomReviewerRole | null;
  requester_id: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
  metadata: Record<string, unknown> | null;
  requester?: {
    id: string;
    full_name: string | null;
    department_name?: string | null;
  } | null;
}

interface RoomIntakeItemRow {
  id: string;
  intake_id: string;
  item_name: string;
  quantity: number;
  unit: string;
}

interface HandoffTarget {
  id: string;
  name: string;
  role: Extract<Role, 'internal_accountant'>;
  department?: string;
  avatarUrl?: string | null;
}

interface ApprovalActionOptions {
  handoffAssigneeId?: string;
  handoffAssigneeRole?: Extract<Role, 'internal_accountant'>;
}

const ROOM_REVIEW_STATUSES = ['submitted', 'in_review'] as const;
const HANDOFF_OPEN_STATUSES = new Set<RequestHandoff['status']>(['pending', 'received']);

function getPendingStep(request: Request): ApprovalStep | undefined {
  return request.approvalSteps?.find((step) => step.status === 'pending');
}

function buildMaterialConsolidationTitle(intakes: RoomWorkflowIntake[]) {
  const roomCodes = Array.from(new Set(intakes.map((intake) => intake.roomCode).filter(Boolean)));
  if (roomCodes.length === 1) {
    return `Tong hop de xuat vat tu ${roomCodes[0]}`;
  }

  return `Tong hop de xuat vat tu ${roomCodes.length} phong`;
}

function buildMaterialConsolidationDescription(intakes: RoomWorkflowIntake[]) {
  return intakes
    .map((intake) => `${intake.roomCode}: ${intake.title}`)
    .join('\n');
}

function buildMaintenanceRequestTitle(intake: RoomWorkflowIntake) {
  return `[Bao tri] ${intake.roomCode} - ${intake.title}`;
}

function flattenRequestHandoffs(requests: Request[]) {
  const byId = new Map<string, RequestHandoff>();

  for (const request of requests) {
    for (const handoff of request.handoffs || []) {
      byId.set(handoff.id, handoff);
    }
  }

  return Array.from(byId.values()).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function useApprovals(options: UseApprovalsOptions = {}) {
  const { user } = useAuth();
  const enabled = options.enabled ?? true;
  const [requests, setRequests] = useState<Request[]>([]);
  const [reviewerIntakes, setReviewerIntakes] = useState<RoomWorkflowIntake[]>([]);
  const [handoffTargets, setHandoffTargets] = useState<HandoffTarget[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeDelegations, setActiveDelegations] = useState<ActiveDelegation[]>([]);
  const hasLoadedRef = useRef(false);

  const fetchApprovals = useCallback(async () => {
    if (!enabled || !user) return;
    if (!hasLoadedRef.current) setIsRefreshing(true);

    const [requestsResult, reviewerIntakesResult] = await Promise.all([
      supabase
        .from('fdc_approval_requests')
        .select(`
          *,
          requester:fdc_user_mapping!requester_id(id, full_name, email, role, department_name, avatar_url),
          approvalSteps:fdc_approval_steps(
            *,
            approver:fdc_user_mapping!approver_id(id, full_name, role, avatar_url)
          ),
          attachments:fdc_request_attachments(*),
          handoffs:fdc_request_handoffs(
            *,
            assignee:fdc_user_mapping!assignee_id(id, full_name, role, department_name, avatar_url),
            assignedBy:fdc_user_mapping!assigned_by(id, full_name, role)
          )
        `)
        .order('created_at', { ascending: false }),
      can(user.role, 'room_management.review_group_queue')
        ? supabase
            .from('fdc_room_intakes')
            .select(`
              *,
              requester:fdc_user_mapping!requester_id(id, full_name, department_name)
            `)
            .in('status', [...ROOM_REVIEW_STATUSES])
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (!requestsResult.error && requestsResult.data) {
      setRequests(requestsResult.data.map(mapRequestRecord));
    } else if (requestsResult.error) {
      console.error('Failed to fetch approvals:', requestsResult.error);
      setRequests([]);
    }

    if (!reviewerIntakesResult.error && reviewerIntakesResult.data) {
      const rows = reviewerIntakesResult.data as RoomIntakeRow[];
      const materialIntakeIds = rows
        .filter((row) => row.intake_type === 'material')
        .map((row) => row.id);

      let intakeItems: RoomIntakeItemRow[] = [];
      if (materialIntakeIds.length > 0) {
        const { data: itemRows, error: itemError } = await supabase
          .from('fdc_room_intake_items')
          .select('*')
          .in('intake_id', materialIntakeIds);

        if (itemError) {
          console.error('Failed to fetch room intake items:', itemError);
        } else {
          intakeItems = (itemRows || []) as RoomIntakeItemRow[];
        }
      }

      const itemsByIntakeId = new Map<string, RoomIntakeItemRow[]>();
      for (const item of intakeItems) {
        const current = itemsByIntakeId.get(item.intake_id) ?? [];
        current.push(item);
        itemsByIntakeId.set(item.intake_id, current);
      }

      setReviewerIntakes(
        rows.map((row) =>
          mapRoomIntakeToWorkflowIntake(
            {
              ...row,
              requester_name: row.requester?.full_name || null,
            },
            itemsByIntakeId.get(row.id) ?? [],
          ),
        ),
      );
    } else {
      setReviewerIntakes([]);
      if (reviewerIntakesResult.error) {
        console.error('Failed to fetch reviewer intakes:', reviewerIntakesResult.error);
      }
    }

    setIsRefreshing(false);
    setHasLoaded(true);
    hasLoadedRef.current = true;
  }, [enabled, user]);

  useEffect(() => {
    if (!enabled) {
      setRequests([]);
      setReviewerIntakes([]);
      setIsRefreshing(false);
      setHasLoaded(false);
      hasLoadedRef.current = false;
      return;
    }

    void fetchApprovals();

    const channel = supabase
      .channel('public:fdc_approvals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_approval_requests' }, () => {
        void fetchApprovals();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_approval_steps' }, () => {
        void fetchApprovals();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_request_attachments' }, () => {
        void fetchApprovals();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_request_handoffs' }, () => {
        void fetchApprovals();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_room_intakes' }, () => {
        void fetchApprovals();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_room_intake_items' }, () => {
        void fetchApprovals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, fetchApprovals]);

  useEffect(() => {
    if (!enabled || !user) {
      setActiveDelegations([]);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('fdc_delegations')
      .select('delegator_id, request_types')
      .eq('delegate_id', user.id)
      .lte('start_date', today)
      .gte('end_date', today)
      .then(({ data }) => {
        if (data) setActiveDelegations(data);
      });
  }, [enabled, user]);

  useEffect(() => {
    if (!enabled || !user || !can(user.role, 'approvals.forward_manual')) {
      setHandoffTargets([]);
      return;
    }

    supabase
      .from('fdc_user_mapping')
      .select('id, full_name, role, department_name, avatar_url')
      .in('role', ['internal_accountant'])
      .eq('is_active', true)
      .order('full_name', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load handoff targets:', error);
          setHandoffTargets([]);
          return;
        }

        setHandoffTargets(
          (data || []).map((row) => ({
            id: row.id,
            name: row.full_name,
            role: row.role,
            department: row.department_name || undefined,
            avatarUrl: row.avatar_url || null,
          })),
        );
      });
  }, [enabled, user]);

  const refresh = fetchApprovals;
  const isLoading = enabled && !hasLoaded;

  const canTakeAction = useCallback(
    (request: Request) => {
      if (!user) return false;

      const currentStep = getPendingStep(request);
      if (!currentStep) return false;

      if (user.role === 'super_admin') return true;
      if (currentStep.approverId === user.id) return true;
      if (!currentStep.approverId && currentStep.approverRole === user.role) return true;

      return Boolean(findActiveDelegation(activeDelegations, currentStep.approverId, request.type));
    },
    [activeDelegations, user],
  );

  const getDelegatedActorName = useCallback(
    (request: Request) => {
      const currentStep = getPendingStep(request);
      if (
        !currentStep ||
        !user ||
        currentStep.approverId === user.id ||
        user.role === 'super_admin'
      ) {
        return null;
      }

      const delegation = findActiveDelegation(activeDelegations, currentStep.approverId, request.type);
      return delegation ? currentStep.approverName || null : null;
    },
    [activeDelegations, user],
  );

  const pendingApprovals = useMemo(() => {
    if (!user || !can(user.role, 'approvals.review_assigned')) return [];

    return requests.filter((request) => {
      if (request.status !== 'pending' && request.status !== 'escalated') return false;
      return canTakeAction(request);
    });
  }, [canTakeAction, requests, user]);

  const reviewerQueue = useMemo(() => {
    if (!user || !can(user.role, 'room_management.review_group_queue')) return [];
    return reviewerIntakes;
  }, [reviewerIntakes, user]);

  const assignedHandoffs = useMemo(() => {
    if (!user || !can(user.role, 'approvals.receive_handoff')) return [];

    return flattenRequestHandoffs(requests).filter((handoff) => HANDOFF_OPEN_STATUSES.has(handoff.status));
  }, [requests, user]);

  const approvalWorkQueue = useMemo(
    () =>
      buildApprovalWorkQueue({
        approvals: pendingApprovals,
        reviewerIntakes: reviewerQueue,
        handoffs: assignedHandoffs,
      }),
    [assignedHandoffs, pendingApprovals, reviewerQueue],
  );

  const kttEscalationCandidates = useMemo(() => {
    if (!user || user.role !== 'accountant') return [];

    return pendingApprovals.filter((request) => {
      const isFinancial = ['payment', 'advance', 'purchase'].includes(request.type);
      const isHighValue = (request.totalAmount || 0) > 50000000;
      const currentStep = getPendingStep(request);

      return isFinancial && isHighValue && currentStep?.approverRole === 'super_admin';
    });
  }, [pendingApprovals, user]);

  const regularApprovals = useMemo(() => {
    const escalationIds = new Set(kttEscalationCandidates.map((request) => request.id));
    return pendingApprovals.filter((request) => !escalationIds.has(request.id));
  }, [kttEscalationCandidates, pendingApprovals]);

  const countsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    pendingApprovals.forEach((request) => {
      counts[request.type] = (counts[request.type] || 0) + 1;
    });
    return counts;
  }, [pendingApprovals]);

  const countsByUrgency = useMemo(() => {
    const counts = { normal: 0, warning: 0, critical: 0 };
    const now = Date.now();

    pendingApprovals.forEach((request) => {
      const hoursWaiting = (now - new Date(request.createdAt).getTime()) / (1000 * 60 * 60);

      if (hoursWaiting > 48) counts.critical += 1;
      else if (hoursWaiting > 24) counts.warning += 1;
      else counts.normal += 1;
    });

    return counts;
  }, [pendingApprovals]);

  const createHandoff = useCallback(
    async (
      request: Request,
      sourceStepId: string | undefined,
      assigneeId: string,
      assigneeRole: Extract<Role, 'internal_accountant'>,
      note?: string,
    ) => {
      if (!user) return;

      const { error } = await supabase.from('fdc_request_handoffs').insert({
        request_id: request.id,
        source_step_id: sourceStepId || null,
        assignee_id: assigneeId,
        assignee_role: assigneeRole,
        assigned_by: user.id,
        status: 'pending',
        note: note || null,
        metadata: {
          workflowKind: request.metadata?.workflowKind || null,
          roomCode: request.metadata?.roomCode || null,
          roomName: request.metadata?.roomName || null,
          originModule: request.metadata?.originModule || null,
        },
      });

      if (error) throw error;

      await supabase.from('fdc_notifications').insert({
        recipient_id: assigneeId,
        type: 'approval',
        title: 'Cong viec moi duoc chuyen xu ly',
        body: `De nghi ${request.requestNumber} da duoc chuyen den ban.`,
        data: { linkTo: `/requests/${request.id}` },
      });
    },
    [user],
  );

  const updateStepStatus = async (
    id: string,
    action: 'approved' | 'rejected' | 'forwarded',
    note?: string,
    escalateTo?: string,
    options?: ApprovalActionOptions,
  ) => {
    const request = requests.find((item) => item.id === id);
    if (!request || !user) return;
    if (!canTakeAction(request)) return;

    const currentStep = getPendingStep(request);
    if (!currentStep) return;

    if (
      action === 'approved' &&
      requiresManualForwardChoice(request) &&
      (!options?.handoffAssigneeId || !options?.handoffAssigneeRole)
    ) {
      throw new Error('Chief accountant approval for maintenance requires a handoff assignee.');
    }

    const delegatedBy = findActiveDelegation(activeDelegations, currentStep.approverId, request.type)
      ? currentStep.approverId || null
      : null;

    const { error: stepError } = await supabase
      .from('fdc_approval_steps')
      .update({
        status: action,
        comment: note,
        acted_at: new Date().toISOString(),
        delegated_from: delegatedBy,
      })
      .eq('id', currentStep.id);

    if (stepError) {
      console.error('Failed to update step', stepError);
      return;
    }

    await supabase.from('fdc_audit_log').insert({
      user_id: user.id,
      action,
      entity_type: 'approval_step',
      entity_id: currentStep.id,
      new_value: {
        request_id: request.id,
        request_number: request.requestNumber,
        step_order: currentStep.stepOrder,
        status: action,
        comment: note || null,
        delegated_from: delegatedBy,
      },
    }).then(({ error }) => {
      if (error) console.error('Failed to write audit log', error);
    });

    let nextRequestStatus: Request['status'] = 'pending';
    let escalateApproverId: string | undefined;

    if (action === 'rejected') {
      nextRequestStatus = 'rejected';
    } else if (action === 'forwarded') {
      nextRequestStatus = 'escalated';
      const targetRole = escalateTo || 'chairman';
      const { data: escalateApprovers } = await supabase
        .from('fdc_user_mapping')
        .select('id')
        .eq('role', targetRole)
        .limit(1);

      if (escalateApprovers && escalateApprovers.length > 0) {
        escalateApproverId = escalateApprovers[0].id;
      }

      await supabase.from('fdc_approval_steps').insert({
        request_id: request.id,
        step_order: currentStep.stepOrder + 1,
        approver_role: targetRole,
        approver_id: escalateApproverId,
        status: 'pending',
      });

      if (escalateApproverId) {
        const recipientId = await resolveEffectiveApproverId(escalateApproverId, request.type);
        await supabase.from('fdc_notifications').insert({
          recipient_id: recipientId,
          type: 'approval',
          title: 'De nghi chuyen cap can duyet',
          body: `De nghi ${request.requestNumber} da duoc chuyen cap va can ban phe duyet.`,
          data: { linkTo: '/approvals' },
        });
      }
    } else if (action === 'approved') {
      const hasLaterStep = request.approvalSteps.some((step) => step.stepOrder > currentStep.stepOrder);
      if (!hasLaterStep) {
        nextRequestStatus = 'approved';
      }

      if (requiresManualForwardChoice(request) && options?.handoffAssigneeId && options.handoffAssigneeRole) {
        await createHandoff(
          request,
          currentStep.id,
          options.handoffAssigneeId,
          options.handoffAssigneeRole,
          note,
        );
      }
    }

    if (nextRequestStatus !== 'pending' || action === 'forwarded') {
      await supabase
        .from('fdc_approval_requests')
        .update({ status: nextRequestStatus, updated_at: new Date().toISOString() })
        .eq('id', request.id);
    }

    let notificationTitle = '';
    let notificationBody = '';
    if (action === 'approved') {
      notificationTitle = nextRequestStatus === 'approved' ? 'De nghi hoan thanh' : 'De nghi duoc duyet buoc tiep theo';
      notificationBody = `De nghi ${request.requestNumber} da duoc duyet boi ${user.name || 'nguoi duyet'}.`;
    } else if (action === 'rejected') {
      notificationTitle = 'De nghi bi tu choi';
      notificationBody = `De nghi ${request.requestNumber} da bi tu choi boi ${user.name || 'nguoi duyet'}.`;
    } else {
      notificationTitle = 'De nghi chuyen cap phe duyet';
      notificationBody = `De nghi ${request.requestNumber} da duoc chuyen cap boi ${user.name || 'nguoi duyet'}.`;
    }

    await supabase.from('fdc_notifications').insert({
      recipient_id: request.requesterId,
      type: 'approval',
      title: notificationTitle,
      body: notificationBody,
      data: { linkTo: `/requests/${request.id}` },
    });

    if (action === 'approved' && nextRequestStatus === 'pending') {
      const nextStep = request.approvalSteps
        .filter((step) => step.stepOrder > currentStep.stepOrder)
        .sort((left, right) => left.stepOrder - right.stepOrder)[0];

      if (nextStep?.approverId) {
        const recipientId = await resolveEffectiveApproverId(nextStep.approverId, request.type);
        await supabase.from('fdc_notifications').insert({
          recipient_id: recipientId,
          type: 'approval',
          title: 'De nghi moi can duyet',
          body: `De nghi ${request.requestNumber} dang cho ban phe duyet.`,
          data: { linkTo: '/approvals' },
        });
      }
    }

    await fetchApprovals();
  };

  const resolveRoleTarget = useCallback(async (role: Extract<Role, 'super_admin' | 'internal_accountant'>) => {
    const { data, error } = await supabase
      .from('fdc_user_mapping')
      .select('id, full_name, role')
      .eq('role', role)
      .eq('is_active', true)
      .order('full_name', { ascending: true })
      .limit(1);

    if (error || !data || data.length === 0) {
      throw error || new Error(`No active user found for role ${role}`);
    }

    return data[0];
  }, []);

  const consolidateMaterialIntakes = useCallback(
    async (intakeIds: string[]) => {
      if (!user) return null;

      const selectedIntakes = reviewerIntakes.filter((intake) => intakeIds.includes(intake.id));
      if (selectedIntakes.length === 0) return null;

      const reviewGroup = selectedIntakes[0].reviewGroup;
      if (
        selectedIntakes.some(
          (intake) => intake.intakeType !== 'material' || intake.reviewGroup !== reviewGroup,
        )
      ) {
        throw new Error('Material consolidation requires material intakes from the same review group.');
      }

      const aggregatedItems = aggregateRoomIntakeItems(
        selectedIntakes.flatMap((intake) =>
          intake.items.map((item) => ({
            item_name: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
          })),
        ),
      );

      const primaryRoom = selectedIntakes[0];
      const payload = buildMaterialConsolidationPayload({
        roomId: primaryRoom.roomKey,
        roomCode: primaryRoom.roomCode,
        roomName: primaryRoom.roomName,
        floor: primaryRoom.floor,
        reviewGroup,
        intakeIds,
        items: aggregatedItems,
      } satisfies MaterialConsolidationInput);

      const chiefAccountant = await resolveRoleTarget('super_admin');
      const { data: requestRow, error: requestError } = await supabase
        .from('fdc_approval_requests')
        .insert({
          request_type: payload.requestType,
          title: buildMaterialConsolidationTitle(selectedIntakes),
          description: buildMaterialConsolidationDescription(selectedIntakes),
          requester_id: user.id,
          department_name: user.department || 'Room Management',
          priority: selectedIntakes.some((intake) => intake.priority === 'urgent')
            ? 'urgent'
            : selectedIntakes.some((intake) => intake.priority === 'high')
              ? 'high'
              : 'normal',
          total_amount: payload.totalAmount,
          metadata: payload.metadata,
          status: 'approved',
        })
        .select('id, request_number')
        .single();

      if (requestError || !requestRow) {
        throw requestError || new Error('Failed to create consolidated request.');
      }

      const { error: stepError } = await supabase.from('fdc_approval_steps').insert({
        request_id: requestRow.id,
        step_order: 1,
        approver_role: 'super_admin',
        approver_id: chiefAccountant.id,
        status: 'approved',
        acted_at: new Date().toISOString(),
        comment: 'Auto-approved after room material consolidation.',
      });

      if (stepError) throw stepError;

      const { data: downstreamTargets, error: targetsError } = await supabase
        .from('fdc_user_mapping')
        .select('id, role')
        .in('role', ['internal_accountant'])
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (targetsError) throw targetsError;

      const selectedTargets = new Map<string, { id: string; role: Extract<Role, 'internal_accountant'> }>();
      for (const target of downstreamTargets || []) {
        if (!selectedTargets.has(target.role)) {
          selectedTargets.set(target.role, { id: target.id, role: target.role });
        }
      }

      for (const target of selectedTargets.values()) {
        await createHandoff(
          {
            id: requestRow.id,
            requestNumber: requestRow.request_number,
            type: payload.requestType,
            title: buildMaterialConsolidationTitle(selectedIntakes),
            description: buildMaterialConsolidationDescription(selectedIntakes),
            requesterId: user.id,
            department: user.department || 'Room Management',
            status: 'approved',
            priority: 'normal',
            totalAmount: payload.totalAmount,
            metadata: payload.metadata,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            approvalSteps: [],
          },
          undefined,
          target.id,
          target.role,
          'Auto-forwarded after material consolidation.',
        );
      }

      const linkRows = intakeIds.map((intakeId) => ({
        intake_id: intakeId,
        request_id: requestRow.id,
        link_type: 'consolidated',
      }));
      const { error: linkError } = await supabase.from('fdc_room_intake_links').insert(linkRows);
      if (linkError) throw linkError;

      const { error: updateError } = await supabase
        .from('fdc_room_intakes')
        .update({
          status: 'consolidated',
          updated_at: new Date().toISOString(),
        })
        .in('id', intakeIds);

      if (updateError) throw updateError;

      await fetchApprovals();
      return requestRow.id;
    },
    [createHandoff, fetchApprovals, resolveRoleTarget, reviewerIntakes, user],
  );

  const promoteMaintenanceIntake = useCallback(
    async (intakeId: string) => {
      if (!user) return null;

      const intake = reviewerIntakes.find((item) => item.id === intakeId);
      if (!intake || intake.intakeType !== 'maintenance') return null;

      const chiefAccountant = await resolveRoleTarget('super_admin');
      const metadata: RoomWorkflowMetadata = {
        workflowKind: 'room_maintenance',
        roomId: intake.roomKey,
        roomCode: intake.roomCode,
        roomName: intake.roomName,
        floor: intake.floor,
        reviewGroup: intake.reviewGroup,
        sourceIntakeIds: [intake.id],
        originModule: 'room_management',
      };

      const { data: requestRow, error: requestError } = await supabase
        .from('fdc_approval_requests')
        .insert({
          request_type: 'other',
          title: buildMaintenanceRequestTitle(intake),
          description: intake.description || intake.title,
          requester_id: intake.requesterId || user.id,
          department_name: intake.roomName || user.department || 'Room Management',
          priority: intake.priority,
          metadata,
          status: 'pending',
        })
        .select('id, request_number')
        .single();

      if (requestError || !requestRow) {
        throw requestError || new Error('Failed to create maintenance request.');
      }

      const { error: stepError } = await supabase.from('fdc_approval_steps').insert({
        request_id: requestRow.id,
        step_order: 1,
        approver_role: 'super_admin',
        approver_id: chiefAccountant.id,
        status: 'pending',
      });

      if (stepError) throw stepError;

      const { error: linkError } = await supabase.from('fdc_room_intake_links').insert({
        intake_id: intake.id,
        request_id: requestRow.id,
        link_type: 'promoted',
      });

      if (linkError) throw linkError;

      const { error: updateError } = await supabase
        .from('fdc_room_intakes')
        .update({
          status: 'promoted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', intake.id);

      if (updateError) throw updateError;

      const recipientId = await resolveEffectiveApproverId(chiefAccountant.id, 'other');
      await supabase.from('fdc_notifications').insert({
        recipient_id: recipientId,
        type: 'approval',
        title: 'De nghi bao tri moi can duyet',
        body: `De nghi ${requestRow.request_number} dang cho phe duyet cua ban.`,
        data: { linkTo: '/approvals' },
      });

      await fetchApprovals();
      return requestRow.id;
    },
    [fetchApprovals, resolveRoleTarget, reviewerIntakes, user],
  );

  const updateHandoffStatus = useCallback(
    async (handoffId: string, status: RequestHandoff['status'], note?: string) => {
      const { error } = await supabase
        .from('fdc_request_handoffs')
        .update({
          status,
          note: note || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', handoffId);

      if (error) throw error;
      await fetchApprovals();
    },
    [fetchApprovals],
  );

  const approveRequest = useCallback(
    (id: string, note?: string, options?: ApprovalActionOptions) => {
      return updateStepStatus(id, 'approved', note, undefined, options);
    },
    [requests, user, activeDelegations],
  );

  const batchApprove = useCallback(
    (ids: string[], note?: string) => {
      return Promise.all(ids.map((id) => approveRequest(id, note)));
    },
    [approveRequest],
  );

  const rejectRequest = useCallback(
    (id: string, note: string) => {
      return updateStepStatus(id, 'rejected', note);
    },
    [requests, user, activeDelegations],
  );

  const escalateRequest = useCallback(
    (id: string, note: string) => {
      const comment = note ? `${note} - Da chuyen CT HDQT` : 'Da chuyen CT HDQT';
      return updateStepStatus(id, 'forwarded', comment);
    },
    [requests, user, activeDelegations],
  );

  return {
    pendingApprovals,
    regularApprovals,
    kttEscalationCandidates,
    reviewerQueue,
    assignedHandoffs,
    approvalWorkQueue,
    handoffTargets,
    countsByType,
    countsByUrgency,
    isLoading,
    isRefreshing,
    refresh,
    approveRequest,
    batchApprove,
    rejectRequest,
    escalateRequest,
    consolidateMaterialIntakes,
    promoteMaintenanceIntake,
    updateHandoffStatus,
    canTakeAction,
    getDelegatedActorName,
  };
}
