/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { can, canAccessModule } from '@/lib/permissions/access';
import type { Role } from '@/types/user';

const ALL_ROLES: readonly Role[] = [
  'super_admin',
  'head_nurse',
  'director',
  'chairman',
  'dept_head',
  'accountant',
  'pharmacy_head',
  'accounting_supervisor',
  'lab_head',
  'chief_accountant',
  'internal_accountant',
  'hr_records',
  'staff',
  'doctor',
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

export function canRoleBypassApprovalAssignment(role: Role): boolean {
  return role === 'super_admin';
}
