/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

function getBridgeBaseUrl(): string {
  return (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_BRIDGE_URL || 'http://localhost:3333';
}

export function buildBridgeUrl(path: string): string {
  const baseUrl = getBridgeBaseUrl().replace(/\/$/, '');
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function bridgeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildBridgeUrl(path), {
    ...init,
    headers,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `Bridge request failed (${response.status})`);
  }

  return payload as T;
}
