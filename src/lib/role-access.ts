/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { can, canAccessModule } from '@/lib/permissions/access';
import type { Role } from '@/types/user';

const ALL_ROLES: readonly Role[] = [
  'super_admin',
  'director',
  'chairman',
  'head_nurse',
  'business_head',
  'lab_head',
  'pharmacy_head',
  'accountant',
  'internal_accountant',
  'pharmacy_staff',
  'lab_staff',
  'business_staff',
  'clinic_staff',
];

export const FULL_ACCESS_ROLES: readonly Role[] = ['super_admin'];
export const APPROVER_ROLES: readonly Role[] = ALL_ROLES.filter((role) =>
  can(role, 'approvals.review_assigned'),
);
export const REQUEST_READ_ALL_ROLES: readonly Role[] = ALL_ROLES.filter((role) =>
  can(role, 'requests.view_all'),
);
export const INVENTORY_ACCESS_ROLES: readonly Role[] = ALL_ROLES.filter((role) =>
  canAccessModule(role, 'inventory'),
);
export const WEEKLY_REPORT_ACCESS_ROLES: readonly Role[] = ALL_ROLES.filter((role) =>
  canAccessModule(role, 'weekly_report'),
);

const DEPT_HEAD_MAP: Record<string, Role> = {
  pharmacy: 'pharmacy_head',
  duoc: 'pharmacy_head',
  lab: 'lab_head',
  xet_nghiem: 'lab_head',
  business: 'business_head',
  kinh_doanh: 'business_head',
  marketing: 'business_head',
};

export function getDeptHeadRoleForDepartment(department: string): Role {
  const normalized = department.toLowerCase().replace(/\s+/g, '_');
  return DEPT_HEAD_MAP[normalized] ?? 'head_nurse';
}

export function canRoleBypassApprovalAssignment(role: Role): boolean {
  return role === 'super_admin';
}
