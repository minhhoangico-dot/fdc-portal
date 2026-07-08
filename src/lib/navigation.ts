/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Building2,
  CheckCircle,
  ClipboardList,
  Coins,
  FileText,
  FlaskConical,
  GitBranch,
  Home,
  Inbox,
  LayoutGrid,
  Monitor,
  Package,
  Pill,
  Settings,
  User,
} from 'lucide-react';
import { can, canAccessModule, getAccessibleModules } from '@/lib/permissions/access';
import { PERMISSION_MATRIX } from '@/lib/permissions/matrix';
import type { PermissionModuleKey } from '@/types/permissions';
import type { RoleCatalogItem } from '@/types/roleCatalog';
import type { ModuleKey } from '@/types/roleCatalog';
import type { Role } from '@/types/user';

export interface NavItem {
  key: ModuleKey;
  path: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Legacy 11-item nav. Retained so existing callers keep compiling; the shell
 * (AppShell v2) now renders `getPrimaryNav` instead. Do not add new consumers.
 */
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
  { key: 'attendance', path: '/attendance', label: 'Chấm công', icon: ClipboardList },
  { key: 'portal', path: '/portal', label: 'Cá nhân', icon: User },
  { key: 'admin', path: '/admin', label: 'Quản trị', icon: Settings },
];

export function canRoleAccessModule(role: Role, moduleKey: PermissionModuleKey): boolean {
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

// ---------------------------------------------------------------------------
// Nav model v2 — role-composed 5-slot primary nav (direction §4.1)
// ---------------------------------------------------------------------------

/** A single referenceable module, used to build the "Tra cứu" disclosure. */
export interface ReferenceNavItem {
  key: PermissionModuleKey;
  path: string;
  label: string;
  icon: LucideIcon;
}

export type PrimaryNavSlot = 'home' | 'inbox' | 'workspace' | 'reference' | 'personal';

export interface PrimaryNavItem {
  slot: PrimaryNavSlot;
  label: string;
  icon: LucideIcon;
  /** Present for every slot except `reference` (which is a disclosure menu). */
  path?: string;
  /** The permission module this slot resolves to (drives reachability). */
  moduleKey?: PermissionModuleKey;
  /** True on the inbox slot; the shell renders the actionable-count badge here. */
  badge?: boolean;
  /** Present only on the `reference` slot. */
  children?: ReferenceNavItem[];
}

/**
 * Canonical path/label/icon for every matrix-visible module. Used to build the
 * "Tra cứu" disclosure. Labels are the calm-clinical Vietnamese product copy.
 */
const MODULE_NAV_META: Record<PermissionModuleKey, { path: string; label: string; icon: LucideIcon }> = {
  dashboard: { path: '/dashboard', label: 'Hôm nay', icon: Home },
  requests: { path: '/requests', label: 'Đề nghị của tôi', icon: FileText },
  approvals: { path: '/approvals', label: 'Phê duyệt', icon: CheckCircle },
  pharmacy: { path: '/pharmacy', label: 'Kho thuốc', icon: Pill },
  inventory: { path: '/inventory', label: 'Kho vật tư', icon: Package },
  room_management: { path: '/room-management', label: 'Quản lý phòng', icon: Building2 },
  weekly_report: { path: '/weekly-report', label: 'Báo cáo tuần', icon: BarChart3 },
  tv_management: { path: '/tv-management', label: 'Quản lý TV', icon: Monitor },
  portal: { path: '/portal', label: 'Cá nhân', icon: User },
  attendance: { path: '/attendance', label: 'Chấm công', icon: ClipboardList },
  admin: { path: '/admin', label: 'Quản trị', icon: Settings },
  valuation: { path: '/valuation', label: 'Giá trị tồn kho', icon: Coins },
  lab_dashboard: { path: '/lab-dashboard', label: 'Dashboard xét nghiệm', icon: FlaskConical },
  org_chart: { path: '/org-chart', label: 'Sơ đồ tổ chức', icon: GitBranch },
};

/**
 * True when the role is granted `admin.manage` *natively* (i.e. present in the
 * matrix allow-list), as opposed to via the full-portal-admin bypass. Only
 * super_admin qualifies; head_nurse gets admin.manage via the bypass and must
 * fall through to its real department workspace (Chấm công). This reads the
 * matrix without changing its semantics.
 */
function hasNativeAdmin(role: Role): boolean {
  const visibility = PERMISSION_MATRIX['admin.manage'];
  return visibility !== 'all' && visibility.includes(role);
}

/**
 * Build a workspace slot (slot 3) from a module key with an override label.
 * `pathOverride` repoints the slot target while keeping `moduleKey` (and thus
 * reachability + the gate) unchanged — used to send the KTT Kho slot to /kho
 * while its permission module stays `inventory`.
 */
function workspaceSlot(
  moduleKey: PermissionModuleKey,
  label: string,
  pathOverride?: string,
): PrimaryNavItem {
  const meta = MODULE_NAV_META[moduleKey];
  return { slot: 'workspace', label, icon: meta.icon, path: pathOverride ?? meta.path, moduleKey };
}

/**
 * Resolve the persona's main workspace (slot 3) from the role's dominant
 * permission. First match wins (direction §4.1 / phase1 spec step 3):
 *   1. native admin.manage        → Quản trị   (/admin)     [super_admin only]
 *   2. inventory.view + valuation → Kho        (/inventory) [accounting]
 *   3. attendance.view_team       → Chấm công  (/attendance)[dept heads]
 *   4. approvals.approve          → Phê duyệt  → deduped to Đề nghị (/requests)
 *   5. else                       → Đề nghị    (/requests)
 * (Rule 4 never fires in practice — every approver already matches 1–3 — but it
 *  is implemented for completeness and dedupes to /requests since slot 2 is the
 *  approvals inbox.)
 */
function resolveWorkspace(role: Role): PrimaryNavItem {
  if (hasNativeAdmin(role)) {
    return workspaceSlot('admin', 'Quản trị');
  }
  if (can(role, 'inventory.view') && can(role, 'valuation.view')) {
    return workspaceSlot('inventory', 'Kho', '/kho');
  }
  if (can(role, 'attendance.view_team')) {
    return workspaceSlot('attendance', 'Chấm công');
  }
  if (can(role, 'approvals.approve')) {
    return workspaceSlot('requests', 'Đề nghị');
  }
  return workspaceSlot('requests', 'Đề nghị');
}

/**
 * The 5-slot role-composed primary nav: Hôm nay · Cần xử lý · [Workspace] ·
 * Tra cứu · Cá nhân. Always returns exactly 5 items.
 */
export function getPrimaryNav(role: Role): PrimaryNavItem[] {
  const home: PrimaryNavItem = {
    slot: 'home',
    label: 'Hôm nay',
    icon: Home,
    path: '/dashboard',
    moduleKey: 'dashboard',
  };

  // Slot 2 — the unified inbox "Cần xử lý" (Phase 2, direction §4.4). Every role
  // has an inbox (at minimum unread notifications), so the slot is always present
  // and never a dead link; the /inbox route is gated by RequireAuth with no
  // moduleKey. The actionable-count badge (useActionableCount) renders here. This
  // slot carries no `moduleKey` because /inbox is not a permission module — the
  // underlying `requests`/`approvals` modules stay reachable via the workspace
  // slot and the "Tra cứu" disclosure (see getReferenceNavItems).
  const inbox: PrimaryNavItem = {
    slot: 'inbox',
    label: 'Cần xử lý',
    icon: Inbox,
    badge: true,
    path: '/inbox',
  };

  // Slot 3 — workspace. With the inbox now at its own /inbox path, a pure-staff
  // role's workspace resolves to Đề nghị (/requests) — its natural home
  // (direction §4.1: the two-lens workspace is "safe as staff's [Workspace] slot
  // (Đề nghị)"). The guard below remains only as a safety net so no workspace can
  // ever duplicate the inbox target.
  let workspace = resolveWorkspace(role);
  if (workspace.path === inbox.path) {
    workspace = workspaceSlot('attendance', 'Chấm công');
  }

  const personal: PrimaryNavItem = {
    slot: 'personal',
    label: 'Cá nhân',
    icon: User,
    path: '/portal',
    moduleKey: 'portal',
  };

  const usedKeys = new Set<PermissionModuleKey>(
    [home.moduleKey, inbox.moduleKey, workspace.moduleKey, personal.moduleKey].filter(
      (key): key is PermissionModuleKey => Boolean(key),
    ),
  );

  const reference: PrimaryNavItem = {
    slot: 'reference',
    label: 'Tra cứu',
    icon: LayoutGrid,
    children: getReferenceNavItems(role, usedKeys),
  };

  return [home, inbox, workspace, reference, personal];
}

/**
 * "Tra cứu" children: every matrix-visible module the role can access that is
 * not already one of the other 4 slots and is not the Quản trị control room
 * (which lives in the desktop sidebar footer / Cá nhân). This un-orphans
 * weekly_report, lab_dashboard, valuation, org_chart, room/TV management.
 */
export function getReferenceNavItems(
  role: Role,
  usedKeys: Set<PermissionModuleKey> = new Set(),
): ReferenceNavItem[] {
  return getAccessibleModules(role)
    .filter((key) => key !== 'admin' && !usedKeys.has(key))
    .map((key) => {
      const meta = MODULE_NAV_META[key];
      return { key, path: meta.path, label: meta.label, icon: meta.icon };
    });
}

/**
 * The set of permission modules a role can reach through the v2 shell: the 4
 * pathed primary slots, every "Tra cứu" child, and the admin control room when
 * `admin.view` is granted (rendered as the sidebar footer link). Used by the
 * nav-reachability unit check to guarantee no accessible module is orphaned.
 */
export function getReachableModuleKeys(role: Role): Set<PermissionModuleKey> {
  const keys = new Set<PermissionModuleKey>();
  for (const item of getPrimaryNav(role)) {
    if (item.moduleKey) {
      keys.add(item.moduleKey);
    }
    for (const child of item.children ?? []) {
      keys.add(child.key);
    }
  }
  if (can(role, 'admin.view')) {
    keys.add('admin');
  }
  return keys;
}
