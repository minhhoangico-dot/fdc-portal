import { Request } from '@/types/request';
import { mockRequests } from './requests';
import { Role } from '@/types/user';

export const getPendingForUser = (userRole: Role): Request[] => {
  return mockRequests.filter(req => {
    if (req.status !== 'pending' && req.status !== 'escalated') return false;
    
    // Find the current pending step
    const pendingStep = req.approvalSteps?.find(step => step.status === 'pending');
    if (!pendingStep) return false;
    
    // Check if the pending step requires the user's role
    return pendingStep.approverRole === userRole;
  });
};

// We don't need mockApprovals array anymore since we derive it from requests
export const mockApprovals = [];
