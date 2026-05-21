/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { isOnsiteAccessBypassRole } from '@/lib/role-authority';
import type { Role } from '@/types/user';

export type OnsiteAccessSurface = 'admin' | 'tv_management' | 'tv_display';

export type OnsiteAccessReason =
  | 'geolocation_permission_denied'
  | 'geolocation_position_unavailable'
  | 'geolocation_timeout'
  | 'geolocation_outside_allowed_sites'
  | 'deny_not_configured'
  | 'outside_allowed_networks'
  | 'geolocation_unavailable'
  | 'bridge_check_failed'
  | 'geolocation_unknown_error'
  | null;

export interface OnsiteAccessContent {
  title: string;
  description: string;
  loadingMessage: string;
}

function getSurfaceTitle(surface: OnsiteAccessSurface): string {
  switch (surface) {
    case 'admin':
      return 'Khong the mo trang quan tri';
    case 'tv_management':
      return 'Khong the mo khu quan ly TV';
    case 'tv_display':
    default:
      return 'Khong the mo man hinh TV';
  }
}

function getSurfaceLabel(surface: OnsiteAccessSurface): string {
  switch (surface) {
    case 'admin':
      return 'trang quan tri';
    case 'tv_management':
      return 'khu quan ly TV';
    case 'tv_display':
    default:
      return 'man hinh TV';
  }
}

function getReasonDescription(surface: OnsiteAccessSurface, reason: OnsiteAccessReason): string {
  const surfaceLabel = getSurfaceLabel(surface);

  switch (reason) {
    case 'geolocation_permission_denied':
      return `Trinh duyet dang chan quyen vi tri. Hay cap quyen location roi thu lai de mo ${surfaceLabel}.`;
    case 'geolocation_position_unavailable':
      return `Khong the xac dinh vi tri hien tai. Hay kiem tra GPS hoac mang, sau do thu lai de mo ${surfaceLabel}.`;
    case 'geolocation_timeout':
      return `Het thoi gian lay vi tri. Hay thu lai khi thiet bi co GPS va mang on dinh de mo ${surfaceLabel}.`;
    case 'geolocation_outside_allowed_sites':
      return `Ban chi duoc mo ${surfaceLabel} khi dang o Phong kham hoac Chi nhanh da cau hinh.`;
    case 'deny_not_configured':
      return 'Chinh sach truy cap onsite chua duoc cau hinh tren bridge, nen truy cap hien dang bi chan.';
    case 'outside_allowed_networks':
      return `Mang hien tai khong nam trong allowlist va khong co vi tri hop le tai Phong kham hoac Chi nhanh de mo ${surfaceLabel}.`;
    case 'geolocation_unavailable':
      return `Thiet bi hoac trinh duyet nay khong ho tro location tren ket noi hien tai, nen khong the mo ${surfaceLabel}.`;
    case 'bridge_check_failed':
      return 'Khong the xac minh dieu kien onsite voi bridge. Hay thu lai khi ket noi noi bo on dinh.';
    case 'geolocation_unknown_error':
    default:
      return `Khong the xac minh vi tri onsite de mo ${surfaceLabel}. Hay thu lai hoac dang nhap bang tai khoan super admin.`;
  }
}

export function canBypassOnsiteAccess(role: Role): boolean {
  return isOnsiteAccessBypassRole(role);
}

export function getOnsiteAccessContent(
  surface: OnsiteAccessSurface,
  reason: OnsiteAccessReason,
): OnsiteAccessContent {
  return {
    title: getSurfaceTitle(surface),
    description: getReasonDescription(surface, reason),
    loadingMessage: `Dang xac minh dieu kien onsite cho ${getSurfaceLabel(surface)}...`,
  };
}
