/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PortalAuthSmokeRoute {
  path: string;
  expectedText: string;
  expectedUrlPath?: string;
  bridgeChecks?: string[];
}

export const PORTAL_AUTH_SMOKE_ROUTES: PortalAuthSmokeRoute[] = [
  {
    path: '/dashboard',
    expectedText: 'Chào',
  },
  {
    path: '/inventory',
    expectedText: 'Kho vật tư',
  },
  {
    path: '/pharmacy',
    expectedText: 'Quản lý Kho Thuốc',
  },
  {
    path: '/weekly-report',
    expectedText: 'Báo cáo giao ban',
    expectedUrlPath: '/tv-management/weekly-report',
  },
  {
    path: '/admin',
    expectedText: 'Quản trị hệ thống',
  },
  {
    path: '/lab-dashboard/tv',
    expectedText: 'Dashboard Xét nghiệm',
    bridgeChecks: ['/tv-access/check', '/lab-dashboard/current'],
  },
];

export function normalizePortalLoginIdentifier(value: string, defaultDomain = 'fdc.vn'): string {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return '';
  }

  if (trimmed.includes('@')) {
    return trimmed;
  }

  return `${trimmed}@${defaultDomain}`;
}
