/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ModuleKey } from '@/types/roleCatalog';
import type { Role } from '@/types/user';

export type PermissionModuleKey = ModuleKey | 'valuation' | 'lab_dashboard';

export type PermissionAction =
  | 'dashboard.view'
  | 'requests.create'
  | 'requests.view_own'
  | 'requests.view_assigned'
  | 'requests.view_all'
  | 'approvals.review_assigned'
  | 'approvals.approve'
  | 'approvals.reject'
  | 'approvals.forward_manual'
  | 'approvals.receive_handoff'
  | 'room_management.view_map'
  | 'room_management.create_material_intake'
  | 'room_management.create_maintenance_intake'
  | 'room_management.review_group_queue'
  | 'room_management.consolidate_materials'
  | 'room_management.print_material_summary'
  | 'pharmacy.view'
  | 'pharmacy.operate'
  | 'inventory.view'
  | 'inventory.operate'
  | 'valuation.view'
  | 'weekly_report.view'
  | 'weekly_report.operate'
  | 'lab_dashboard.view'
  | 'lab_dashboard.operate'
  | 'tv_management.view'
  | 'portal.view'
  | 'admin.view'
  | 'admin.manage';

export type PermissionMatrix = Record<PermissionAction, readonly Role[] | 'all'>;
