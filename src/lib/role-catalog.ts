/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { RoleCatalogItem } from '@/types/roleCatalog';
import type { Role } from '@/types/user';

const UTF8_MOJIBAKE_PATTERN = /(?:Ã.|Ä.|Æ.|Â.|â.|á(?:º|»))/;

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
    description: 'Toàn quyền cấu hình hệ thống và quản trị người dùng.',
    sortOrder: 1,
    isActive: true,
  },
  {
    roleKey: 'head_nurse',
    displayName: 'Điều dưỡng trưởng',
    description: 'Toàn quyền nghiệp vụ trên portal, ngoại trừ các chức năng quản trị hệ thống.',
    sortOrder: 2,
    isActive: true,
  },
  {
    roleKey: 'director',
    displayName: 'Giám đốc',
    description: 'Phê duyệt cấp giám đốc và theo dõi vận hành chung.',
    sortOrder: 3,
    isActive: true,
  },
  {
    roleKey: 'chairman',
    displayName: 'CT HĐQT',
    description: 'Phê duyệt cấp chủ tịch hội đồng quản trị.',
    sortOrder: 4,
    isActive: true,
  },
  {
    roleKey: 'dept_head',
    displayName: 'Trưởng phòng',
    description: 'Quản lý phòng ban và phê duyệt cấp trưởng phòng.',
    sortOrder: 5,
    isActive: true,
  },
  {
    roleKey: 'accountant',
    displayName: 'Kế toán',
    description: 'Xử lý nghiệp vụ tài chính và phê duyệt kế toán.',
    sortOrder: 6,
    isActive: true,
  },
  {
    roleKey: 'staff',
    displayName: 'Nhân viên',
    description: 'Sử dụng các chức năng cơ bản của portal.',
    sortOrder: 7,
    isActive: true,
  },
  {
    roleKey: 'doctor',
    displayName: 'Bác sĩ',
    description: 'Nhân sự y tế với các chức năng nghiệp vụ cơ bản.',
    sortOrder: 8,
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
