/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BridgeEnv {
  DEV?: boolean | string;
  VITE_BRIDGE_URL?: string;
}

function getBridgeEnv(): BridgeEnv {
  return (import.meta as ImportMeta & { env?: BridgeEnv }).env ?? {};
}

export function resolveBridgeBaseUrl(env: BridgeEnv = getBridgeEnv()): string {
  const configuredBaseUrl = env.VITE_BRIDGE_URL?.trim() || 'http://localhost:3333';
  const isDev = env.DEV === true || env.DEV === 'true';

  if (isDev) {
    return '/api/bridge';
  }

  return configuredBaseUrl;
}

export function buildBridgeUrl(path: string, env: BridgeEnv = getBridgeEnv()): string {
  const baseUrl = resolveBridgeBaseUrl(env).replace(/\/$/, '');
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
