import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Request, RequestStatus } from '@/types/request';
import { REQUEST_READ_ALL_ROLES } from '@/lib/role-access';
import { supabase } from '@/lib/supabase';
import { mapRequestRecord } from '@/lib/request-helpers';
import { resolveEffectiveApproverId } from '@/lib/delegations';

export function useRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');

  useEffect(() => {
    if (!user) {
      setRequests([]);
      return;
    }

    const fetchRequests = async () => {
      let query = supabase
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

      if (!REQUEST_READ_ALL_ROLES.includes(user.role)) {
        query = query.eq('requester_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching requests:', error);
        return;
      }

      if (data) {
        setRequests(data.map(mapRequestRecord));
      }
    };

    fetchRequests();

    const channel = supabase
      .channel('public:fdc_approval_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_approval_requests' }, () => {
        fetchRequests();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_approval_steps' }, () => {
        fetchRequests();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_request_attachments' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filteredRequests = useMemo(() => {
    let filtered = [...requests];

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        filtered = filtered.filter((request) => request.status === 'pending' || request.status === 'escalated');
      } else if (statusFilter === 'approved') {
        filtered = filtered.filter((request) => request.status === 'approved' || request.status === 'completed');
      } else if (statusFilter === 'rejected') {
        filtered = filtered.filter((request) => request.status === 'rejected' || request.status === 'cancelled');
      } else {
        filtered = filtered.filter((request) => request.status === statusFilter);
      }
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (request) =>
          request.title.toLowerCase().includes(lowerQuery) ||
          request.requestNumber.toLowerCase().includes(lowerQuery),
      );
    }

    filtered.sort((left, right) => {
      if (sortBy === 'newest') {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      }

      const priorityWeight = { urgent: 4, high: 3, normal: 2, low: 1 };
      return priorityWeight[right.priority] - priorityWeight[left.priority];
    });

    return filtered;
  }, [requests, statusFilter, searchQuery, sortBy]);

  const getRequest = (id: string) => requests.find((request) => request.id === id);

  const createRequest = async (newRequest: Partial<Request>) => {
    if (!user) return null;

    const { data: requestData, error: requestError } = await supabase
      .from('fdc_approval_requests')
      .insert({
        request_type: newRequest.type,
        title: newRequest.title,
        description: newRequest.description,
        requester_id: user.id,
        department_name: user.department || 'Chung',
        priority: newRequest.priority || 'normal',
        total_amount: newRequest.totalAmount,
        cost_center: newRequest.costCenter || null,
        metadata: newRequest.metadata || {},
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating request:', requestError);
      return null;
    }

    if (newRequest.approvalSteps && newRequest.approvalSteps.length > 0) {
      const stepsToInsert = await Promise.all(
        newRequest.approvalSteps.map(async (step) => {
          let finalApproverId = step.approverId;

          if (!finalApproverId && step.approverRole) {
            let query = supabase.from('fdc_user_mapping').select('id').eq('role', step.approverRole);
            if (step.approverRole === 'dept_head') {
              query = query.eq('department_name', user.department || 'Chung');
            }

            const { data: approvers, error: approverError } = await query.limit(1);
            if (!approverError && approvers && approvers.length > 0) {
              finalApproverId = approvers[0].id;
            }
          }

          return {
            request_id: requestData.id,
            step_order: step.stepOrder,
            approver_role: step.approverRole,
            approver_id: finalApproverId,
            status: step.status || 'pending',
          };
        }),
      );

      const { error: stepsError } = await supabase.from('fdc_approval_steps').insert(stepsToInsert);

      if (stepsError) {
        console.error('Error creating approval steps:', stepsError);
      }

      const firstApprover = stepsToInsert.find((step) => step.step_order === 1);
      if (firstApprover?.approver_id) {
        const recipientId = await resolveEffectiveApproverId(
          firstApprover.approver_id,
          requestData.request_type,
        );

        await supabase.from('fdc_notifications').insert({
          recipient_id: recipientId,
          type: 'approval',
          title: 'De nghi moi can duyet',
          body: `De nghi ${requestData.request_number} can ban phe duyet.`,
          data: { linkTo: '/approvals' },
        });
      }
    }

    return requestData.id;
  };

  const uploadAttachments = useCallback(
    async (requestId: string, files: File[]) => {
      if (!user || files.length === 0) return;

      for (const file of files) {
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${requestId}/${Date.now()}_${sanitizedFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('request-attachments')
          .upload(storagePath, file, { upsert: false });

        if (uploadError) {
          console.error('Failed to upload file:', uploadError);
          continue;
        }

        const { error: attachmentError } = await supabase.from('fdc_request_attachments').insert({
          request_id: requestId,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          storage_path: storagePath,
          public_url: null,
          uploaded_by: user.id,
        });

        if (attachmentError) {
          console.error('Failed to save attachment metadata:', attachmentError);
          await supabase.storage.from('request-attachments').remove([storagePath]);
        }
      }
    },
    [user],
  );

  return {
    requests: filteredRequests,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    getRequest,
    createRequest,
    uploadAttachments,
  };
}
