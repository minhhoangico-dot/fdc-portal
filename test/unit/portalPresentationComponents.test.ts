/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();

const componentBoundaries = [
  ["src/app/pharmacy/PharmacyFilters.tsx", "PharmacyFilters"],
  ["src/app/pharmacy/PharmacyKpiGrid.tsx", "PharmacyKpiGrid"],
  ["src/app/pharmacy/PharmacyInventoryTable.tsx", "PharmacyInventoryTable"],
  ["src/app/pharmacy/PharmacyCharts.tsx", "PharmacyCharts"],
  ["src/app/inventory/overview/InventoryKpiGrid.tsx", "InventoryKpiGrid"],
  ["src/app/inventory/overview/InventoryCharts.tsx", "InventoryCharts"],
  ["src/app/inventory/overview/InventoryAlertsPanel.tsx", "InventoryAlertsPanel"],
] as const;

const countLines = (relativePath: string) =>
  readFileSync(join(repoRoot, relativePath), "utf8").split(/\r?\n/).length;

test("portal presentation refactor exposes the planned component boundaries", () => {
  for (const [relativePath, exportName] of componentBoundaries) {
    const fullPath = join(repoRoot, relativePath);

    assert.ok(existsSync(fullPath), `${relativePath} should exist`);
    assert.match(
      readFileSync(fullPath, "utf8"),
      new RegExp(`export function ${exportName}\\b`),
      `${relativePath} should export ${exportName}`,
    );
  }
});

test("portal presentation pages stay under the agreed refactor budgets", () => {
  assert.ok(
    countLines("src/app/pharmacy/page.tsx") < 500,
    "src/app/pharmacy/page.tsx should stay below 500 lines",
  );
  assert.ok(
    countLines("src/app/inventory/OverviewTab.tsx") < 550,
    "src/app/inventory/OverviewTab.tsx should stay below 550 lines",
  );
});
