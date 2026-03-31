/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PERMISSION_MATRIX } from '@/lib/permissions/matrix';
import type { PermissionAction, PermissionModuleKey } from '@/types/permissions';
import type { ModuleKey } from '@/types/roleCatalog';
import type { Role } from '@/types/user';

const MODULE_ACCESS_ACTIONS: Record<PermissionModuleKey, readonly PermissionAction[]> = {
  dashboard: ['dashboard.view'],
  requests: ['requests.view_own', 'requests.view_assigned', 'requests.view_all', 'requests.create'],
  approvals: [
    'approvals.review_assigned',
    'approvals.approve',
    'approvals.reject',
    'approvals.forward_manual',
    'approvals.receive_handoff',
  ],
  pharmacy: ['pharmacy.view', 'pharmacy.operate'],
  inventory: ['inventory.view', 'inventory.operate'],
  room_management: [
    'room_management.view_map',
    'room_management.create_material_intake',
    'room_management.create_maintenance_intake',
    'room_management.review_group_queue',
    'room_management.consolidate_materials',
    'room_management.print_material_summary',
  ],
  weekly_report: ['weekly_report.view', 'weekly_report.operate'],
  tv_management: ['tv_management.view'],
  portal: ['portal.view'],
  admin: ['admin.view', 'admin.manage'],
  valuation: ['valuation.view'],
  lab_dashboard: ['lab_dashboard.view', 'lab_dashboard.operate'],
};

export function can(role: Role, action: PermissionAction): boolean {
  const visibility = PERMISSION_MATRIX[action];
  return visibility === 'all' || visibility.includes(role);
}

export function canAccessModule(role: Role, moduleKey: ModuleKey | PermissionModuleKey): boolean {
  return MODULE_ACCESS_ACTIONS[moduleKey].some((action) => can(role, action));
}

export function getAccessibleModules(role: Role): PermissionModuleKey[] {
  return (Object.keys(MODULE_ACCESS_ACTIONS) as PermissionModuleKey[]).filter((moduleKey) =>
    canAccessModule(role, moduleKey),
  );
}
