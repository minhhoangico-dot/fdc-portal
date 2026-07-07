/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { getPrimaryNav, getReachableModuleKeys } from '../../src/lib/navigation';
import { getAccessibleModules } from '../../src/lib/permissions/access';
import type { Role } from '../../src/types/user';

const ALL_ROLES: Role[] = [
  'super_admin',
  'director',
  'chairman',
  'head_nurse',
  'business_head',
  'lab_head',
  'pharmacy_head',
  'accountant',
  'internal_accountant',
  'pharmacy_staff',
  'lab_staff',
  'business_staff',
  'clinic_staff',
];

test('every accessible module stays reachable from the v2 shell for all 13 roles', () => {
  for (const role of ALL_ROLES) {
    const reachable = getReachableModuleKeys(role);
    const accessible = getAccessibleModules(role);
    const orphaned = accessible.filter((moduleKey) => !reachable.has(moduleKey));

    assert.deepEqual(
      orphaned,
      [],
      `role "${role}" has unreachable accessible modules: ${orphaned.join(', ')}`,
    );
  }
});

test('primary nav is always exactly 5 slots in canonical order for all 13 roles', () => {
  for (const role of ALL_ROLES) {
    const nav = getPrimaryNav(role);
    assert.equal(nav.length, 5, `role "${role}" did not produce 5 primary nav slots`);
    assert.deepEqual(
      nav.map((item) => item.slot),
      ['home', 'inbox', 'workspace', 'reference', 'personal'],
      `role "${role}" primary nav slots are out of order`,
    );
  }
});

test('no primary slot points at the same path as another (no duplicate nav targets)', () => {
  for (const role of ALL_ROLES) {
    const paths = getPrimaryNav(role)
      .map((item) => item.path)
      .filter((path): path is string => Boolean(path));
    assert.equal(
      new Set(paths).size,
      paths.length,
      `role "${role}" has duplicate primary nav targets: ${paths.join(', ')}`,
    );
  }
});

test('exactly one inbox slot carries the actionable badge', () => {
  for (const role of ALL_ROLES) {
    const badged = getPrimaryNav(role).filter((item) => item.badge);
    assert.equal(badged.length, 1, `role "${role}" should have exactly one badged slot`);
    assert.equal(badged[0].slot, 'inbox', `role "${role}" badge is not on the inbox slot`);
  }
});

test('workspace resolves per persona for representative roles', () => {
  const workspacePath = (role: Role) =>
    getPrimaryNav(role).find((item) => item.slot === 'workspace')?.path;

  assert.equal(workspacePath('super_admin'), '/admin'); // control room
  assert.equal(workspacePath('accountant'), '/inventory'); // KTT → Kho
  assert.equal(workspacePath('internal_accountant'), '/inventory');
  assert.equal(workspacePath('director'), '/inventory'); // has inventory + valuation
  assert.equal(workspacePath('chairman'), '/inventory');
  // head_nurse gains valuation.view via the full-access bypass, so its dominant
  // permission resolves to Kho (not admin — the native-admin check excludes it).
  assert.equal(workspacePath('head_nurse'), '/inventory');
  assert.equal(workspacePath('business_head'), '/attendance');
  assert.equal(workspacePath('lab_head'), '/attendance');
  assert.equal(workspacePath('pharmacy_head'), '/attendance');
  // Phase 2: the inbox moved to its own /inbox slot, freeing /requests as the
  // natural pure-staff workspace ("Đề nghị"; direction §4.1) — no longer deduped.
  assert.equal(workspacePath('clinic_staff'), '/requests');
  assert.equal(workspacePath('pharmacy_staff'), '/requests');
});
