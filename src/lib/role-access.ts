/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Role } from '@/types/user';

export const FULL_ACCESS_ROLES: readonly Role[] = ['super_admin', 'head_nurse'];
export const APPROVER_ROLES: readonly Role[] = [
  'dept_head',
  'accountant',
  'director',
  'chairman',
  'super_admin',
  'head_nurse',
];
export const REQUEST_READ_ALL_ROLES: readonly Role[] = [
  'super_admin',
  'director',
  'chairman',
  'head_nurse',
];
export const INVENTORY_ACCESS_ROLES: readonly Role[] = ['dept_head', 'super_admin', 'head_nurse'];
export const WEEKLY_REPORT_ACCESS_ROLES: readonly Role[] = [
  'super_admin',
  'director',
  'chairman',
  'accountant',
  'head_nurse',
];

export function canRoleBypassApprovalAssignment(role: Role): boolean {
  return FULL_ACCESS_ROLES.includes(role);
}
