import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Request, RequestType } from '@/types/request';
import { supabase } from '@/lib/supabase';

interface UseApprovalsOptions {
  enabled?: boolean;
}

export function useApprovals(options: UseApprovalsOptions = {}) {
  const { user } = useAuth();
  const enabled = options.enabled ?? true;
  const [requests, setRequests] = useState<Request[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const hasLoadedRef = useRef(false);

  const fetchApprovals = useCallback(async () => {
    if (!enabled || !user) return;
    if (!hasLoadedRef.current) setIsRefreshing(true);

    // We fetch all requests that the user has access to.
    // RLS policies already restrict to requests where user is an approver or super_admin
    const { data, error } = await supabase
      .from('fdc_approval_requests')
      .select(`
        *,
        requester:fdc_user_mapping!requester_id(id, full_name, email, role, department_name, avatar_url),
        approvalSteps:fdc_approval_steps(
          *,
          approver:fdc_user_mapping!approver_id(id, full_name, role, avatar_url)
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const mapped: Request[] = data.map(dbReq => ({
        id: dbReq.id,
        requestNumber: dbReq.request_number,
        type: dbReq.request_type as RequestType,
        title: dbReq.title,
        description: dbReq.description,
        requesterId: dbReq.requester_id,
        department: dbReq.department_name,
        status: dbReq.status as any,
        priority: dbReq.priority as any,
        totalAmount: dbReq.total_amount,
        createdAt: dbReq.created_at,
        updatedAt: dbReq.updated_at,
        requesterName: dbReq.requester?.full_name || 'Unknown',
        requesterDept: dbReq.requester?.department_name || '',
        requesterAvatar: dbReq.requester?.avatar_url || null,
        approvalSteps: (dbReq.approvalSteps || []).map((step: any) => ({
          id: step.id,
          stepOrder: step.step_order,
          approverRole: step.approver_role,
          approverId: step.approver_id,
          status: step.status,
          comment: step.comment,
          actedAt: step.acted_at,
          approverName: step.approver?.full_name || null,
          approverAvatar: step.approver?.avatar_url || null,
        }))
      }));
      setRequests(mapped);
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, fetchApprovals]);

  const refresh = fetchApprovals;
  const isLoading = enabled && !hasLoaded;

  const [activeDelegations, setActiveDelegations] = useState<Array<{ delegator_id: string; request_types: string[] }>>([]);

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

  const pendingApprovals = useMemo(() => {
    if (!user) return [];

    return requests.filter(req => {
      if (req.status !== 'pending') return false;

      if (user.role === 'super_admin') return true;

      const currentStep = req.approvalSteps?.find(step => step.status === 'pending');
      if (!currentStep) return false;

      if (currentStep.approverId === user.id) return true;

      const isDelegated = activeDelegations.some(d =>
        d.delegator_id === currentStep.approverId &&
        d.request_types.includes(req.type)
      );
      return isDelegated;
    });
  }, [requests, user, activeDelegations]);

  const kttEscalationCandidates = useMemo(() => {
    if (user?.role !== 'super_admin') return [];

    return pendingApprovals.filter(req => {
      const isFinancial = ['payment', 'advance', 'purchase'].includes(req.type);
      const isHighValue = (req.totalAmount || 0) > 50000000;

      const currentStep = req.approvalSteps?.find(step => step.status === 'pending');
      const isAtKTT = currentStep?.approverRole === 'super_admin';

      return isFinancial && isHighValue && isAtKTT;
    });
  }, [pendingApprovals, user]);

  const regularApprovals = useMemo(() => {
    if (user?.role !== 'super_admin') return pendingApprovals;
    const escalationIds = new Set(kttEscalationCandidates.map(r => r.id));
    return pendingApprovals.filter(r => !escalationIds.has(r.id));
  }, [pendingApprovals, kttEscalationCandidates, user]);

  const countsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    pendingApprovals.forEach(req => {
      counts[req.type] = (counts[req.type] || 0) + 1;
    });
    return counts;
  }, [pendingApprovals]);

  const countsByUrgency = useMemo(() => {
    const counts = { normal: 0, warning: 0, critical: 0 };
    const now = new Date().getTime();

    pendingApprovals.forEach(req => {
      const createdTime = new Date(req.createdAt).getTime();
      const hoursWaiting = (now - createdTime) / (1000 * 60 * 60);

      if (hoursWaiting > 48) counts.critical++;
      else if (hoursWaiting > 24) counts.warning++;
      else counts.normal++;
    });
    return counts;
  }, [pendingApprovals]);

  const updateStepStatus = async (id: string, action: 'approved' | 'rejected' | 'forwarded', note?: string, escalateTo?: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    const currentStep = req.approvalSteps?.find(step => step.status === 'pending');
    if (!currentStep) return;

    // Update the step in Supabase
    const { error: stepErr } = await supabase
      .from('fdc_approval_steps')
      .update({
        status: action,
        comment: note,
        acted_at: new Date().toISOString()
      })
      .eq('id', currentStep.id);

    if (stepErr) {
      console.error('Failed to update step', stepErr);
      return;
    }

    // Audit log
    await supabase.from('fdc_audit_log').insert({
      user_id: user?.id,
      action: action,
      entity_type: 'approval_step',
      entity_id: currentStep.id,
      new_value: {
        request_id: req.id,
        request_number: req.requestNumber,
        step_order: currentStep.stepOrder,
        status: action,
        comment: note || null,
      },
    }).then(({ error }) => {
      if (error) console.error('Failed to write audit log', error);
    });

    // Now update request status based on action
    let newReqStatus: any = 'pending';
    let escalateApproverId: string | undefined;
    if (action === 'rejected') {
      newReqStatus = 'rejected';
    } else if (action === 'forwarded') {
      newReqStatus = 'escalated';
      // Find the target approver by role
      const targetRole = escalateTo || 'chairman';
      const { data: escalateApprovers } = await supabase
        .from('fdc_user_mapping')
        .select('id')
        .eq('role', targetRole)
        .limit(1);
      if (escalateApprovers && escalateApprovers.length > 0) {
        escalateApproverId = escalateApprovers[0].id;
      }
      // Create a new step for escalation
      await supabase.from('fdc_approval_steps').insert({
        request_id: req.id,
        step_order: currentStep.stepOrder + 1,
        approver_role: targetRole,
        approver_id: escalateApproverId,
        status: 'pending'
      });
      // Notify the escalation target
      if (escalateApproverId) {
        await supabase.from('fdc_notifications').insert({
          recipient_id: escalateApproverId,
          type: 'approval',
          title: 'Đề nghị chuyển cấp cần duyệt',
          body: `Đề nghị ${req.requestNumber} đã được chuyển cấp và cần bạn phê duyệt.`,
          data: { linkTo: `/approvals` }
        });
      }
    } else if (action === 'approved') {
      const isLastStep = currentStep.stepOrder === req.approvalSteps.length || !req.approvalSteps.some(s => s.stepOrder > currentStep.stepOrder);
      if (isLastStep) {
        newReqStatus = 'approved';
      }
    }

    if (newReqStatus !== 'pending' || action === 'forwarded') {
      await supabase
        .from('fdc_approval_requests')
        .update({ status: newReqStatus, updated_at: new Date().toISOString() })
        .eq('id', req.id);
    }

    // Add notification to the requester
    let notificationTitle = '';
    let notificationBody = '';
    if (action === 'approved') {
      notificationTitle = newReqStatus === 'approved' ? 'Đề nghị hoàn thành' : 'Đề nghị được duyệt bước tiếp theo';
      notificationBody = `Đề nghị ${req.requestNumber} đã được duyệt bởi ${user?.name || 'người duyệt'}.`;
    } else if (action === 'rejected') {
      notificationTitle = 'Đề nghị bị từ chối';
      notificationBody = `Đề nghị ${req.requestNumber} đã bị từ chối bởi ${user?.name || 'người duyệt'}.`;
    } else if (action === 'forwarded') {
      notificationTitle = 'Đề nghị chuyển cấp phê duyệt';
      notificationBody = `Đề nghị ${req.requestNumber} đã được chuyển cấp bởi ${user?.name || 'người duyệt'}.`;
    }

    await supabase.from('fdc_notifications').insert({
      recipient_id: req.requesterId,
      type: 'approval',
      title: notificationTitle,
      body: notificationBody,
      data: { linkTo: `/requests/${req.id}` }
    });

    // Notify next approver if request is still pending
    if (action === 'approved' && newReqStatus === 'pending') {
      const nextStep = req.approvalSteps
        ?.filter(s => s.stepOrder > currentStep.stepOrder)
        .sort((a, b) => a.stepOrder - b.stepOrder)[0];
      if (nextStep?.approverId) {
        await supabase.from('fdc_notifications').insert({
          recipient_id: nextStep.approverId,
          type: 'approval',
          title: 'Đề nghị mới cần duyệt',
          body: `Đề nghị ${req.requestNumber} đang chờ bạn phê duyệt.`,
          data: { linkTo: `/approvals` }
        });
      }
    }
  };

  const approveRequest = useCallback((id: string, note?: string) => {
    return updateStepStatus(id, 'approved', note);
  }, [requests]);

  const batchApprove = useCallback((ids: string[], note?: string) => {
    return Promise.all(ids.map(id => approveRequest(id, note)));
  }, [approveRequest]);

  const rejectRequest = useCallback((id: string, note: string) => {
    return updateStepStatus(id, 'rejected', note);
  }, [requests]);

  const escalateRequest = useCallback((id: string, note: string) => {
    const comment = note ? `${note} - Đã chuyển CT HĐQT` : 'Đã chuyển CT HĐQT';
    return updateStepStatus(id, 'forwarded', comment);
  }, [requests]);

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
    escalateRequest
  };
}
