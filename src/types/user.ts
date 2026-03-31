export type Role =
  | 'super_admin'
  | 'head_nurse'
  | 'director'
  | 'chairman'
  | 'dept_head'
  | 'accountant'
  | 'pharmacy_head'
  | 'accounting_supervisor'
  | 'lab_head'
  | 'chief_accountant'
  | 'internal_accountant'
  | 'hr_records'
  | 'staff'
  | 'doctor';

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
