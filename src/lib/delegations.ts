import { supabase } from '@/lib/supabase';
import { RequestType } from '@/types/request';

export interface ActiveDelegation {
  delegator_id: string;
  request_types: string[];
}

export const findActiveDelegation = (
  delegations: ActiveDelegation[],
  approverId: string | undefined,
  requestType: RequestType,
) => {
  if (!approverId) return null;

  return (
    delegations.find(
      (delegation) =>
        delegation.delegator_id === approverId &&
        delegation.request_types.includes(requestType),
    ) || null
  );
};

export const resolveEffectiveApproverId = async (
  approverId: string | undefined,
  requestType: RequestType,
) => {
  if (!approverId) return undefined;

  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('fdc_delegations')
    .select('delegate_id')
    .eq('delegator_id', approverId)
    .lte('start_date', today)
    .gte('end_date', today)
    .contains('request_types', [requestType])
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to resolve effective approver:', error);
    return approverId;
  }

  return data?.delegate_id || approverId;
};
