/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveValuationModule,
  supportsValuationImportHistory,
} from "../../src/lib/valuation-mode";

test("keeps supported valuation modules explicit", () => {
  assert.equal(resolveValuationModule("pharmacy"), "pharmacy");
  assert.equal(resolveValuationModule("inventory"), "inventory");
});

test("routes unsupported valuation modes to chooser", () => {
  assert.equal(resolveValuationModule(undefined), "chooser");
  assert.equal(resolveValuationModule("all"), "chooser");
  assert.equal(resolveValuationModule("unknown"), "chooser");
});

test("only pharmacy valuation supports medicine import history", () => {
  assert.equal(supportsValuationImportHistory("pharmacy"), true);
  assert.equal(supportsValuationImportHistory("inventory"), false);
  assert.equal(supportsValuationImportHistory("chooser"), false);
});
