/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  CheckCircle,
  FileText,
  GitBranch,
  Home,
  Monitor,
  Package,
  Pill,
  Settings,
  User,
} from 'lucide-react';
import { canAccessModule } from '@/lib/permissions/access';
import type { RoleCatalogItem } from '@/types/roleCatalog';
import type { ModuleKey } from '@/types/roleCatalog';
import type { Role } from '@/types/user';

export interface NavItem {
  key: ModuleKey;
  path: string;
  label: string;
  icon: LucideIcon;
}

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
  { key: 'org_chart', path: '/org-chart', label: 'Sơ đồ tổ chức', icon: GitBranch },
  { key: 'portal', path: '/portal', label: 'Cá nhân', icon: User },
  { key: 'admin', path: '/admin', label: 'Quản trị', icon: Settings },
];

export function canRoleAccessModule(role: Role, moduleKey: ModuleKey): boolean {
  return canAccessModule(role, moduleKey);
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
