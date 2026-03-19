/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { format } from 'date-fns';
import { Role } from '@/types/user';

export const WEEKLY_REPORT_ROLES: Role[] = ['super_admin', 'director', 'chairman', 'accountant'];

function getBridgeBaseUrl(): string {
  return (import.meta as any).env?.VITE_BRIDGE_URL || 'http://localhost:3333';
}

export function buildBridgeUrl(path: string): string {
  const baseUrl = getBridgeBaseUrl().replace(/\/$/, '');
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

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
  return `/weekly-report/tv?${search.toString()}`;
}

export function buildWeeklyReportDetailsUrl(params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `/weekly-report/details?${search.toString()}`;
}

export function formatWeekInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

