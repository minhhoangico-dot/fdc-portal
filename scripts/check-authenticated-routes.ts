/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync } from 'node:fs';
import { chromium, type Page } from 'playwright-core';

import {
  PORTAL_AUTH_SMOKE_ROUTES,
  type PortalAuthSmokeRoute,
} from '../src/lib/portal-auth-smoke';

const DEFAULT_TIMEOUT_MS = 45_000;

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();

  if (!value) {
    return fallback;
  }

  return !['0', 'false', 'no'].includes(value);
}

function parseTimeoutMs(): number {
  const raw = process.env.PORTAL_SMOKE_TIMEOUT_MS?.trim();

  if (!raw) {
    return DEFAULT_TIMEOUT_MS;
  }

  const timeoutMs = Number(raw);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`Invalid PORTAL_SMOKE_TIMEOUT_MS: ${raw}`);
  }

  return timeoutMs;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function buildUrl(baseUrl: string, path: string): string {
  return `${trimTrailingSlash(baseUrl)}${path}`;
}

function resolveBrowserExecutablePath(): string | undefined {
  const configuredPath = process.env.PORTAL_SMOKE_BROWSER_PATH?.trim();
  if (configuredPath) {
    if (!existsSync(configuredPath)) {
      throw new Error(`PORTAL_SMOKE_BROWSER_PATH does not exist: ${configuredPath}`);
    }
    return configuredPath;
  }

  const knownPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  return knownPaths.find((candidate) => existsSync(candidate));
}

async function waitForRouteText(page: Page, route: PortalAuthSmokeRoute, timeoutMs: number): Promise<void> {
  await page.getByText(route.expectedText, { exact: false }).first().waitFor({
    state: 'visible',
    timeout: timeoutMs,
  });
}

async function login(page: Page, baseUrl: string, username: string, password: string, timeoutMs: number): Promise<void> {
  await page.goto(buildUrl(baseUrl, '/login'), {
    waitUntil: 'domcontentloaded',
    timeout: timeoutMs,
  });

  await page.getByLabel('Email hoac ten dang nhap').fill(username);
  await page.getByLabel('Mat khau').fill(password);
  await page.getByRole('button', { name: 'Dang nhap' }).click();

  try {
    await page.waitForURL(
      (url) => url.pathname === '/dashboard',
      {
        timeout: timeoutMs,
      },
    );
  } catch {
    const errorText = await page.locator('text=/Dang nhap that bai|Khong the xac thuc|Tai khoan/').first().textContent().catch(() => null);
    throw new Error(errorText?.trim() || 'Login did not reach /dashboard within the timeout.');
  }

  await waitForRouteText(page, PORTAL_AUTH_SMOKE_ROUTES[0], timeoutMs);
}

async function verifyRoute(page: Page, baseUrl: string, route: PortalAuthSmokeRoute, timeoutMs: number): Promise<void> {
  const expectedUrlPath = route.expectedUrlPath ?? route.path;
  const bridgeChecks = route.bridgeChecks ?? [];
  const bridgeResponseWaiters = bridgeChecks.map((check) =>
    page.waitForResponse((response) => response.url().includes(check), {
      timeout: timeoutMs,
    }).then((response) => ({
      check,
      status: response.status(),
    })),
  );

  await page.goto(buildUrl(baseUrl, route.path), {
    waitUntil: 'domcontentloaded',
    timeout: timeoutMs,
  });

  await page.waitForURL((url) => url.pathname === expectedUrlPath, {
    timeout: timeoutMs,
  });

  await waitForRouteText(page, route, timeoutMs);

  const bridgeResponses = await Promise.all(bridgeResponseWaiters);

  for (const response of bridgeResponses) {
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Route ${route.path} received status ${response.status} for ${response.check}`);
    }
  }
}

async function main(): Promise<void> {
  const baseUrl = trimTrailingSlash(getRequiredEnv('PORTAL_SMOKE_BASE_URL'));
  const username = getRequiredEnv('PORTAL_SMOKE_USERNAME');
  const password = getRequiredEnv('PORTAL_SMOKE_PASSWORD');
  const timeoutMs = parseTimeoutMs();
  const headless = parseBooleanEnv('PORTAL_SMOKE_HEADLESS', true);
  const executablePath = resolveBrowserExecutablePath();

  if (!executablePath) {
    throw new Error(
      'Could not locate a Chromium-based browser. Set PORTAL_SMOKE_BROWSER_PATH to Chrome or Edge.',
    );
  }

  const browser = await chromium.launch({
    executablePath,
    headless,
  });

  try {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    console.log(`Authenticating at ${baseUrl} as ${username}`);
    await login(page, baseUrl, username, password, timeoutMs);
    console.log('PASS /login -> /dashboard');

    for (const route of PORTAL_AUTH_SMOKE_ROUTES) {
      await verifyRoute(page, baseUrl, route, timeoutMs);
      console.log(`PASS ${route.path}`);
    }

    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exit(1);
});
