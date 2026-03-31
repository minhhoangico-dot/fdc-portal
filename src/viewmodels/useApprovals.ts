import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Request } from '@/types/request';
import { canRoleBypassApprovalAssignment } from '@/lib/role-access';
import { supabase } from '@/lib/supabase';
import { ActiveDelegation, findActiveDelegation, resolveEffectiveApproverId } from '@/lib/delegations';
import { mapRequestRecord } from '@/lib/request-helpers';

interface UseApprovalsOptions {
  enabled?: boolean;
}

export function useApprovals(options: UseApprovalsOptions = {}) {
  const { user } = useAuth();
  const enabled = options.enabled ?? true;
  const [requests, setRequests] = useState<Request[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeDelegations, setActiveDelegations] = useState<ActiveDelegation[]>([]);
  const hasLoadedRef = useRef(false);

  const fetchApprovals = useCallback(async () => {
    if (!enabled || !user) return;
    if (!hasLoadedRef.current) setIsRefreshing(true);

    const { data, error } = await supabase
      .from('fdc_approval_requests')
      .select(`
        *,
        requester:fdc_user_mapping!requester_id(id, full_name, email, role, department_name, avatar_url),
        approvalSteps:fdc_approval_steps(
          *,
          approver:fdc_user_mapping!approver_id(id, full_name, role, avatar_url)
        ),
        attachments:fdc_request_attachments(*)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data.map(mapRequestRecord));
    }

    setIsRefreshing(false);
    setHasLoaded(true);
    hasLoadedRef.current = true;
  }, [enabled, user]);

  useEffect(() => {
    if (!enabled) {
      setRequests([]);
      setIsRefreshing(false);
      setHasLoaded(false);
      hasLoadedRef.current = false;
      return;
    }

    fetchApprovals();

    const channel = supabase
      .channel('public:fdc_approvals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_approval_requests' }, () => {
        fetchApprovals();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_approval_steps' }, () => {
        fetchApprovals();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_request_attachments' }, () => {
        fetchApprovals();
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

  const refresh = fetchApprovals;
  const isLoading = enabled && !hasLoaded;

  const getPendingStep = useCallback((request: Request) => {
    return request.approvalSteps?.find((step) => step.status === 'pending');
  }, []);

  const canTakeAction = useCallback(
    (request: Request) => {
      if (!user) return false;

      const currentStep = getPendingStep(request);
      if (!currentStep) return false;

      if (canRoleBypassApprovalAssignment(user.role)) return true;
      if (currentStep.approverId === user.id) return true;

      return Boolean(findActiveDelegation(activeDelegations, currentStep.approverId, request.type));
    },
    [activeDelegations, getPendingStep, user],
  );

  const getDelegatedActorName = useCallback(
    (request: Request) => {
      const currentStep = getPendingStep(request);
      if (
        !currentStep ||
        !user ||
        currentStep.approverId === user.id ||
        canRoleBypassApprovalAssignment(user.role)
      ) {
        return null;
      }

      const delegation = findActiveDelegation(activeDelegations, currentStep.approverId, request.type);
      return delegation ? currentStep.approverName || null : null;
    },
    [activeDelegations, getPendingStep, user],
  );

  const pendingApprovals = useMemo(() => {
    if (!user) return [];

    return requests.filter((request) => {
      if (request.status !== 'pending' && request.status !== 'escalated') return false;
      return canTakeAction(request);
    });
  }, [canTakeAction, requests, user]);

  const kttEscalationCandidates = useMemo(() => {
    if (!user || !canRoleBypassApprovalAssignment(user.role)) return [];

    return pendingApprovals.filter((request) => {
      const isFinancial = ['payment', 'advance', 'purchase'].includes(request.type);
      const isHighValue = (request.totalAmount || 0) > 50000000;
      const currentStep = getPendingStep(request);

      return isFinancial && isHighValue && currentStep?.approverRole === 'super_admin';
    });
  }, [getPendingStep, pendingApprovals, user]);

  const regularApprovals = useMemo(() => {
    if (!user || !canRoleBypassApprovalAssignment(user.role)) return pendingApprovals;
    const escalationIds = new Set(kttEscalationCandidates.map((request) => request.id));
    return pendingApprovals.filter((request) => !escalationIds.has(request.id));
  }, [kttEscalationCandidates, pendingApprovals, user]);

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

  const updateStepStatus = async (
    id: string,
    action: 'approved' | 'rejected' | 'forwarded',
    note?: string,
    escalateTo?: string,
  ) => {
    const request = requests.find((item) => item.id === id);
    if (!request || !user) return;
    if (!canTakeAction(request)) return;

    const currentStep = getPendingStep(request);
    if (!currentStep) return;

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
  };

  const approveRequest = useCallback((id: string, note?: string) => {
    return updateStepStatus(id, 'approved', note);
  }, [requests, user, activeDelegations]);

  const batchApprove = useCallback((ids: string[], note?: string) => {
    return Promise.all(ids.map((id) => approveRequest(id, note)));
  }, [approveRequest]);

  const rejectRequest = useCallback((id: string, note: string) => {
    return updateStepStatus(id, 'rejected', note);
  }, [requests, user, activeDelegations]);

  const escalateRequest = useCallback((id: string, note: string) => {
    const comment = note ? `${note} - Da chuyen CT HDQT` : 'Da chuyen CT HDQT';
    return updateStepStatus(id, 'forwarded', comment);
  }, [requests, user, activeDelegations]);

  return {
    pendingApprovals,
    regularApprovals,
    kttEscalationCandidates,
    countsByType,
    countsByUrgency,
    isLoading,
    isRefreshing,
    refresh,
    approveRequest,
    batchApprove,
    rejectRequest,
    escalateRequest,
    canTakeAction,
    getDelegatedActorName,
  };
}
