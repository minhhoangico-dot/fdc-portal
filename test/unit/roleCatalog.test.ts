/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ROLE_CATALOG, mergeRoleCatalog } from '../../src/lib/role-catalog';

test('mergeRoleCatalog repairs mojibake head_nurse copy from Supabase rows', () => {
  const merged = mergeRoleCatalog([
    {
      roleKey: 'head_nurse',
      displayName:
        '\u00c4\u0090i\u00e1\u00bb\u0081u d\u00c6\u00b0\u00e1\u00bb\u00a1ng tr\u00c6\u00b0\u00e1\u00bb\u009fng',
      description:
        'To\u00c3\u00a0n quy\u00e1\u00bb\u0081n nghi\u00e1\u00bb\u0087p v\u00e1\u00bb\u00a5 tr\u00c3\u00aan portal, ngo\u00e1\u00ba\u00a1i tr\u00e1\u00bb\u00ab c\u00c3\u00a1c ch\u00e1\u00bb\u00a9c n\u00c4\u0083ng qu\u00e1\u00ba\u00a3n tr\u00e1\u00bb\u008b h\u00e1\u00bb\u0087 th\u00e1\u00bb\u0091ng.',
      sortOrder: 2,
      isActive: true,
    },
  ]);

  const headNurse = merged.find((item) => item.roleKey === 'head_nurse');

  assert.ok(headNurse);
  assert.equal(headNurse.displayName, '\u0110i\u1ec1u d\u01b0\u1ee1ng tr\u01b0\u1edfng');
  assert.equal(
    headNurse.description,
    'To\u00e0n quy\u1ec1n nghi\u1ec7p v\u1ee5 tr\u00ean portal, ngo\u1ea1i tr\u1eeb c\u00e1c ch\u1ee9c n\u0103ng qu\u1ea3n tr\u1ecb h\u1ec7 th\u1ed1ng.',
  );
});

test('DEFAULT_ROLE_CATALOG has exactly 13 roles', () => {
  assert.equal(DEFAULT_ROLE_CATALOG.length, 13);

  const expectedKeys = [
    'super_admin', 'director', 'chairman', 'head_nurse', 'business_head',
    'lab_head', 'pharmacy_head', 'accountant', 'internal_accountant',
    'pharmacy_staff', 'lab_staff', 'business_staff', 'clinic_staff',
  ];
  const actualKeys = DEFAULT_ROLE_CATALOG.map((item) => item.roleKey);

  for (const key of expectedKeys) {
    assert.ok(actualKeys.includes(key as any), `Missing role: ${key}`);
  }
});

test('mergeRoleCatalog ignores stale removed roles from Supabase', () => {
  const merged = mergeRoleCatalog([
    { roleKey: 'chief_accountant' as any, displayName: 'KTT cu', description: 'Stale', sortOrder: 99, isActive: true },
    { roleKey: 'dept_head' as any, displayName: 'TP cu', description: 'Stale', sortOrder: 98, isActive: true },
    { roleKey: 'hr_records' as any, displayName: 'NS cu', description: 'Stale', sortOrder: 97, isActive: true },
    { roleKey: 'staff' as any, displayName: 'NV cu', description: 'Stale', sortOrder: 96, isActive: true },
    { roleKey: 'doctor' as any, displayName: 'BS cu', description: 'Stale', sortOrder: 95, isActive: true },
  ]);

  assert.equal(merged.length, 13);
  assert.ok(!merged.some((item) => item.roleKey === ('chief_accountant' as any)));
  assert.ok(!merged.some((item) => item.roleKey === ('dept_head' as any)));
  assert.ok(!merged.some((item) => item.roleKey === ('hr_records' as any)));
  assert.ok(!merged.some((item) => item.roleKey === ('staff' as any)));
  assert.ok(!merged.some((item) => item.roleKey === ('doctor' as any)));
});
