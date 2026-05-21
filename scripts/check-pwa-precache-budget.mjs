/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url));
const SERVICE_WORKER_PATH = join(ROOT_DIR, 'dist', 'sw.js');

if (!existsSync(SERVICE_WORKER_PATH)) {
  console.error('Missing dist/sw.js. Run `npm run build` before checking PWA precache budgets.');
  process.exit(1);
}

const serviceWorker = readFileSync(SERVICE_WORKER_PATH, 'utf8');
const precacheStart = serviceWorker.indexOf('precacheAndRoute([');

if (precacheStart === -1) {
  console.error('Could not find a Workbox precache manifest in dist/sw.js.');
  process.exit(1);
}

const manifestStart = precacheStart + 'precacheAndRoute('.length;
const manifestEnd = serviceWorker.indexOf('],', manifestStart);

if (manifestEnd === -1) {
  console.error('Could not parse the Workbox precache manifest in dist/sw.js.');
  process.exit(1);
}

const manifestSource = serviceWorker.slice(manifestStart, manifestEnd + 1);
const urls = [];
const urlPattern = /(?:^|[,{])\s*"?url"?\s*:\s*"([^"]+)"/g;
let match;

while ((match = urlPattern.exec(manifestSource)) !== null) {
  urls.push(match[1]);
}

const xlsxEntries = urls.filter((url) => /(^|\/)xlsx-[\w-]+\.js$/.test(url));

if (xlsxEntries.length > 0) {
  console.error('PWA precache budget check failed: XLSX export chunks must not be precached.');
  for (const entry of xlsxEntries) {
    console.error(`- ${entry}`);
  }
  process.exit(1);
}

console.log('PWA precache budget check passed.');
console.log(`- ${urls.length} precache entries`);
console.log('- XLSX chunks excluded from precache');
