export type Role =
  | 'super_admin'
  | 'director'
  | 'chairman'
  | 'head_nurse'
  | 'business_head'
  | 'lab_head'
  | 'pharmacy_head'
  | 'accountant'
  | 'internal_accountant'
  | 'pharmacy_staff'
  | 'lab_staff'
  | 'business_staff'
  | 'clinic_staff';

export interface User {
  id: string;
  supabaseUid?: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  avatarUrl?: string;
  isActive?: boolean;
  hikvisionEmployeeId?: string;
}
