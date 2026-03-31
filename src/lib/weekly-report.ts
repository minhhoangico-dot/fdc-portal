/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { format } from 'date-fns';
import { buildBridgeUrl } from '@/lib/bridge-client';
import { WEEKLY_REPORT_ACCESS_ROLES } from '@/lib/role-access';
import { Role } from '@/types/user';

export const WEEKLY_REPORT_ROLES: Role[] = [...WEEKLY_REPORT_ACCESS_ROLES];
export const WEEKLY_REPORT_MANAGEMENT_PATH = '/tv-management/weekly-report';
export const WEEKLY_REPORT_TV_PATH = `${WEEKLY_REPORT_MANAGEMENT_PATH}/tv`;
export const WEEKLY_REPORT_DETAILS_PATH = `${WEEKLY_REPORT_MANAGEMENT_PATH}/details`;

export async function weeklyReportRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildBridgeUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error || `Weekly report request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export function buildWeeklyReportTvUrl(date: Date): string {
  const search = new URLSearchParams({ date: date.toISOString() });
  return `${WEEKLY_REPORT_TV_PATH}?${search.toString()}`;
}

export function buildWeeklyReportDetailsUrl(params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `${WEEKLY_REPORT_DETAILS_PATH}?${search.toString()}`;
}

export function formatWeekInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getWeeklyReportDetailsBackTarget({
  from,
  start,
}: {
  from: string | null;
  start: string;
}): string {
  if (from === 'tv') {
    return `${WEEKLY_REPORT_TV_PATH}?date=${encodeURIComponent(start)}`;
  }

  return WEEKLY_REPORT_MANAGEMENT_PATH;
}
