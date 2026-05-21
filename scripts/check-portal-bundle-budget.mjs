/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url));
const ASSETS_DIR = join(ROOT_DIR, 'dist', 'assets');
const MAIN_BUDGET_BYTES = 950 * 1024;
const CHUNK_BUDGET_BYTES = 500 * 1024;

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

if (!existsSync(ASSETS_DIR)) {
  console.error('Missing dist/assets. Run `npm run build` before checking bundle budgets.');
  process.exit(1);
}

const jsAssets = readdirSync(ASSETS_DIR)
  .filter((name) => name.endsWith('.js'))
  .map((name) => ({
    name,
    bytes: statSync(join(ASSETS_DIR, name)).size,
  }))
  .sort((a, b) => b.bytes - a.bytes);

const failures = [];
const mainChunks = jsAssets.filter((asset) => /^index-[\w-]+\.js$/.test(asset.name));

if (mainChunks.length === 0) {
  failures.push('No main index chunk matching assets/index-*.js was found.');
}

for (const chunk of mainChunks) {
  if (chunk.bytes > MAIN_BUDGET_BYTES) {
    failures.push(
      `${chunk.name} is ${formatBytes(chunk.bytes)}, above the ${formatBytes(MAIN_BUDGET_BYTES)} main bundle budget.`,
    );
  }
}

for (const chunk of jsAssets) {
  if (/^index-[\w-]+\.js$/.test(chunk.name) || /^xlsx-[\w-]+\.js$/.test(chunk.name)) {
    continue;
  }

  if (chunk.bytes > CHUNK_BUDGET_BYTES) {
    failures.push(
      `${chunk.name} is ${formatBytes(chunk.bytes)}, above the ${formatBytes(CHUNK_BUDGET_BYTES)} route/vendor chunk budget.`,
    );
  }
}

if (failures.length > 0) {
  console.error('Portal bundle budget check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error('\nLargest JavaScript assets:');
  for (const asset of jsAssets.slice(0, 10)) {
    console.error(`- ${asset.name}: ${formatBytes(asset.bytes)}`);
  }
  process.exit(1);
}

console.log('Portal bundle budget check passed.');
for (const asset of jsAssets.slice(0, 10)) {
  console.log(`- ${asset.name}: ${formatBytes(asset.bytes)}`);
}
