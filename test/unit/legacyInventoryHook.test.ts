/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

test("removes the legacy mixed inventory viewmodel hook", () => {
  const legacyHookPath = path.join(repoRoot, "src", "viewmodels", "useInventory.ts");
  assert.equal(existsSync(legacyHookPath), false);

  const viewmodelDir = path.join(repoRoot, "src", "viewmodels");
  const sourceFiles = readdirSync(viewmodelDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
    .map((entry) => path.join(viewmodelDir, entry.name));

  for (const filePath of sourceFiles) {
    const source = readFileSync(filePath, "utf8");
    assert.equal(
      source.includes("InventoryModuleType"),
      false,
      `${path.basename(filePath)} should not declare the legacy InventoryModuleType contract`,
    );
    assert.equal(
      source.includes("export function useInventory("),
      false,
      `${path.basename(filePath)} should not export the legacy mixed inventory hook`,
    );
  }
});
