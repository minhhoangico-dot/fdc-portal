/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { can } from '@/lib/permissions/access';
import type { PermissionAction } from '@/types/permissions';
import type { Role } from '@/types/user';

/**
 * Column span a widget occupies in the Home "Hôm nay" grid
 * (1-col mobile / md:2-col / xl:3-col). Defaults to 1.
 */
export type HomeWidgetSpan = 1 | 2 | 3;

/**
 * A Home "Hôm nay" widget, keyed by the permission action that unlocks it.
 * The grid is composed by filtering this registry with `can(role, action)` —
 * never by hardcoding role arrays. Each widget is code-split (`React.lazy`) and
 * owns its own data fetching (one widget failing must not blank the whole Home;
 * the integrator renders them under `Promise.allSettled`-style isolation).
 */
export interface HomeWidget {
  /** Stable identifier (e.g. 'cho-ban-duyet', 'ton-kho'). */
  key: string;
  /** The permission action gating this widget's visibility. */
  permissionAction: PermissionAction;
  /** Widget card title (calm-clinical Vietnamese). */
  title: string;
  /** Lazily-loaded widget body. */
  Component: LazyExoticComponent<ComponentType>;
  /** Grid span; defaults to 1. */
  span?: HomeWidgetSpan;
}

/**
 * The widget registry (direction §4.3). Display order = registry order. Each
 * widget is code-split and owns its own small data hook + loading/error state
 * (see `src/components/home/widgets/*`), so one widget failing never blanks the
 * grid. Visibility is derived purely from the permission matrix via
 * `getHomeWidgetsForRole` — no role arrays are hardcoded here.
 */
export const HOME_WIDGETS: readonly HomeWidget[] = [
  {
    key: 'cho-ban-duyet',
    permissionAction: 'approvals.review_assigned',
    title: 'Chờ bạn duyệt',
    Component: lazy(() => import('@/components/home/widgets/ChoBanDuyet')),
    span: 2,
  },
  {
    key: 'di-muon-hom-nay',
    permissionAction: 'attendance.view_team',
    title: 'Đi muộn hôm nay',
    Component: lazy(() => import('@/components/home/widgets/DiMuonHomNay')),
  },
  {
    key: 'ton-kho',
    permissionAction: 'inventory.view',
    title: 'Tồn kho',
    Component: lazy(() => import('@/components/home/widgets/TonKho')),
  },
  {
    key: 'de-nghi-cua-toi',
    permissionAction: 'requests.view_own',
    title: 'Đề nghị của tôi',
    Component: lazy(() => import('@/components/home/widgets/DeNghiCuaToi')),
  },
  {
    key: 'bridge-health',
    permissionAction: 'admin.view',
    title: 'Tình trạng đồng bộ',
    Component: lazy(() => import('@/components/home/widgets/BridgeHealth')),
  },
];

/**
 * The widgets a role may see, in registry order, filtered by the permission
 * matrix. This is the single composition entry point the Home page consumes.
 */
export function getHomeWidgetsForRole(role: Role): HomeWidget[] {
  return HOME_WIDGETS.filter((widget) => can(role, widget.permissionAction));
}
