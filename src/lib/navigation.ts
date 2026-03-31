/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  CheckCircle,
  FileText,
  Home,
  Monitor,
  Package,
  Pill,
  Settings,
  User,
} from 'lucide-react';
import {
  APPROVER_ROLES,
  INVENTORY_ACCESS_ROLES,
  WEEKLY_REPORT_ACCESS_ROLES,
} from '@/lib/role-access';
import type { RoleCatalogItem } from '@/types/roleCatalog';
import type { ModuleKey, RoleModuleVisibilityMap } from '@/types/roleCatalog';
import type { Role } from '@/types/user';

export interface NavItem {
  key: ModuleKey;
  path: string;
  label: string;
  icon: LucideIcon;
}

export const ROLE_MODULE_VISIBILITY: RoleModuleVisibilityMap = {
  dashboard: 'all',
  requests: 'all',
  approvals: APPROVER_ROLES,
  pharmacy: INVENTORY_ACCESS_ROLES,
  inventory: INVENTORY_ACCESS_ROLES,
  room_management: 'all',
  weekly_report: WEEKLY_REPORT_ACCESS_ROLES,
  tv_management: ['super_admin'],
  portal: 'all',
  admin: ['super_admin'],
};

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', path: '/dashboard', label: 'Trang chủ', icon: Home },
  { key: 'requests', path: '/requests', label: 'Đề nghị của tôi', icon: FileText },
  { key: 'approvals', path: '/approvals', label: 'Phê duyệt', icon: CheckCircle },
  { key: 'pharmacy', path: '/pharmacy', label: 'Kho thuốc', icon: Pill },
  { key: 'inventory', path: '/inventory', label: 'Kho vật tư', icon: Package },
  {
    key: 'room_management',
    path: '/room-management',
    label: 'Quản lý phòng',
    icon: Building2,
  },
  {
    key: 'tv_management',
    path: '/tv-management',
    label: 'Quản lý TV',
    icon: Monitor,
  },
  { key: 'portal', path: '/portal', label: 'Cá nhân', icon: User },
  { key: 'admin', path: '/admin', label: 'Quản trị', icon: Settings },
];

export function canRoleAccessModule(role: Role, moduleKey: ModuleKey): boolean {
  const visibility = ROLE_MODULE_VISIBILITY[moduleKey];
  return visibility === 'all' || visibility.includes(role);
}

export function getVisibleNavItems(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => canRoleAccessModule(role, item.key));
}

export function getVisibleModulesForRole(role: Role): NavItem[] {
  return getVisibleNavItems(role);
}

export function getVisibleModuleLabelsForRole(role: Role): string[] {
  return getVisibleModulesForRole(role).map((item) => item.label);
}

export function getVisibleModuleLabelsForCatalogRole(role: RoleCatalogItem): string[] {
  return getVisibleModuleLabelsForRole(role.roleKey);
}
