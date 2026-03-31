/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AdminTab } from '@/viewmodels/useAdmin';

export const ADMIN_TABS: ReadonlyArray<{ id: AdminTab; label: string }> = [
  { id: 'users', label: 'Người dùng' },
  { id: 'approval', label: 'Cấu hình phê duyệt' },
  { id: 'misa', label: 'Từ khóa MISA' },
  { id: 'health', label: 'Hệ thống' },
  { id: 'audit', label: 'Nhật ký' },
  { id: 'roles', label: 'Vai trò' },
];

export function isAdminTab(value: string | null): value is AdminTab {
  return ADMIN_TABS.some((tab) => tab.id === value);
}

export function getAdminLegacyTabRedirect(value: string | null): string | null {
  if (value === 'weekly_report') {
    return '/tv-management/weekly-report';
  }

  if (value === 'tv_screens') {
    return '/tv-management';
  }

  return null;
}
