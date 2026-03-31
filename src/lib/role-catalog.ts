/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { RoleCatalogItem } from '@/types/roleCatalog';
import type { Role } from '@/types/user';

const UTF8_MOJIBAKE_PATTERN = /(?:Ãƒ.|Ã„.|Ã†.|Ã‚.|Ã¢.|Ã¡(?:Âº|Â»))/;

function repairUtf8Mojibake(value: string): string {
  if (!UTF8_MOJIBAKE_PATTERN.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(Array.from(value), (character) => {
      const codePoint = character.charCodeAt(0);
      if (codePoint > 0xff) {
        throw new Error('Cannot repair non-Latin-1 text.');
      }

      return codePoint;
    });
    const repaired = new TextDecoder('utf-8', { fatal: true }).decode(bytes);

    return UTF8_MOJIBAKE_PATTERN.test(repaired) ? value : repaired;
  } catch {
    return value;
  }
}

function sanitizeRoleCatalogPatch(
  partialItem: Partial<RoleCatalogItem>,
): Partial<RoleCatalogItem> {
  return {
    ...partialItem,
    displayName:
      partialItem.displayName === undefined
        ? undefined
        : repairUtf8Mojibake(partialItem.displayName),
    description:
      partialItem.description === undefined
        ? undefined
        : repairUtf8Mojibake(partialItem.description),
  };
}

export const DEFAULT_ROLE_CATALOG: readonly RoleCatalogItem[] = [
  {
    roleKey: 'super_admin',
    displayName: 'KTT / Admin',
    description: 'Toan quyen cau hinh he thong va quan tri nguoi dung.',
    sortOrder: 1,
    isActive: true,
  },
  {
    roleKey: 'head_nurse',
    displayName: 'Dieu duong truong',
    description: 'Toan quyen nghiep vu tren portal, ngoai tru cac chuc nang quan tri he thong.',
    sortOrder: 2,
    isActive: true,
  },
  {
    roleKey: 'director',
    displayName: 'Giam doc',
    description: 'Phe duyet cap giam doc va theo doi van hanh chung.',
    sortOrder: 3,
    isActive: true,
  },
  {
    roleKey: 'chairman',
    displayName: 'CT HDQT',
    description: 'Phe duyet cap chu tich hoi dong quan tri.',
    sortOrder: 4,
    isActive: true,
  },
  {
    roleKey: 'dept_head',
    displayName: 'Truong phong',
    description: 'Quan ly phong ban va phe duyet cap truong phong.',
    sortOrder: 5,
    isActive: true,
  },
  {
    roleKey: 'accountant',
    displayName: 'Ke toan',
    description: 'Xu ly nghiep vu tai chinh va phe duyet ke toan legacy.',
    sortOrder: 6,
    isActive: true,
  },
  {
    roleKey: 'pharmacy_head',
    displayName: 'Truong phong duoc',
    description: 'Phu trach nghiep vu nha thuoc va review de xuat tu khu nha thuoc.',
    sortOrder: 7,
    isActive: true,
  },
  {
    roleKey: 'accounting_supervisor',
    displayName: 'Phu trach ke toan',
    description: 'Review de xuat phong 304 va nghiep vu phong ke toan.',
    sortOrder: 8,
    isActive: true,
  },
  {
    roleKey: 'lab_head',
    displayName: 'Truong phong xet nghiem',
    description: 'Phu trach dashboard xet nghiem va review de xuat khu xet nghiem.',
    sortOrder: 9,
    isActive: true,
  },
  {
    roleKey: 'chief_accountant',
    displayName: 'Ke toan truong',
    description: 'Phe duyet tai chinh va chon nguoi nhan handoff tiep theo.',
    sortOrder: 10,
    isActive: true,
  },
  {
    roleKey: 'internal_accountant',
    displayName: 'Ke toan noi bo',
    description: 'Xu ly handoff tai chinh sau khi request da duoc duyet.',
    sortOrder: 11,
    isActive: true,
  },
  {
    roleKey: 'hr_records',
    displayName: 'Nhan su ho so',
    description: 'Xu ly handoff ho so va luu tru sau khi request da duoc duyet.',
    sortOrder: 12,
    isActive: true,
  },
  {
    roleKey: 'staff',
    displayName: 'Nhan vien',
    description: 'Su dung cac chuc nang co ban cua portal.',
    sortOrder: 13,
    isActive: true,
  },
  {
    roleKey: 'doctor',
    displayName: 'Bac si',
    description: 'Nhan su y te voi cac chuc nang nghiep vu co ban.',
    sortOrder: 14,
    isActive: true,
  },
];

export const DEFAULT_ROLE_LABELS = DEFAULT_ROLE_CATALOG.reduce<Record<Role, string>>(
  (accumulator, item) => {
    accumulator[item.roleKey] = item.displayName;
    return accumulator;
  },
  {} as Record<Role, string>,
);

export function sortRoleCatalog(items: readonly RoleCatalogItem[]): RoleCatalogItem[] {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.displayName.localeCompare(right.displayName, 'vi');
  });
}

export function mergeRoleCatalog(
  incoming: readonly Partial<RoleCatalogItem>[],
): RoleCatalogItem[] {
  const mergedByKey = new Map<Role, RoleCatalogItem>(
    DEFAULT_ROLE_CATALOG.map((item) => [item.roleKey, { ...item }]),
  );

  for (const partialItem of incoming) {
    if (!partialItem.roleKey || !mergedByKey.has(partialItem.roleKey)) {
      continue;
    }

    const sanitizedItem = sanitizeRoleCatalogPatch(partialItem);
    const current = mergedByKey.get(partialItem.roleKey)!;
    mergedByKey.set(partialItem.roleKey, {
      ...current,
      ...sanitizedItem,
      roleKey: current.roleKey,
    });
  }

  return sortRoleCatalog(Array.from(mergedByKey.values()));
}
