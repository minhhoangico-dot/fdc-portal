/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Role } from '@/types/user';

export type ModuleKey =
  | 'dashboard'
  | 'requests'
  | 'approvals'
  | 'pharmacy'
  | 'inventory'
  | 'room_management'
  | 'weekly_report'
  | 'tv_management'
  | 'portal'
  | 'admin';

export type RoleModuleVisibility = 'all' | readonly Role[];

export type RoleModuleVisibilityMap = Record<ModuleKey, RoleModuleVisibility>;

export interface RoleCatalogItem {
  roleKey: Role;
  displayName: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
