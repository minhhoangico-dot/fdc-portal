/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Role } from '@/types/user';

export const FULL_ACCESS_ROLES: readonly Role[] = ['super_admin', 'head_nurse'];
export const ONSITE_ACCESS_BYPASS_ROLES: readonly Role[] = ['super_admin'];

export function hasFullPortalAdminAccess(role: Role): boolean {
  return FULL_ACCESS_ROLES.includes(role);
}

export function isOnsiteAccessBypassRole(role: Role): boolean {
  return ONSITE_ACCESS_BYPASS_ROLES.includes(role);
}
