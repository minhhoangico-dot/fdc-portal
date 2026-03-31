/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeRoleCatalog } from '../../src/lib/role-catalog';

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
